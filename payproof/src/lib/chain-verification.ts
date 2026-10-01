export type TransactionEvidence =
  | { error: string }
  | { finality: "processed" | "confirmed" | "finalized"; accountKeys: string[]; tokenMints: string[] };

export type ExpectedTransaction = {
  signature: string;
  mintAddress: string;
  issuerPublicKey: string;
  recipientPublicKey: string;
};

/**
 * Reduces an RPC response to the only states a receipt may use. The caller must
 * fetch the response; an RPC failure intentionally has no success path.
 */
export function evaluateTransactionEvidence(evidence: TransactionEvidence, expected: ExpectedTransaction): { status: "confirmed" | "pending" | "unverifiable" } {
  if ("error" in evidence) return { status: "unverifiable" };
  if (evidence.finality !== "finalized") return { status: "pending" };
  const accountsMatch = [expected.issuerPublicKey, expected.recipientPublicKey].every((key) => evidence.accountKeys.includes(key));
  return accountsMatch && evidence.tokenMints.includes(expected.mintAddress)
    ? { status: "confirmed" }
    : { status: "unverifiable" };
}
