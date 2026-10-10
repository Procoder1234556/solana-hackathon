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

export type DisclosurePayload = {
  version: 1;
  receiptId: string;
  fields: DisclosureField[];
  values: Partial<Record<DisclosureField, string>>;
  expiresAt: string;
};

/**
 * Encrypts contractor-selected values using AES-256-GCM keyed by SHA-256(one-time token).
 * Server stores only ciphertext; verifier decrypts with token on authorized verification.
 */
export async function encryptDisclosurePayload(
  payload: DisclosurePayload,
  token: string,
): Promise<{ encryptedPayloadBase64: string }> {
  const tokenBytes = new TextEncoder().encode(token);
  const keyMaterial = await crypto.subtle.digest("SHA-256", tokenBytes);
  const aesKey = await crypto.subtle.importKey("raw", keyMaterial, { name: "AES-GCM" }, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, plaintext);
  const combined = new Uint8Array(12 + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), 12);
  let binary = "";
  for (const byte of combined) binary += String.fromCharCode(byte);
  return { encryptedPayloadBase64: btoa(binary) };
}

/**
 * Decrypts the disclosure payload using the one-time token presented by the verifier.
 */
export async function decryptDisclosurePayload(
  encryptedPayloadBase64: string,
  token: string,
): Promise<DisclosurePayload> {
  const binary = atob(encryptedPayloadBase64);
  const combined = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  if (combined.length < 13) {
    throw new Error("Invalid encrypted disclosure payload.");
  }
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const tokenBytes = new TextEncoder().encode(token);
  const keyMaterial = await crypto.subtle.digest("SHA-256", tokenBytes);
  const aesKey = await crypto.subtle.importKey("raw", keyMaterial, { name: "AES-GCM" }, false, ["decrypt"]);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aesKey, ciphertext);
  return JSON.parse(new TextDecoder().decode(decrypted)) as DisclosurePayload;
}
