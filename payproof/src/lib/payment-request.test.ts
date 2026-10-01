import { describe, expect, it } from "vitest";

import { createPaymentReview } from "./payment-request";

const request = {
  recipientPublicKey: "11111111111111111111111111111111",
  amount: "125.50",
  mintAddress: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
  period: "September 2026",
  invoiceReference: "INV-2026-09",
};

describe("payment review", () => {
  it("returns an immutable review record before the wallet is asked to sign", () => {
    expect(createPaymentReview(request, "11111111111111111111111111111111")).toEqual({
      ...request,
      issuerPublicKey: "11111111111111111111111111111111",
      status: "ready-for-signature",
    });
  });

  it("allows the optional invoice reference to be omitted", () => {
    const review = createPaymentReview({ ...request, invoiceReference: "" }, "11111111111111111111111111111111");
    expect(review.issuerPublicKey).toBe("11111111111111111111111111111111");
    expect(review.invoiceReference).toBeUndefined();
  });

  it.each([
    ["a zero amount", { ...request, amount: "0" }],
    ["an invalid decimal", { ...request, amount: "1.234567789" }],
    ["a blank period", { ...request, period: " " }],
    ["a missing recipient", { ...request, recipientPublicKey: "" }],
    ["a malformed recipient public key", { ...request, recipientPublicKey: "not-a-solana-address" }],
  ])("rejects %s before a transaction can be planned", (_name, invalidRequest) => {
    expect(() => createPaymentReview(invalidRequest, "11111111111111111111111111111111")).toThrow();
  });
});
