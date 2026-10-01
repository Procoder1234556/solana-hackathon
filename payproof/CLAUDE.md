# PayProof

Private income proof for crypto-native contractors. This is a Next.js App Router application using strict TypeScript.

## Non-negotiable security and privacy rules

- Never handle wallet private keys or seed phrases.
- Plaintext receipt amounts, periods, invoice references, and disclosure tokens must not reach server logs, analytics, URLs, or error responses.
- Token-2022 Confidential Balances protect amounts and balances, not account participation. Never describe payments as anonymous.
- A receipt is valid only after the expected transaction has reached the required commitment level through the configured RPC.
- Keep confidential-transfer work isolated behind a capability boundary. If the POC cannot reproduce it on devnet, ship the explicitly labelled non-confidential receipt fallback.

## Architecture

- `src/app`: routes and route handlers.
- `src/features`: domain-oriented UI and application code.
- `src/lib`: narrow integrations for Solana RPC, wallet verification, cryptography, persistence, and canonical serialization.
- `prisma`: database schema and migrations.
- `tests`: Vitest unit/integration tests and Playwright end-to-end tests.

## Commands

- `npm run dev`
- `npm run lint`
- `npm run test`
- `npm run test:e2e`
- `npm run db:migrate -- --name <migration-name>`

Copy `.env.example` to `.env.local` and supply development-only values before running data-dependent routes.
