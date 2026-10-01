import { generateKeyPairSync } from "node:crypto";

import { describe, expect, it } from "vitest";

import { decryptReceiptEnvelope, encryptReceiptEnvelope } from "./receipt-envelope";

const receipt = {
  version: 1 as const,
  issuerPublicKey: "employer-public-key",
  recipientPublicKey: "contractor-public-key",
  amount: "125.50",
  mintAddress: "token-2022-mint",
  paidAt: "2026-09-30T00:00:00.000Z",
  period: "September 2026",
  transactionSignature: "transaction-signature",
  invoiceReference: "INV-2026-09",
};

function exportEncryptionKeys() {
  const keys = generateKeyPairSync("rsa", { modulusLength: 2048, publicKeyEncoding: { type: "spki", format: "der" }, privateKeyEncoding: { type: "pkcs8", format: "der" } });
  return { publicKey: keys.publicKey.toString("base64"), privateKey: keys.privateKey.toString("base64") };
}

describe("receipt envelope", () => {
  it("encrypts receipt plaintext for the contractor public key and only that private key can decrypt it", async () => {
    const contractor = exportEncryptionKeys();
    const envelope = await encryptReceiptEnvelope(receipt, contractor.publicKey);

    expect(JSON.stringify(envelope)).not.toContain("125.50");
    expect(JSON.stringify(envelope)).not.toContain("INV-2026-09");
    await expect(decryptReceiptEnvelope(envelope, contractor.privateKey)).resolves.toEqual(receipt);
  });

  it("does not decrypt with a different contractor key", async () => {
    const contractor = exportEncryptionKeys();
    const otherContractor = exportEncryptionKeys();
    const envelope = await encryptReceiptEnvelope(receipt, contractor.publicKey);

    await expect(decryptReceiptEnvelope(envelope, otherContractor.privateKey)).rejects.toThrow();
  });
});
