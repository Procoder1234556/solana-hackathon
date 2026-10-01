import { evaluateTransactionEvidence, type TransactionEvidence } from "./chain-verification";
import { receiptDigest, type ReceiptPayload } from "./receipt";
import { createPaymentReview, type PaymentRequest } from "./payment-request";

export type ReceiptDraft = {
  status: "confirmed";
  payload: ReceiptPayload;
  receiptHash: string;
};

/**
 * Produces the canonical payload that an employer wallet signs. Callers must
 * encrypt this payload in the browser before persisting it; this module never
 * accepts a wallet key or stores receipt plaintext.
 */
export async function createReceiptDraft(
  payment: PaymentRequest & { issuerPublicKey: string },
  transactionSignature: string,
  evidence: TransactionEvidence,
  paidAt = new Date(),
): Promise<ReceiptDraft> {
  const review = createPaymentReview(payment, payment.issuerPublicKey);
  const expected = {
    signature: transactionSignature,
    mintAddress: review.mintAddress,
    issuerPublicKey: review.issuerPublicKey,
    recipientPublicKey: review.recipientPublicKey,
  };

  if (evaluateTransactionEvidence(evidence, expected).status !== "confirmed") {
    throw new Error("A receipt can only be created after the expected transaction is finalized.");
  }

  const payload: ReceiptPayload = {
    version: 1,
    issuerPublicKey: review.issuerPublicKey,
    recipientPublicKey: review.recipientPublicKey,
    amount: review.amount,
    mintAddress: review.mintAddress,
    paidAt: paidAt.toISOString(),
    period: review.period,
    transactionSignature,
    ...(review.invoiceReference ? { invoiceReference: review.invoiceReference } : {}),
  };

  return { status: "confirmed", payload, receiptHash: await receiptDigest(payload) };
}
