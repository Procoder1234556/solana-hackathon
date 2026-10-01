import { createHash, verify } from "node:crypto";
import { z } from "zod";

/** The complete payload stays in the encrypted client-side receipt envelope. */
export const receiptSchema = z.object({
  version: z.literal(1),
  issuerPublicKey: z.string().min(1),
  recipientPublicKey: z.string().min(1),
  amount: z.string().regex(/^\d+(\.\d+)?$/),
  mintAddress: z.string().min(1),
  paidAt: z.string().datetime(),
  period: z.string().min(1).max(200),
  transactionSignature: z.string().min(1),
  invoiceReference: z.string().min(1).max(200).optional(),
});

export type ReceiptPayload = z.infer<typeof receiptSchema>;

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`).join(",")}}`;
}

export function canonicalizeReceipt(payload: unknown): string {
  return canonicalize(receiptSchema.parse(payload));
}

export async function receiptDigest(payload: unknown): Promise<string> {
  return createHash("sha256").update(canonicalizeReceipt(payload), "utf8").digest("hex");
}

/** Verifies an Ed25519 issuer signature over the canonical, versioned receipt. */
export async function verifyReceiptSignature(
  payload: unknown,
  signatureBase64: string,
  issuerPublicKey: Parameters<typeof verify>[2],
): Promise<boolean> {
  return verify(null, Buffer.from(canonicalizeReceipt(payload)), issuerPublicKey, Buffer.from(signatureBase64, "base64"));
}
