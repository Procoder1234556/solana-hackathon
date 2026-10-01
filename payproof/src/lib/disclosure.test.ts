import { describe, expect, it } from "vitest";

import { disclosureTokenHash, validateDisclosure } from "./disclosure";

const secret = "one-time-secret";
const pepper = "test-pepper";

describe("disclosure validation", () => {
  it("accepts an unused unexpired disclosure and returns only allowed fields", async () => {
    const result = await validateDisclosure({ tokenHash: await disclosureTokenHash(secret, pepper), expiresAt: new Date("2026-10-01T00:00:00Z"), fields: ["amount", "mintAddress"], values: { amount: "125.50", mintAddress: "mint", period: "private" } }, secret, pepper, new Date("2026-09-30T00:00:00Z"));
    expect(result).toEqual({ status: "valid", fields: { amount: "125.50", mintAddress: "mint" } });
  });

  it.each([
    ["expired", { expiresAt: new Date("2026-09-29T00:00:00Z") }],
    ["revoked", { revokedAt: new Date("2026-09-30T00:00:00Z") }],
    ["consumed", { consumedAt: new Date("2026-09-30T00:00:00Z") }],
  ])("never exposes private fields for a %s disclosure", async (_name, state) => {
    const result = await validateDisclosure({ tokenHash: await disclosureTokenHash(secret, pepper), expiresAt: new Date("2026-10-01T00:00:00Z"), fields: ["amount"], values: { amount: "125.50" }, ...state }, secret, pepper, new Date("2026-09-30T00:00:00Z"));
    expect(result).toEqual({ status: _name });
  });
});
