export type PaymentMode = "confidential" | "receipt-only";

/** A feature flag boundary: no caller may silently describe the fallback as confidential. */
export function selectPaymentMode(confidentialTransfersVerified: boolean): { mode: PaymentMode; label: string } {
  return confidentialTransfersVerified
    ? { mode: "confidential", label: "Confidential-balance devnet transfer" }
    : { mode: "receipt-only", label: "Non-confidential receipt POC" };
}
