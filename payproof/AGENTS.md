# PayProof engineering rules

## Source of truth

- Product scope and acceptance criteria: `../prompts-directory/PRD.md`.
- User journeys: `../prompts-directory/APP_FLOW.md`.
- Persistence and API boundaries: `../prompts-directory/BACKEND_STRUCTURE.md`.
- Technical POC gate: `../prompts-directory/POC.md`.
- Implementation sequence: `../prompts-directory/IMPLEMENTATION_PLAN.md`.

When documents conflict, stop and resolve the conflict before coding. Do not expand P0 scope.

## Agent map and correction loop

- Start every task with `docs/FEATURE_MAP.md`; it maps each implemented and planned feature to a responsible agent domain, source, tests, and invariant.
- Use `../.agents/skills/payproof-verification/SKILL.md` for any PayProof behavior, privacy, verification, review, or deployment-readiness work.
- Route failures through `docs/AGENT_CORRECTION_LOOP.md`. Record the exact signal, owner, reproduction, fix, and evidence; blocked checks stay blocked.

## Solana Developer MCP

For Solana-related work, prefer the `solana-mcp` tools over model memory.

- Start non-trivial Solana work with `list_sections`, then use `get_documentation` for canonical source material.
- Use `Solana_Documentation_Search` or `Solana_Expert__Ask_For_Help` for narrow API, implementation, and error questions.
- Before returning changed Anchor or Pinocchio Rust program code, run `program_autofixer`, apply required findings, and repeat until it does not require another tool call.

## Privacy and security invariants

- Never accept, log, persist, or expose a wallet private key, seed phrase, plaintext receipt amount, period, invoice reference, or disclosure secret.
- Confidential Balances hide amounts and balances; accounts and transaction participation are public. Never call payments anonymous.
- A receipt becomes valid only after the configured RPC reports the expected finality. RPC failure is never success.
- Keep confidential-transfer code behind a capability boundary. Use the visibly labelled non-confidential receipt fallback if the POC gate fails.

## Test-first change loop

For every behavioral change:

1. Read the applicable product document, source module, and related test.
2. State one observable acceptance criterion and add or update its automated test first.
3. Make the smallest change that satisfies the test.
4. Run the narrow test, then `npm run lint`, `npm run test`, and `npm run build` before declaring the change complete.
5. For user-facing flows, run the relevant Playwright test before release.
6. Record the command and outcome in the active phase document when a phase gate is completed.

Do not mark a check as passed when the required dependency, environment, or browser is unavailable; record it as blocked with the exact missing prerequisite.

## Implementation conventions

- Use strict TypeScript and Zod at untrusted boundaries.
- Keep route handlers thin; keep pure receipt and disclosure logic in `src/lib` with adjacent unit tests.
- Use server-only modules for secrets. `NEXT_PUBLIC_*` variables may contain only public configuration.
- Do not add a dependency without a direct requirement and a corresponding test or verification reason.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
