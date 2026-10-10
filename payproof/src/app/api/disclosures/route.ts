import { NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes, createHmac } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { readServerConfig } from "@/lib/server-config";
import { getSession } from "@/lib/session";
import { disclosureFieldSchema } from "@/lib/disclosure";

const DISCLOSURE_EXPIRY_OPTIONS = [60 * 60 * 24, 60 * 60 * 24 * 3, 60 * 60 * 24 * 7] as const; // 24h, 72h, 7d in seconds

const postBodySchema = z.object({
  receiptId: z.string().uuid(),
  fields: z.array(disclosureFieldSchema).min(1),
  /** Expiry duration in seconds: 86400, 259200, or 604800. */
  expirySeconds: z.union([z.literal(86400), z.literal(259200), z.literal(604800)]),
  /** Base64 browser-encrypted+signed disclosure payload. */
  encryptedPayload: z.string().min(1),
  /** Base64 payload signature (contractor wallet Ed25519 over encrypted payload). */
  payloadSignature: z.string().min(1),
  /** Optional client-generated token used for encrypting the payload. */
  token: z.string().min(32).optional(),
});

/**
 * POST /api/disclosures
 * Contractor issues a one-time disclosure link.
 * The server stores an HMAC-hashed token and never learns the plaintext token in database storage.
 */
export async function POST(request: Request) {
  const config = readServerConfig();
  const session = await getSession(config.SESSION_SECRET);
  if (!session || session.role !== "CONTRACTOR") {
    return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Contractor session required.", requestId: crypto.randomUUID() } }, { status: 401 });
  }

  let body: z.infer<typeof postBodySchema>;
  try {
    body = postBodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: { code: "INVALID_INPUT", message: "Invalid disclosure request.", requestId: crypto.randomUUID() } }, { status: 400 });
  }

  // Verify the receipt belongs to this contractor.
  const receipt = await prisma.receipt.findUnique({ where: { id: body.receiptId } });
  if (!receipt || receipt.recipientPublicKey !== session.publicKey) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Receipt not found.", requestId: crypto.randomUUID() } }, { status: 404 });
  }

  const token = body.token ?? randomBytes(32).toString("hex");
  const tokenHash = createHmac("sha256", config.DISCLOSURE_TOKEN_PEPPER).update(token, "utf8").digest("hex");
  const expiresAt = new Date(Date.now() + body.expirySeconds * 1000);

  const disclosure = await prisma.disclosure.create({
    data: {
      receiptId: body.receiptId,
      tokenHash,
      fields: body.fields,
      encryptedPayload: Buffer.from(body.encryptedPayload, "base64"),
      payloadSignature: Buffer.from(body.payloadSignature, "base64"),
      payloadVersion: 1,
      expiresAt,
    },
    select: { id: true, expiresAt: true },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return NextResponse.json({
    id: disclosure.id,
    token,
    verifyUrl: `${appUrl}/verify/${token}`,
    expiresAt: disclosure.expiresAt,
  }, { status: 201 });
}
