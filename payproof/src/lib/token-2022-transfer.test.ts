import { describe, expect, it } from "vitest";

import { decimalToTokenUnits } from "./token-2022-transfer";

describe("Token-2022 transfer plan", () => {
  it("converts a user decimal amount to exact mint base units", () => {
    expect(decimalToTokenUnits("125.50", 6)).toBe(BigInt("125500000"));
    expect(decimalToTokenUnits("0.000001", 6)).toBe(BigInt(1));
  });

  it("rejects an amount that cannot be represented by the mint decimals", () => {
    expect(() => decimalToTokenUnits("1.0000001", 6)).toThrow("mint precision");
  });
});
