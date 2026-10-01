# PayProof correction feedback loop

Use this loop for local, CI, preview, or user-reported failures. It is intentionally evidence-first and safe for privacy-sensitive code.

```text
Signal → reproduce → classify → assign domain → smallest guarded fix
       → focused test → full verification gate → update map/phase record → triage outcome
```

## Triage protocol

| Signal | Owner domain | First action | Stop condition |
| --- | --- | --- | --- |
| Lint, type, unit, or build failure | Agent owning the reported file | Reproduce with the exact command; retain the log | Do not touch unrelated domains. |
| Playwright failure | Public UX or employer-flow agent | Reproduce the named spec and inspect its trace/report | Do not mark a browser flow passed without the browser evidence. |
| Receipt/disclosure privacy regression | Receipt or disclosure agent + security review | Confirm no sensitive value entered logs, URLs, errors, or persistence | Escalate immediately; do not deploy or expose a workaround. |
| RPC/finality failure | Chain-evidence agent | Preserve `pending` or `unverifiable`; capture non-sensitive RPC error | Never coerce a failure to `confirmed`. |
| Dependency/audit finding | Operations agent | Classify runtime vs development dependency and affected package | Do not auto-upgrade lockfiles without tests and release-note review. |
| Planned feature mistaken for shipped | Product/spec agent | Correct docs and UI claim, then add a regression assertion | Do not imply a wallet, API, or deployment integration exists. |

## Feedback record

For every non-trivial failure, add a short record to the relevant phase document or pull-request description:

- Signal and exact command or environment.
- Reproduction result and mapped owner domain.
- Root cause, smallest change, and regression test.
- Fresh focused and full-gate outcomes, or explicit blocked prerequisites.
- Follow-up item only when it is outside the authorized fix.

## Closure criteria

A correction closes only after the original signal is reproduced or its test passes, dependent privacy/finality tests pass, and the relevant map/phase status is accurate. A blocked check remains blocked; it is not a pass.
