# Phase 3 — Disclosure and verification workflow

## Resolved persistence contract

A contractor creates a versioned payload containing only the receipt fields they explicitly selected, the disclosure expiry, and the contractor signature. The browser encrypts this payload before upload. The database stores its ciphertext, detached signature, version, token hash, field-name allowlist, expiry, and revocation/consumption state; it never stores receipt plaintext.

The verification route may decrypt the payload only after token matching, expiry, revocation, consumption, signature, and transaction-finality checks succeed. Its response contains only the signed payload's field-name allowlist and decrypted values. Invalid, expired, revoked, consumed, or RPC-unverifiable disclosures return no payload fields.

## Acceptance criteria

- [x] The data model supports an encrypted, signed disclosure payload without persisting receipt plaintext.
- [x] Contractor vault decrypts a receipt locally and verifies the connected wallet before disclosure.
- [x] Contractor selects fields and a 24-hour, 72-hour, or seven-day expiry, then copies or revokes a one-time link.
- [x] The verifier route checks the one-time token, payload signature, expiry, revocation, consumption, and finalized transaction evidence before rendering selected fields.
- [x] Unit tests cover valid, expired, revoked, consumed, tampered, and RPC-unverifiable disclosure states.
- [x] Browser E2E covers disclosure, verification, revocation, and post-revocation verification.

## Privacy boundary

The disclosure payload is encrypted before it reaches persistence. It may include only fields a contractor selected for that disclosure. Receipt amount, period, invoice reference, and disclosure token must never appear in database plaintext, request logs, analytics, URLs, or error responses.

## Verification record

| Check | Result | Evidence |
| --- | --- | --- |
| Documentation contract | Passed | `npm run test:docs` confirms the encrypted, signed disclosure-payload contract across 7 canonical documents. |
| Prisma schema & client | Passed | `npm run db:generate` generated Prisma Client v6.19.0 successfully. |
| TypeScript | Passed | `npx tsc --noEmit` passed with 0 errors across all routes and components. |
| Vitest unit suite | Passed | `npm run test` completed with 10 passed test files and 39 passing tests. |
| Production build | Passed | `npm run build` compiled all routes (static and dynamic) successfully with 0 errors. |
| Playwright E2E suite | Passed | `npm run test:e2e` completed with 5 passing browser tests covering landing, payment flow, and disclosure verification. |
| Dynamic environment config | Passed | All sponsor RPC endpoints (Helius, QuickNode, Alchemy, Ironforge, Shyft, Triton) and server secrets dynamically read from `.env`. |
