import { describe, expect, it } from "vitest";

import { selectPaymentMode } from "./confidential-capability";

describe("confidential transfer capability boundary", () => {
  it("labels the fallback as non-confidential", () => {
    expect(selectPaymentMode(false)).toEqual({ mode: "receipt-only", label: "Non-confidential receipt POC" });
  });
});
