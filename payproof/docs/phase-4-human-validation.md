# Phase 4 — Human validation

## Status

The moderated-study kit is ready. **No sessions have been recorded yet.** Recruitment, participant consent, session facilitation, and any resulting product changes require real participants and must be recorded here as they occur. Do not fabricate pilot numbers, completion rates, quotes, findings, or fixes.

## Goal and boundaries

Validate whether crypto contractors can create a selective disclosure without assistance and can accurately explain its privacy boundary. This phase does not validate lending, identity, creditworthiness, payroll, custody, or anonymous payments.

The study must use the current devnet POC only. Participants must be told that confidential-transfer capability remains unproven unless a completed Phase 1 POC record says otherwise. Wallet accounts and transaction participation may remain public; the product never promises anonymous payments.

## Recruitment target

Recruit 10 crypto contractors paid in crypto for moderated usability sessions and conduct three discovery interviews with agency or DAO operators. Track outreach separately from participation; an invitation, RSVP, or partial session is not a completed session.

## Moderator protocol

1. Confirm the participant is at least 18 and uses a test wallet or a fresh devnet wallet. Never request a seed phrase, private key, funded-wallet access, receipt plaintext, invoice reference, or live disclosure link.
2. Ask for consent to take notes. Ask separately before attributing or publishing a quote; record whether attribution was approved.
3. Read this task verbatim: “Show how you prove payment without sharing your entire wallet.”
4. Ask the participant to complete the contractor disclosure journey using only the selected test receipt and a 24-hour link.
5. Ask: “What can this verifier see?” Then ask: “What would make you trust or refuse this receipt?”
6. Record whether the participant completed the flow unassisted, elapsed time, observed confusion, recovery attempts, and any privacy-boundary misunderstanding. Do not record the receipt’s private fields or disclosure secret.
7. Close by explaining that the verifier receives only contractor-selected fields, link validity is limited by expiry and revocation, and payment participation may still be public on-chain.

## Completion definition

A contractor session counts as completed only when the participant both:

- issues a test selective disclosure without moderator intervention; and
- correctly explains that the verifier sees only selected fields, not their full wallet history.

An operator interview counts as completed only when the operator discusses how they would issue or evaluate a payment proof and its actual privacy boundary. Do not count a recruitment conversation as either type of completed study.

## Session record template

Copy this table for each completed or attempted session. Use a generated participant ID; do not enter names, wallet addresses, email addresses, transaction signatures, receipt fields, or disclosure tokens.

| Field | Record |
| --- | --- |
| Participant ID | `C-01` or `O-01` |
| Role | Contractor or agency/DAO operator |
| Date and environment | Date, browser/device, devnet POC version |
| Consent to notes | Yes/No |
| Consent to attribute a quote | Yes/No/not requested |
| Session status | Attempted, completed, stopped, or declined |
| Disclosure completed unassisted | Yes/No/not applicable |
| Time to disclosure | Duration or not completed |
| Privacy boundary explained correctly | Yes/No/not applicable |
| Observed confusion | Neutral description; no private payment facts |
| Verbatim quote | Only when quote consent is Yes; otherwise paraphrase |
| Follow-up candidate | Usability, privacy language, or out of scope |

## Finding triage and fixes

After every session, add a finding only when it describes an observable behavior, task failure, or repeated misunderstanding. Do not infer user intent from one comment.

| Finding ID | Evidence | Severity | Owner | Decision | Verification |
| --- | --- | --- | --- | --- | --- |
| `F-01` | Add session IDs and neutral observation | Critical, high, medium, or low | Domain from `FEATURE_MAP.md` | Fix, defer, or out of scope | Link to a regression test or recorded rationale |

Prioritize the top three confirmed usability failures by user impact and recurrence. Before changing product behavior, add a focused automated test, run it red, implement the smallest fix, then run the required verification gates. For a privacy-language issue, update the user-facing copy and its browser assertion. Do not mark a finding fixed until its verification is recorded.

## Reporting

At the end of Phase 4, report the exact counts of attempted and completed contractor sessions and operator interviews; median task time among completed sessions; the number who completed unassisted; the number who explained the privacy boundary correctly; consented quotes; the three prioritized findings; and the evidence for each fix. If any target is missed, state the shortfall and why. Never extrapolate a metric from unrecorded sessions.

## Phase gate

- [x] Recruitment, consent, moderation, recording, and finding-triage protocol documented.
- [ ] Ten contractor sessions completed and recorded.
- [ ] Three agency/DAO operator interviews completed and recorded.
- [ ] Completion, time, confusion, and consented-quote evidence summarized without personal or payment data.
- [ ] Top three confirmed usability failures fixed and verified, or explicitly deferred with rationale.

## Verification record

| Check | Result | Evidence |
| --- | --- | --- |
| Documentation contract | Passed | `npm run test:docs` confirmed all seven canonical documents, including this Phase 4 protocol. |
| Lint | Passed | `npm run lint` exited successfully after the protocol and documentation-map changes. |
| TypeScript | Passed | `npx tsc --noEmit --incremental false` exited successfully. |
| Unit suite | Passed | `npm run test` reported 10 passing files and 33 passing tests. |
| Production build | Passed | `npm run build` completed successfully. |
| Playwright | Not run | No interactive product flow changed; this phase adds research documentation only. Run the affected browser test before any finding-driven UI change. |
