import { describe, expect, it } from "vitest";

import { connectEmployerWallet } from "./wallet-session";

describe("employer wallet session", () => {
  it("returns the public key supplied by the connected wallet", async () => {
    await expect(connectEmployerWallet({ connect: async () => ({ publicKey: "11111111111111111111111111111111" }) })).resolves.toEqual({
      publicKey: "11111111111111111111111111111111",
    });
  });

  it("rejects a provider response that is not a Solana public key", async () => {
    await expect(connectEmployerWallet({ connect: async () => ({ publicKey: "not-a-wallet" }) })).rejects.toThrow("valid Solana public key");
  });

  it("handles PublicKey objects with toBase58()", async () => {
    await expect(
      connectEmployerWallet({
        connect: async () => ({
          publicKey: { toBase58: () => "11111111111111111111111111111111" },
        }),
      }),
    ).resolves.toEqual({
      publicKey: "11111111111111111111111111111111",
    });
  });
});
