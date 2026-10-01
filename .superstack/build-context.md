# PayProof build context

## Stack decisions

- Architecture: Next.js web dApp with server-side API routes; no custom on-chain program for P0.
- Starter: current official Next.js App Router scaffold. The current `create-solana-dapp` CLI is incompatible with the environment's Node 22 runtime (`ERR_REQUIRE_ESM`), so Solana Kit is integrated directly.
- Chain: Solana devnet, `@solana/kit`, Token-2022 confidential transfers.
- Wallet: Phantom Browser SDK first, isolated behind a provider boundary.
- Data: PostgreSQL with Prisma; encrypted receipt envelopes only.
- Quality: ESLint, Vitest, Playwright.
- Documentation: Context7 verified current Next.js, Prisma, and Solana confidential-transfer guidance on 2026-09-26.

## Build status

- mvp_complete: false
- tests_passing: false
- devnet_deployed: false
- confidential_transfer_poc: pending
