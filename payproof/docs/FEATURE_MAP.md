# PayProof feature and agent map

This map is the handoff index for coding agents. It distinguishes implemented behavior from planned work; a feature is not complete merely because its specification exists.

## Product context and ICP

PayProof serves crypto-native contractors who need reusable proof of income, small crypto agencies or DAOs that issue it, and a lender, landlord, or service provider that verifies only contractor-authorized fields. The product promise is **“Share income, not wallet history.”** It is not payroll, custody, lending, a credit score, or anonymous payments.

## Ownership map

| Agent domain | Owns | Current state | Primary evidence | Required guardrail |
| --- | --- | --- | --- | --- |
| Product/spec agent | `../../prompts-directory/{PRD,POC,APP_FLOW,IMPLEMENTATION_PLAN}.md` | Source of truth | `scripts/verify-docs.mjs` | Stop on conflicts; do not expand P0. |
| Public UX agent | `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`, `tests/landing.spec.ts` | Landing page implemented | Playwright landing test | State the no-anonymity boundary visibly. |
| Configuration/security agent | `src/lib/runtime-config.*`, `src/lib/server-config.ts`, `next.config.ts`, `.env.example` | Public configuration validation implemented; server config reader exists | `runtime-config.test.ts` | `NEXT_PUBLIC_*` values are public only; secrets are server-only and never committed. |
| Employer-flow agent | `src/app/employer/payments/new/page.tsx`, `src/features/payments/payment-form.tsx`, `src/lib/{payment-request,wallet-session,token-2022-transfer}.*` | Phantom-bound review and labelled standard Token-2022 fallback submission implemented; finality polling and receipt handoff remain pending | matching Vitest tests, `tests/payment-flow.spec.ts` | Never transmit review plaintext before browser encryption exists. |
| Chain-evidence agent | `src/lib/chain-verification.*`, `src/lib/confidential-capability.*` | Finality reducer and labelled receipt-only fallback implemented | matching Vitest files | RPC failure, partial finality, wrong participant, or wrong mint cannot be valid. |
| Receipt agent | `src/lib/{receipt,receipt-creation,receipt-envelope}.*` | Canonical payload, digest, signature verification, finalized-evidence draft, and browser envelope crypto implemented; signing/persistence handoff remains pending | matching Vitest files | Receipt plaintext stays client-side until encrypted; no wallet key handling. |
| Disclosure agent | `src/lib/disclosure.*` | Pure token-hash, expiry, revocation, consumption, and allowed-field validation implemented; encrypted, signed disclosure-payload contract defined | `disclosure.test.ts` | Invalid, expired, revoked, or consumed disclosures expose no fields. |
| Persistence/API agent | `prisma/schema.prisma`, planned route handlers | Disclosure schema stores encrypted, signed payloads plus allowlisted field names; auth, upload, ownership checks, and public verification route are not implemented | Prisma generation/migration plus future route tests | Store encrypted envelopes and encrypted, signed disclosure payloads; never receipt plaintext. |
| Operations agent | `package.json`, `playwright.config.ts`, `.github/workflows/codebase-health.yml` | Local commands and scheduled CI defined | CI logs and generated artifacts | Never use production secrets or claim deployment health without a configured URL. |
| Validation agent | `docs/phase-4-human-validation.md`, affected UX route/tests | Moderated-study kit documented; participant research has not started | Phase 4 session records and affected Vitest/Playwright tests | Never fabricate participant results or retain personal, wallet, receipt, or disclosure-secret data. |

## Feature lifecycle map

| Feature | Entry point | Domain modules | Status | Next verifiable slice |
| --- | --- | --- | --- | --- |
| Explain privacy boundary | `/` | `src/app/page.tsx` | Implemented | Keep browser assertion for boundary copy. |
| Employer payment review | `/employer/payments/new` | `payment-form.tsx`, `payment-request.ts`, `wallet-session.ts`, `token-2022-transfer.ts` | Phantom-bound review and fallback transaction submission implemented; must execute against funded Devnet accounts | Poll finalized RPC evidence, then create the encrypted receipt. |
| Transaction confirmation | Planned submission step | `chain-verification.ts` | Pure gate implemented; RPC client absent | Fetch configured RPC evidence and test finalized/pending/unverifiable states. |
| Signed receipt creation | Planned after confirmation | `receipt.ts`, `receipt-creation.ts` | Pure draft implemented; wallet signing/encryption absent | Browser-sign canonical receipt then encrypt before API submission. |
| Encrypted receipt storage | `POST /api/receipts` (planned) | Prisma `Receipt`, `receipt-envelope.ts` | Browser envelope crypto exists; storage API is not implemented | Persist only encrypted envelope and opaque metadata; test plaintext rejection. |
| Contractor receipt vault | `/contractor/receipts` (planned) | Browser decryption module (planned) | Not implemented | Wallet-match and no-key recovery tests. |
| Selective disclosure | `/contractor/receipts/:id/share` (planned) | `disclosure.ts` | Pure validation implemented; encrypted, signed payload persistence contract defined; issuance/UI absent | Issue a one-time hashed token with an explicit field list and expiry. |
| Public verification | `/verify/:token` (planned) | disclosure + receipt + RPC modules | Not implemented | Test valid, expired, revoked, consumed, and RPC-unverifiable responses; render only allowlisted fields from the encrypted, signed disclosure payload. |
| Human validation | Moderated devnet sessions (planned) | `docs/phase-4-human-validation.md` | Study kit ready; no sessions recorded | Conduct consented sessions, document actual evidence, then prioritize and test the top three confirmed usability failures. |

## Agent handoff contract

1. Read this map plus the domain's source, test, and linked product document before changing code.
2. Assign one primary agent domain per change. Cross-domain work requires an explicit handoff note naming both owners and the shared invariant.
3. Add or update the closest automated test before behavioral code.
4. Run the PayProof verification skill's required checks and record blockers exactly.
5. Update this map when a status, route, module, test, or ownership boundary changes.
