import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const disclosureFieldSchema = z.enum([
  "amount",
  "mintAddress",
  "issuerPublicKey",
  "recipientPublicKey",
  "period",
  "paidAt",
  "transactionSignature",
]);
export type DisclosureField = z.infer<typeof disclosureFieldSchema>;

export const disclosureInputSchema = z.object({
  tokenHash: z.string().regex(/^[a-f0-9]{64}$/),
  fields: z.array(disclosureFieldSchema).min(1),
  values: z.record(z.string(), z.string()),
  expiresAt: z.date(),
  revokedAt: z.date().nullable().optional(),
  consumedAt: z.date().nullable().optional(),
});

export type DisclosureValidation = { status: "valid"; fields: Partial<Record<DisclosureField, string>> } | { status: "expired" | "revoked" | "consumed" | "unverifiable" };

export async function disclosureTokenHash(token: string, pepper: string): Promise<string> {
  return createHmac("sha256", pepper).update(token, "utf8").digest("hex");
}

export async function validateDisclosure(
  candidate: unknown,
  token: string,
  pepper: string,
  now = new Date(),
): Promise<DisclosureValidation> {
  const disclosure = disclosureInputSchema.parse(candidate);
  const expected = Buffer.from(await disclosureTokenHash(token, pepper), "hex");
  const received = Buffer.from(disclosure.tokenHash, "hex");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return { status: "unverifiable" };
  if (disclosure.revokedAt) return { status: "revoked" };
  if (disclosure.consumedAt) return { status: "consumed" };
  if (disclosure.expiresAt <= now) return { status: "expired" };
  const fields = Object.fromEntries(disclosure.fields.map((field) => [field, disclosure.values[field]]).filter((entry): entry is [DisclosureField, string] => typeof entry[1] === "string"));
  return { status: "valid", fields };
}
