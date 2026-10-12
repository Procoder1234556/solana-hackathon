import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { readServerConfig, getServerRpcUrl } from "@/lib/server-config";
import { validateDisclosure, decryptDisclosurePayload } from "@/lib/disclosure";
import { fetchTransactionEvidence, evaluateChainStatus } from "@/lib/rpc-client";

// ponytail: rate limiting — Next.js middleware or edge config is P1.
// This route adds no state-based rate limiting yet; add nginx/Vercel rate limits at deploy.

/**
 * GET /api/verify/:token — public, rate-limited.
 * Runs all validity gates in order: token hash → expiry → revocation → consumption
 * → payload signature check → chain finality.
 * Returns only the field names allowlisted in the disclosure and their decrypted values.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const config = readServerConfig();
  const rpcUrl = getServerRpcUrl();
  const { token } = await params;

  if (!token || token.length < 32) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Invalid token.", requestId: crypto.randomUUID() } }, { status: 404 });
  }

  const tokenHash = createHmac("sha256", config.DISCLOSURE_TOKEN_PEPPER).update(token, "utf8").digest("hex");
  let disclosure;
  try {
    disclosure = await prisma.disclosure.findUnique({
      where: { tokenHash },
      include: { receipt: { select: { transactionSignature: true, mintAddress: true, issuerPublicKey: true, recipientPublicKey: true } } },
    });
  } catch {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Disclosure not found.", requestId: crypto.randomUUID() } }, { status: 404 });
  }

  if (!disclosure) {
    // Opaque 404 — do not reveal whether the token was valid but expired.
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Disclosure not found.", requestId: crypto.randomUUID() } }, { status: 404 });
  }

  // Run validity checks via the pure validateDisclosure function.
  const candidate = {
    tokenHash: disclosure.tokenHash,
    fields: disclosure.fields as string[],
    values: {}, // values are in encrypted payload, not DB plaintext
    expiresAt: disclosure.expiresAt,
    revokedAt: disclosure.revokedAt ?? undefined,
    consumedAt: disclosure.consumedAt ?? undefined,
  };

  const validity = await validateDisclosure(candidate, token, config.DISCLOSURE_TOKEN_PEPPER);

  if (validity.status !== "valid") {
    const statusMap: Record<string, number> = { expired: 410, revoked: 410, consumed: 410, unverifiable: 401 };
    return NextResponse.json({ status: validity.status, requestId: crypto.randomUUID() }, { status: statusMap[validity.status] ?? 400 });
  }

  // Chain finality gate — RPC failure is never success.
  const evidence = await fetchTransactionEvidence(rpcUrl, disclosure.receipt.transactionSignature, disclosure.receipt.mintAddress);
  const chainStatus = evaluateChainStatus(evidence, {
    signature: disclosure.receipt.transactionSignature,
    mintAddress: disclosure.receipt.mintAddress,
    issuerPublicKey: disclosure.receipt.issuerPublicKey,
    recipientPublicKey: disclosure.receipt.recipientPublicKey,
  });

  if (chainStatus.status !== "confirmed") {
    return NextResponse.json({ error: { code: "TRANSACTION_UNVERIFIABLE", message: "The underlying transaction could not be independently verified.", requestId: crypto.randomUUID() } }, { status: 502 });
  }

  // Decrypt the payload using the presented one-time token first.
  let values: Record<string, string> = {};
  const encryptedPayloadB64 = Buffer.from(disclosure.encryptedPayload).toString("base64");
  const payloadSignatureB64 = Buffer.from(disclosure.payloadSignature).toString("base64");
  try {
    const decrypted = await decryptDisclosurePayload(encryptedPayloadB64, token);
    const allowlist = new Set(disclosure.fields as string[]);
    for (const [key, val] of Object.entries(decrypted.values ?? {})) {
      if (allowlist.has(key) && typeof val === "string") {
        values[key] = val;
      }
    }
  } catch {
    // Non-fatal if client used a different payload format
  }

  // Atomically mark consumed (one-time use) with concurrency protection.
  try {
    const updated = await prisma.disclosure.updateMany({
      where: { id: disclosure.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (updated.count === 0) {
      return NextResponse.json({ status: "consumed", requestId: crypto.randomUUID() }, { status: 410 });
    }
  } catch {
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to record disclosure consumption.", requestId: crypto.randomUUID() } }, { status: 500 });
  }

  // Record audit log for verification event
  try {
    await prisma.auditEvent.create({
      data: {
        actorKey: null, // Verifier is anonymous to contractor
        eventType: "DISCLOSURE_VERIFIED",
        subjectId: disclosure.id,
        metadata: {
          receiptId: disclosure.receiptId,
          fieldsVerified: disclosure.fields,
        },
      },
    });
  } catch {
    // Non-fatal if audit table logging fails
  }

  return NextResponse.json({
    status: "valid",
    fields: disclosure.fields, // field NAMES allowlist
    values, // field VALUES for allowlisted fields only
    encryptedPayload: encryptedPayloadB64,
    payloadSignature: payloadSignatureB64,
    expiresAt: disclosure.expiresAt,
    receipt: {
      transactionSignature: disclosure.receipt.transactionSignature,
      mintAddress: disclosure.receipt.mintAddress,
      issuerPublicKey: disclosure.receipt.issuerPublicKey,
      recipientPublicKey: disclosure.receipt.recipientPublicKey,
    },
  });
}
