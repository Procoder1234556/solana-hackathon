import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { readServerConfig, getServerRpcUrl } from "@/lib/server-config";
import { getSession } from "@/lib/session";
import { fetchTransactionEvidence, evaluateChainStatus } from "@/lib/rpc-client";

const postBodySchema = z.object({
  issuerPublicKey: z.string().min(32),
  recipientPublicKey: z.string().min(32),
  transactionSignature: z.string().min(1),
  mintAddress: z.string().min(32),
  receiptHash: z.string().regex(/^[a-f0-9]{64}$/),
  encryptedEnvelope: z.string().min(1), // base64-encoded encrypted receipt envelope JSON
});

/** POST /api/receipts — employer stores an encrypted receipt after confirmed tx. */
export async function POST(request: Request) {
  const config = readServerConfig();
  const rpcUrl = getServerRpcUrl();
  const session = await getSession(config.SESSION_SECRET);
  if (!session || session.role !== "EMPLOYER") {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Employer session required.", requestId: crypto.randomUUID() } }, { status: 401 });
  }

  let body: z.infer<typeof postBodySchema>;
  try {
    body = postBodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: { code: "INVALID_INPUT", message: "Invalid receipt payload.", requestId: crypto.randomUUID() } }, { status: 400 });
  }

  if (body.issuerPublicKey !== session.publicKey) {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "Issuer key does not match the authenticated wallet.", requestId: crypto.randomUUID() } }, { status: 403 });
  }

  // Verify the transaction is finalized before storing anything.
  const evidence = await fetchTransactionEvidence(rpcUrl, body.transactionSignature, body.mintAddress);
  const chainStatus = evaluateChainStatus(evidence, {
    signature: body.transactionSignature,
    mintAddress: body.mintAddress,
    issuerPublicKey: body.issuerPublicKey,
    recipientPublicKey: body.recipientPublicKey,
  });

  if (chainStatus.status !== "confirmed") {
    return NextResponse.json(
      { error: { code: chainStatus.status === "pending" ? "TRANSACTION_PENDING" : "TRANSACTION_UNVERIFIABLE", message: "Transaction is not finalized. RPC failure cannot produce a valid receipt.", requestId: crypto.randomUUID() } },
      { status: chainStatus.status === "pending" ? 202 : 502 },
    );
  }

  try {
    const receipt = await prisma.receipt.create({
      data: {
        issuerPublicKey: body.issuerPublicKey,
        recipientPublicKey: body.recipientPublicKey,
        transactionSignature: body.transactionSignature,
        mintAddress: body.mintAddress,
        receiptHash: body.receiptHash,
        encryptedEnvelope: Buffer.from(body.encryptedEnvelope, "base64"),
        status: "CONFIRMED",
      },
      select: { id: true, createdAt: true },
    });

    // Record audit event without exposing private payloads
    try {
      await prisma.auditEvent.create({
        data: {
          actorKey: session.publicKey,
          eventType: "RECEIPT_CREATED",
          subjectId: receipt.id,
          metadata: {
            transactionSignature: body.transactionSignature,
            mintAddress: body.mintAddress,
            recipientPublicKey: body.recipientPublicKey,
          },
        },
      });
    } catch {
      // Non-fatal if audit table logging fails
    }

    return NextResponse.json({ id: receipt.id, createdAt: receipt.createdAt }, { status: 201 });
  } catch (error: unknown) {
    const errCode = (error as { code?: string })?.code;
    const isDuplicate = errCode === "P2002" || (error instanceof Error && error.message.includes("Unique constraint"));
    if (isDuplicate) {
      return NextResponse.json({ error: { code: "DUPLICATE_TRANSACTION", message: "A receipt for this transaction already exists.", requestId: crypto.randomUUID() } }, { status: 409 });
    }
    return NextResponse.json({ error: { code: "SERVER_ERROR", message: "Failed to store receipt.", requestId: crypto.randomUUID() } }, { status: 500 });
  }
}

/** GET /api/receipts — contractor retrieves their encrypted receipt envelopes. */
export async function GET() {
  const config = readServerConfig();
  const session = await getSession(config.SESSION_SECRET);
  if (!session || session.role !== "CONTRACTOR") {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Contractor session required.", requestId: crypto.randomUUID() } }, { status: 401 });
  }

  const receipts = await prisma.receipt.findMany({
    where: { recipientPublicKey: session.publicKey },
    select: {
      id: true,
      issuerPublicKey: true,
      transactionSignature: true,
      mintAddress: true,
      receiptHash: true,
      encryptedEnvelope: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    receipts: receipts.map((r) => ({
      ...r,
      encryptedEnvelope: Buffer.from(r.encryptedEnvelope).toString("base64"),
    })),
  });
}
