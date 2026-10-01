# Phase 3 — Disclosure and verification workflow

## Resolved persistence contract

A contractor creates a versioned payload containing only the receipt fields they explicitly selected, the disclosure expiry, and the contractor signature. The browser encrypts this payload before upload. The database stores its ciphertext, detached signature, version, token hash, field-name allowlist, expiry, and revocation/consumption state; it never stores receipt plaintext.

The verification route may decrypt the payload only after token matching, expiry, revocation, consumption, signature, and transaction-finality checks succeed. Its response contains only the signed payload's field-name allowlist. Invalid, expired, revoked, consumed, or RPC-unverifiable disclosures return no payload fields.

## Acceptance criteria

- [x] The data model supports an encrypted, signed disclosure payload without persisting receipt plaintext.
- [ ] Contractor vault decrypts a receipt locally and verifies the connected wallet before disclosure.
- [ ] Contractor selects fields and a 24-hour, 72-hour, or seven-day expiry, then copies or revokes a one-time link.
- [ ] The verifier route checks the one-time token, payload signature, expiry, revocation, consumption, and finalized transaction evidence before rendering selected fields.
- [ ] Unit tests cover valid, expired, revoked, consumed, tampered, and RPC-unverifiable disclosure states.
- [ ] Browser E2E covers disclosure, verification, revocation, and post-revocation verification.

## Privacy boundary

The disclosure payload is encrypted before it reaches persistence. It may include only fields a contractor selected for that disclosure. Receipt amount, period, invoice reference, and disclosure token must never appear in database plaintext, request logs, analytics, URLs, or error responses.

## Verification record

| Check | Result | Evidence |
| --- | --- | --- |
| Documentation contract | Passed | `npm run test:docs` confirms the encrypted, signed disclosure-payload contract. |
| Prisma schema | Passed | `DATABASE_URL=postgresql://payproof:payproof@localhost:5432/payproof npx prisma validate` validates the schema without connecting to a database. |
| TypeScript and unit suite | Passed | `npx tsc --noEmit` and `npm run test` completed; Vitest reported 33 passing tests. |
| Production build | Passed | `npm run build` completed after removing the stale derived `.next/lock` with no active build process. |
| Lint | Blocked | `npm run lint` reproduces an `eslint-plugin-react` / `side-channel` runtime error while loading `react/display-name`, before project source is linted. Owner: Operations. Follow-up: review the committed dependency graph and lockfile; do not upgrade dependencies automatically. |
