import { describe, expect, it } from "vitest";

import { evaluateTransactionEvidence } from "./chain-verification";

const expected = { signature: "signature", mintAddress: "mint", issuerPublicKey: "employer", recipientPublicKey: "contractor" };

describe("transaction evidence", () => {
  it("requires finality and every expected public identifier", () => {
    expect(evaluateTransactionEvidence({ finality: "finalized", accountKeys: ["employer", "contractor"], tokenMints: ["mint"] }, expected)).toEqual({ status: "confirmed" });
  });

  it("never treats an RPC error or incomplete confirmation as a valid receipt", () => {
    expect(evaluateTransactionEvidence({ finality: "confirmed", accountKeys: ["employer", "contractor"], tokenMints: ["mint"] }, expected)).toEqual({ status: "pending" });
    expect(evaluateTransactionEvidence({ error: "RPC unavailable" }, expected)).toEqual({ status: "unverifiable" });
    expect(evaluateTransactionEvidence({ finality: "finalized", accountKeys: ["employer"], tokenMints: ["mint"] }, expected)).toEqual({ status: "unverifiable" });
  });
});
