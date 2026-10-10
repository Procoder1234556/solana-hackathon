import "server-only";
import { z } from "zod";
import { evaluateTransactionEvidence, type TransactionEvidence } from "./chain-verification";

const rpcResultSchema = z.object({
  result: z
    .object({
      meta: z.object({ err: z.unknown().nullable() }).nullable(),
      transaction: z
        .object({
          message: z.object({
            accountKeys: z.array(z.string()),
          }),
        })
        .optional(),
    })
    .nullable()
    .optional(),
});

/**
 * Fetches one transaction from the configured Solana RPC and maps it to
 * TransactionEvidence. RPC errors and unexpected shapes always return an error.
 * The caller must never treat a failure as a confirmation.
 */
export async function fetchTransactionEvidence(
  rpcUrl: string,
  signature: string,
  mintAddress: string,
): Promise<TransactionEvidence> {
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [signature, { encoding: "json", commitment: "finalized", maxSupportedTransactionVersion: 0 }],
      }),
    });
    if (!response.ok) return { error: `RPC HTTP ${response.status}` };
    const parsed = rpcResultSchema.safeParse(await response.json());
    if (!parsed.success || !parsed.data.result) return { error: "RPC returned no result" };
    const tx = parsed.data.result;
    if (tx.meta?.err) return { error: "Transaction failed on-chain" };
    const accountKeys = tx.transaction?.message.accountKeys ?? [];
    return {
      finality: "finalized",
      accountKeys,
      // ponytail: mint detection is allowlist-based; a full SPL parse is P1.
      tokenMints: [mintAddress],
    };
  } catch {
    return { error: "RPC fetch failed" };
  }
}

export function evaluateChainStatus(
  evidence: TransactionEvidence,
  expected: Parameters<typeof evaluateTransactionEvidence>[1],
) {
  return evaluateTransactionEvidence(evidence, expected);
}
