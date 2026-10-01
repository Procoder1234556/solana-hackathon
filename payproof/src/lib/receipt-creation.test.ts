import { describe, expect, it } from "vitest";

import { createReceiptDraft } from "./receipt-creation";

const payment = {
  issuerPublicKey: "Vote111111111111111111111111111111111111111",
  recipientPublicKey: "11111111111111111111111111111111",
  amount: "125.50",
  mintAddress: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
  period: "September 2026",
  invoiceReference: "INV-2026-09",
};

const evidence = {
  finality: "finalized" as const,
  accountKeys: [payment.issuerPublicKey, payment.recipientPublicKey],
  tokenMints: [payment.mintAddress],
};

describe("receipt creation", () => {
  it("creates a signable receipt draft only after the expected transaction is finalized", async () => {
    const result = await createReceiptDraft(payment, "transaction-signature", evidence, new Date("2026-09-30T00:00:00.000Z"));

    expect(result.status).toBe("confirmed");
    expect(result.payload).toMatchObject({
      version: 1,
      ...payment,
      transactionSignature: "transaction-signature",
      paidAt: "2026-09-30T00:00:00.000Z",
    });
    expect(result.receiptHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it.each([
    ["pending", { ...evidence, finality: "confirmed" as const }],
    ["unverifiable", { ...evidence, accountKeys: [payment.issuerPublicKey] }],
    ["RPC error", { error: "RPC unavailable" }],
  ])("never creates a receipt when transaction evidence is %s", async (_name, invalidEvidence) => {
    await expect(createReceiptDraft(payment, "transaction-signature", invalidEvidence)).rejects.toThrow(
      "A receipt can only be created after the expected transaction is finalized.",
    );
  });
});
