import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { fetchTransactionEvidence } from "./rpc-client";

describe("fetchTransactionEvidence", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("successfully parses a finalized valid transaction", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        result: {
          meta: { err: null },
          transaction: {
            message: {
              accountKeys: ["issuerWallet1111", "contractorWallet2222"],
            },
          },
        },
      }),
    });

    const result = await fetchTransactionEvidence(
      "https://api.devnet.solana.com",
      "test-sig-123",
      "test-mint-456",
      { maxRetries: 0, timeoutMs: 1000 },
    );

    expect(result).toEqual({
      finality: "finalized",
      accountKeys: ["issuerWallet1111", "contractorWallet2222"],
      tokenMints: ["test-mint-456"],
    });
  });

  it("returns error on on-chain execution error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        result: {
          meta: { err: { InstructionError: [0, "Custom"] } },
          transaction: {
            message: { accountKeys: ["issuer"] },
          },
        },
      }),
    });

    const result = await fetchTransactionEvidence(
      "https://api.devnet.solana.com",
      "failed-sig",
      "mint",
      { maxRetries: 0, timeoutMs: 1000 },
    );

    expect(result).toEqual({ error: "Transaction failed on-chain" });
  });

  it("retries on 429 rate limit and fails gracefully without fabricating success", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      return {
        ok: false,
        status: 429,
      };
    });

    const result = await fetchTransactionEvidence(
      "https://api.devnet.solana.com",
      "sig",
      "mint",
      { maxRetries: 1, initialDelayMs: 10, timeoutMs: 500 },
    );

    expect(callCount).toBeGreaterThan(1);
    expect(result).toHaveProperty("error");
    expect("finality" in result).toBe(false);
  });
});
