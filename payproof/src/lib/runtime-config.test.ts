import { describe, expect, it } from "vitest";

import { readPublicRuntimeConfig } from "./runtime-config";

const validEnvironment = {
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_SOLANA_CLUSTER: "devnet",
  NEXT_PUBLIC_SOLANA_RPC_URL: "https://api.devnet.solana.com",
};

describe("readPublicRuntimeConfig", () => {
  it("accepts the supported public devnet configuration", () => {
    expect(readPublicRuntimeConfig(validEnvironment)).toEqual(validEnvironment);
  });

  it("rejects a non-devnet cluster before Solana code can run", () => {
    expect(() =>
      readPublicRuntimeConfig({ ...validEnvironment, NEXT_PUBLIC_SOLANA_CLUSTER: "mainnet-beta" }),
    ).toThrow();
  });

  it("rejects an invalid RPC URL", () => {
    expect(() =>
      readPublicRuntimeConfig({ ...validEnvironment, NEXT_PUBLIC_SOLANA_RPC_URL: "not-a-url" }),
    ).toThrow();
  });
});
