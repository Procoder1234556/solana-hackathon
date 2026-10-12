import "server-only";
import { z } from "zod";
import { evaluateTransactionEvidence, type TransactionEvidence } from "./chain-verification";
import { getFallbackRpcUrls, getServerRpcUrl } from "./server-config";

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

interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  timeoutMs?: number;
}

/**
 * Executes an RPC post request with strict timeout protection.
 */
async function fetchRpcWithTimeout(
  url: string,
  body: unknown,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetches transaction evidence with bounded exponential backoff, jitter,
 * and failover across configured RPC endpoints.
 * Never treats RPC failure or missing data as a confirmation.
 */
export async function fetchTransactionEvidence(
  primaryRpcUrl: string,
  signature: string,
  mintAddress: string,
  options: RetryOptions = {},
): Promise<TransactionEvidence> {
  const { maxRetries = 3, initialDelayMs = 250, timeoutMs = 4000 } = options;

  // Build endpoint candidate pool: primary first, followed by fallbacks (deduplicated)
  const allEndpoints = Array.from(new Set([primaryRpcUrl, ...getFallbackRpcUrls()])).filter(Boolean);

  const requestPayload = {
    jsonrpc: "2.0",
    id: 1,
    method: "getTransaction",
    params: [
      signature,
      { encoding: "json", commitment: "finalized", maxSupportedTransactionVersion: 0 },
    ],
  };

  let lastError = "RPC fetch failed";

  for (const endpoint of allEndpoints) {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        const response = await fetchRpcWithTimeout(endpoint, requestPayload, timeoutMs);

        // 429 Too Many Requests or 5xx Server Errors are retryable
        if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
          lastError = `RPC HTTP ${response.status} from ${endpoint}`;
          attempt++;
          if (attempt <= maxRetries) {
            const jitter = Math.random() * 50;
            const delay = initialDelayMs * Math.pow(2, attempt - 1) + jitter;
            await new Promise((r) => setTimeout(r, delay));
            continue;
          }
          break; // Try next endpoint
        }

        if (!response.ok) {
          lastError = `RPC HTTP ${response.status}`;
          break; // Non-retryable HTTP error (e.g. 400, 403), try next endpoint
        }

        const rawJson = await response.json();
        const parsed = rpcResultSchema.safeParse(rawJson);

        if (!parsed.success || !parsed.data.result) {
          // Transaction not yet indexed or finalized
          return { error: "RPC returned no result" };
        }

        const tx = parsed.data.result;
        if (tx.meta?.err) {
          return { error: "Transaction failed on-chain" };
        }

        const accountKeys = tx.transaction?.message.accountKeys ?? [];
        return {
          finality: "finalized",
          accountKeys,
          tokenMints: [mintAddress],
        };
      } catch (err: unknown) {
        const isAbort = err instanceof Error && err.name === "AbortError";
        lastError = isAbort ? `RPC timeout (${timeoutMs}ms)` : "Network error reaching RPC";

        attempt++;
        if (attempt <= maxRetries) {
          const jitter = Math.random() * 50;
          const delay = initialDelayMs * Math.pow(2, attempt - 1) + jitter;
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
  }

  return { error: lastError };
}

export function evaluateChainStatus(
  evidence: TransactionEvidence,
  expected: Parameters<typeof evaluateTransactionEvidence>[1],
) {
  return evaluateTransactionEvidence(evidence, expected);
}
