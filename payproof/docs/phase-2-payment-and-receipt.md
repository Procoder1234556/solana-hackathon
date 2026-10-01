# Phase 2 — Employer payment and receipt workflow

## Scope

Phase 2 implements the employer-side payment review boundary and the pure receipt-creation workflow. It does not claim that a payment was made, does not handle a wallet key, and does not persist receipt plaintext.

## Acceptance criteria

- [x] The employer form validates a recipient public key, positive decimal amount, Token-2022 mint, payment period, and optional invoice reference before review.
- [x] The review screen displays the immutable payment facts before a wallet-signing action.
- [x] The UI labels the currently unproven confidential-transfer path as the non-confidential receipt fallback and states that participant wallets remain public.
- [x] A receipt draft is created only when RPC evidence is finalized and includes the expected issuer, recipient, and mint.
- [x] Receipt creation produces a canonical payload and SHA-256 hash for the caller to sign and encrypt client-side.
- [x] Unit tests cover Solana public-key validation, wallet-session validation, exact Token-2022 unit conversion, finalized-evidence gating, and browser-envelope encryption.
- [ ] Bind the employer's connected wallet to the review and submit the supported transfer plan. The browser implementation now binds Phantom's connected public key and builds/submits the labelled non-confidential Token-2022 fallback; it still needs a funded devnet execution test.
- [ ] Poll configured RPC after submission, show pending/confirmed/failed state, and provide the devnet explorer link.
- [ ] Sign the receipt through the employer wallet, encrypt the signed payload in the browser, and store only the envelope and opaque metadata through `POST /api/receipts`.
- [ ] Reject a duplicate invoice reference for the same employer and contractor at the persistence boundary.

## Privacy boundary

`createPaymentReview` and `createReceiptDraft` are local, pure functions. The resulting payload is intentionally not sent to an API. A later browser-only encryption step must encrypt the receipt before persistence; server code must accept the encrypted envelope and opaque metadata only.

## Verification record

| Check | Result | Notes |
|---|---|---|
| Focused/full Vitest suite | Passed | 33 tests passed on 2026-10-01, including the payment, wallet, Token-2022 unit conversion, and envelope suites. |
| TypeScript check | Passed | `npx tsc --noEmit --incremental false` passed on 2026-10-01. |
| Lint | Passed | `npm run lint` completed with exit code 0 on 2026-10-01. |
| Build | Passed | `npm run build` completed successfully on 2026-10-01. |
| Playwright flow | Passed | `npm run test:e2e` completed with two passing browser tests on 2026-10-01. |

Do not mark the incomplete wallet, RPC, encryption, or persistence steps as complete until their tests run against a complete dependency installation and the configured devnet environment.
