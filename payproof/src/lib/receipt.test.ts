import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";

import { canonicalizeReceipt, receiptDigest, verifyReceiptSignature } from "./receipt";

const receipt = {
  version: 1 as const,
  issuerPublicKey: "issuer-public-key",
  recipientPublicKey: "recipient-public-key",
  amount: "125.50",
  mintAddress: "mint-address",
  paidAt: "2026-09-30T00:00:00.000Z",
  period: "September 2026",
  transactionSignature: "transaction-signature",
};

describe("receipt canonicalization", () => {
  it("produces a stable digest regardless of object key order", async () => {
    const reordered = { transactionSignature: receipt.transactionSignature, amount: receipt.amount, version: receipt.version, issuerPublicKey: receipt.issuerPublicKey, recipientPublicKey: receipt.recipientPublicKey, mintAddress: receipt.mintAddress, paidAt: receipt.paidAt, period: receipt.period };
    expect(canonicalizeReceipt(reordered)).toBe(canonicalizeReceipt(receipt));
    await expect(receiptDigest(reordered)).resolves.toBe(await receiptDigest(receipt));
  });

  it.each([
    ["a malformed amount", { ...receipt, amount: "125.50 USD" }],
    ["an invalid payment timestamp", { ...receipt, paidAt: "not-a-timestamp" }],
    ["a missing transaction signature", { ...receipt, transactionSignature: "" }],
  ])("rejects %s before it can be canonicalized or hashed", async (_name, invalidReceipt) => {
    expect(() => canonicalizeReceipt(invalidReceipt)).toThrow();
    await expect(receiptDigest(invalidReceipt)).rejects.toThrow();
  });

  it.each([
    ["amount", { ...receipt, amount: "125.51" }],
    ["recipient wallet", { ...receipt, recipientPublicKey: "attacker-public-key" }],
  ])("rejects a receipt whose %s was modified after signing", async (_field, tamperedReceipt) => {
    const keys = generateKeyPairSync("ed25519");
    const signature = sign(null, Buffer.from(canonicalizeReceipt(receipt)), keys.privateKey).toString("base64");
    await expect(verifyReceiptSignature(receipt, signature, keys.publicKey)).resolves.toBe(true);
    await expect(verifyReceiptSignature(tamperedReceipt, signature, keys.publicKey)).resolves.toBe(false);
  });
});
