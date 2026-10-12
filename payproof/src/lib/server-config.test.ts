import { describe, expect, it } from "vitest";
import { readServerConfig, getServerRpcUrl, getFallbackRpcUrls } from "./server-config";

describe("server-config", () => {
  const minimalEnv = {
    DATABASE_URL: "postgresql://user:pass@localhost:5432/payproof",
    SESSION_SECRET: "12345678901234567890123456789012",
    DISCLOSURE_TOKEN_PEPPER: "abcdefabcdefabcdefabcdefabcdefab",
    RECEIPT_ENVELOPE_MASTER_KEY: "secretmasterkeysecretmasterkey32",
  };

  it("validates valid server configuration", () => {
    const config = readServerConfig(minimalEnv);
    expect(config.DATABASE_URL).toBe(minimalEnv.DATABASE_URL);
  });

  it("fails if secret keys are too short (minimum 32 chars for security)", () => {
    expect(() =>
      readServerConfig({
        ...minimalEnv,
        SESSION_SECRET: "short-key",
      }),
    ).toThrow();
  });

  it("resolves primary RPC url accurately", () => {
    expect(getServerRpcUrl({ ...minimalEnv, SOLANA_RPC_URL: "https://custom.rpc.io" })).toBe("https://custom.rpc.io");
    expect(getServerRpcUrl({ ...minimalEnv, HELIUS_API_KEY: "testkey" })).toBe("https://devnet.helius-rpc.com/?api-key=testkey");
    expect(getServerRpcUrl(minimalEnv)).toBe("https://api.devnet.solana.com");
  });

  it("provides ordered deduplicated fallback RPC endpoints for resilience", () => {
    const fallbacks = getFallbackRpcUrls({
      ...minimalEnv,
      HELIUS_API_KEY: "key1",
      QUICKNODE_RPC_URL: "https://qn.solana.com",
    });
    expect(fallbacks).toContain("https://devnet.helius-rpc.com/?api-key=key1");
    expect(fallbacks).toContain("https://qn.solana.com");
    expect(fallbacks).toContain("https://api.devnet.solana.com");
  });
});
