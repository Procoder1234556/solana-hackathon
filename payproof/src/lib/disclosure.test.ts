import { describe, expect, it } from "vitest";

import {
  disclosureTokenHash,
  validateDisclosure,
  encryptDisclosurePayload,
  decryptDisclosurePayload,
  type DisclosurePayload,
} from "./disclosure";
import { evaluateTransactionEvidence } from "./chain-verification";

const secret = "one-time-secret-token-32-chars-long";
const pepper = "test-disclosure-token-pepper-32-chars";

describe("disclosure validation", () => {
  it("accepts an unused unexpired disclosure and returns only allowed fields", async () => {
    const result = await validateDisclosure(
      {
        tokenHash: await disclosureTokenHash(secret, pepper),
        expiresAt: new Date("2026-10-01T00:00:00Z"),
        fields: ["amount", "mintAddress"],
        values: { amount: "125.50", mintAddress: "mint", period: "private" },
      },
      secret,
      pepper,
      new Date("2026-09-30T00:00:00Z"),
    );
    expect(result).toEqual({ status: "valid", fields: { amount: "125.50", mintAddress: "mint" } });
  });

  it.each([
    ["expired", { expiresAt: new Date("2026-09-29T00:00:00Z") }],
    ["revoked", { revokedAt: new Date("2026-09-30T00:00:00Z") }],
    ["consumed", { consumedAt: new Date("2026-09-30T00:00:00Z") }],
  ])("never exposes private fields for a %s disclosure", async (_name, state) => {
    const result = await validateDisclosure(
      {
        tokenHash: await disclosureTokenHash(secret, pepper),
        expiresAt: new Date("2026-10-01T00:00:00Z"),
        fields: ["amount"],
        values: { amount: "125.50" },
        ...state,
      },
      secret,
      pepper,
      new Date("2026-09-30T00:00:00Z"),
    );
    expect(result).toEqual({ status: _name });
  });

  it("rejects a tampered or invalid token with unverifiable status", async () => {
    const validHash = await disclosureTokenHash(secret, pepper);
    const tamperedSecret = "wrong-tampered-token-32-chars-xyz";
    const result = await validateDisclosure(
      {
        tokenHash: validHash,
        expiresAt: new Date("2026-10-01T00:00:00Z"),
        fields: ["amount"],
        values: { amount: "125.50" },
      },
      tamperedSecret,
      pepper,
      new Date("2026-09-30T00:00:00Z"),
    );
    expect(result).toEqual({ status: "unverifiable" });
  });

  it("rejects a tampered tokenHash with unverifiable status", async () => {
    const fakeHash = "a".repeat(64);
    const result = await validateDisclosure(
      {
        tokenHash: fakeHash,
        expiresAt: new Date("2026-10-01T00:00:00Z"),
        fields: ["amount"],
        values: { amount: "125.50" },
      },
      secret,
      pepper,
      new Date("2026-09-30T00:00:00Z"),
    );
    expect(result).toEqual({ status: "unverifiable" });
  });
});

describe("disclosure payload encryption and decryption", () => {
  const payload: DisclosurePayload = {
    version: 1,
    receiptId: "11111111-2222-3333-4444-555555555555",
    fields: ["amount", "period", "paidAt"],
    values: {
      amount: "250.00",
      period: "October 2026",
      paidAt: "2026-10-09T12:00:00.000Z",
    },
    expiresAt: "2026-10-10T12:00:00.000Z",
  };

  it("encrypts and decrypts with the matching one-time token", async () => {
    const { encryptedPayloadBase64 } = await encryptDisclosurePayload(payload, secret);
    expect(typeof encryptedPayloadBase64).toBe("string");
    expect(encryptedPayloadBase64.length).toBeGreaterThan(0);

    const decrypted = await decryptDisclosurePayload(encryptedPayloadBase64, secret);
    expect(decrypted).toEqual(payload);
  });

  it("fails decryption when presented with a different or tampered token", async () => {
    const { encryptedPayloadBase64 } = await encryptDisclosurePayload(payload, secret);
    await expect(
      decryptDisclosurePayload(encryptedPayloadBase64, "different-secret-token-32-chars-1"),
    ).rejects.toThrow();
  });
});

describe("chain-verification evidence integration for disclosures", () => {
  it("treats RPC failure as unverifiable and never confirmed", () => {
    const failedChainStatus = evaluateTransactionEvidence({ error: "RPC failed" }, {
      signature: "fake-sig",
      mintAddress: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
      issuerPublicKey: "issuer",
      recipientPublicKey: "recipient",
    });
    expect(failedChainStatus.status).toBe("unverifiable");
  });

  it("treats pending finality as pending and not confirmed", () => {
    const pendingStatus = evaluateTransactionEvidence(
      { finality: "confirmed", accountKeys: ["issuer", "recipient"], tokenMints: ["TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"] },
      {
        signature: "sig",
        mintAddress: "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb",
        issuerPublicKey: "issuer",
        recipientPublicKey: "recipient",
      },
    );
    expect(pendingStatus.status).toBe("pending");
  });
});
