---
name: payproof-verification
description: Verify or change PayProof's payment-proof workflow, privacy boundary, disclosure logic, or release readiness. Use for any PayProof implementation, bug fix, review, or deployment check.
---

# PayProof verification

PayProof is a devnet POC for selective income proof. Treat its privacy and finality claims as product-critical: payment participation can remain public; a receipt is never valid until the configured RPC reports the expected transaction as finalized.

## Load the smallest relevant context

- Product and acceptance criteria: `prompts-directory/PRD.md` and `prompts-directory/POC.md`.
- User journey: `prompts-directory/APP_FLOW.md`.
- API and persistence constraints: `prompts-directory/BACKEND_STRUCTURE.md`.
- Current implementation map and status: `payproof/docs/FEATURE_MAP.md`.
- Feature-specific acceptance criteria: `payproof/docs/phase-*.md`.

## Required checks

1. State the observable acceptance criterion and identify the matching unit or browser test before editing behavior.
2. Preserve these invariants: no wallet private keys, seed phrases, plaintext receipt fields, or disclosure secrets in server storage, logs, URLs, analytics, or errors; the non-confidential fallback remains visibly labelled; RPC errors cannot result in a valid receipt.
3. Run the narrow affected test, then from `payproof/` run:

   ```powershell
   npm run test:docs
   npm run lint
   npx tsc --noEmit
   npm run test
   npm run build
   ```

4. For a changed user flow, also run its Playwright test. If Chromium or a required devnet/database dependency is unavailable, record the check as blocked with its exact prerequisite; never describe it as passed.
5. Update the applicable phase document and `FEATURE_MAP.md` when the implementation status, route, owner, or test mapping changes.

## Correction loop

When a check fails, use `payproof/docs/AGENT_CORRECTION_LOOP.md`: reproduce the failure, assign it to the mapped agent domain, make the smallest guarded fix, and rerun the failed command plus its dependent gates. Do not widen scope to unimplemented wallet, encryption, persistence, or disclosure routes without an explicit request.
