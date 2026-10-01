# Phase 1 — Foundation and POC gate

## Scope

This phase establishes a repeatable, test-backed foundation. It does not establish that Token-2022 confidential transfers work on the selected cluster.

## Acceptance criteria

- [x] Persistent agent rules require a small test-first loop and protect the privacy boundary.
- [x] A Cursor `.mdc` rule applies the same loop to Cursor sessions.
- [x] The public runtime configuration rejects an unsupported cluster and invalid RPC URL in unit tests.
- [x] Canonical documentation has an executable contract check for product scope, the no-anonymity claim, and receipt-only fallback.
- [x] The Prisma schema covers the documented wallet identity, receipt, disclosure, and audit-event records without receipt plaintext fields.
- [x] The landing page makes the no-anonymity privacy boundary visible and has a browser smoke test.
- [x] Install dependencies using a Node version supported by the chosen package versions.
- [x] Run the full verification gate and record its exact results here.
- [ ] Run the confidential-transfer devnet acceptance suite with fresh wallets; this is the Phase 1 POC gate, not a documentation-only check.

## Verification record

| Check | Result | Notes |
|---|---|---|
| `npm run test:docs` | Passed | Documentation contract passed for seven canonical documents. |
| `npx tsc --noEmit --incremental false` | Passed | Strict TypeScript check passed. |
| `npm run lint` | Passed | ESLint completed with exit code 0 after the dependency-tree repair. |
| `npm run test` | Passed | Vitest reported 33 passing tests. |
| `npm run build` | Passed | Next.js production build completed successfully. |
| `npm run test:e2e` | Passed | Playwright reported 2 passing browser tests. |

## Dependency decision

The original dependency declarations were not installable in the available Node 22.11.0 runtime: Vitest 5 and Prisma 7 require a newer Node 22 patch release, and `@solana/kit-plugin-rpc@8.3.0` does not exist. The foundation pins compatible Prisma 6.19, Vitest 3.2, ESLint 9.37, and the published `@solana/kit-plugin-rpc@0.19.0`. `package.json` additionally overrides the transitive Commander and eslint-visitor-keys releases that raised their Node floor after these packages were pinned; this keeps the supported runtime at Node 22.11.0 without weakening the product code. Re-evaluate these pins when the runtime is upgraded.
