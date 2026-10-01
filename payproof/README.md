# PayProof

## Share income, not wallet history.

PayProof lets a crypto-native contractor selectively disclose payment-backed, tamper-evident income evidence. It is not a payroll platform, lender, credit score, or custody product.

Confidential Balances can hide amounts and balances; payments are not anonymous. Wallet accounts and transaction participation may remain public.

## Phase 1 status

The foundation includes strict TypeScript, public runtime configuration validation, a database schema, test configuration, a browser smoke test, and a documentation contract check. The confidential-transfer POC is **not proven**. Until it passes the devnet acceptance tests, use only the visibly labelled non-confidential receipt fallback.

## Phase 2 status

The employer payment-review route is available at `/employer/payments/new`. It validates payment facts locally and creates a review record only; wallet signing, finality polling, browser encryption, and encrypted-envelope persistence remain gated on their documented devnet and database integrations. See [`docs/phase-2-payment-and-receipt.md`](docs/phase-2-payment-and-receipt.md).

## Phase 4 status

The consented moderated-study protocol and zero-data session record are ready in [`docs/phase-4-human-validation.md`](docs/phase-4-human-validation.md). No participant sessions, pilot metrics, or findings have been recorded; they must be collected with real participants and reported without personal, wallet, receipt, or disclosure-secret data.

## Getting started

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Never place a secret in a `NEXT_PUBLIC_*` variable.

## Verification loop

Every behavioral change starts with an automated test. Run the focused test, then the full gate:

```bash
npm run test:docs
npm run lint
npm run test
npm run build
npm run test:e2e
```

`test:e2e` requires the Playwright browser: `npx playwright install chromium`.

## Documentation

- Product and acceptance criteria: [`../prompts-directory/PRD.md`](../prompts-directory/PRD.md)
- POC gate and acceptance tests: [`../prompts-directory/POC.md`](../prompts-directory/POC.md)
- API and persistence boundary: [`../prompts-directory/BACKEND_STRUCTURE.md`](../prompts-directory/BACKEND_STRUCTURE.md)
- Delivery sequence: [`../prompts-directory/IMPLEMENTATION_PLAN.md`](../prompts-directory/IMPLEMENTATION_PLAN.md)

## Environment and data handling

`.env.example` documents configuration names only. Do not commit `.env.local`, wallet keys, seed phrases, funded devnet keypairs, receipt plaintext, or disclosure tokens.

The planned database schema stores public keys, transaction and receipt hashes, encrypted receipt envelopes, and hashed disclosure tokens. It must never store plaintext receipt amounts, periods, invoice references, or disclosure tokens.
