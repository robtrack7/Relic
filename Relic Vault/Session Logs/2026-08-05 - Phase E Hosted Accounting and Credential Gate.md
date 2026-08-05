---
status: blocked
authority: secondary
scope: operations
depends_on:
  - "[[59 - Phase E Loom Operating Layer Plan]]"
  - "[[23 - AI Task Registry]]"
  - "[[25 - Pricing and Rate Limits]]"
source_file: "Relic Vault/Session Logs/2026-08-05 - Phase E Hosted Accounting and Credential Gate.md"
---

# Phase E Hosted Accounting and Credential Gate

## Accomplished

- Raised the explicitly authorized Phase E provider stop to `$4.00`, with `$0.25` conservatively reserved and `$3.74` enforced by the remaining temporary proxy.
- Brought `relic-staging` through the committed E4-E10 migrations and the new provider-accounting migration, then aligned hosted migration history with the repository versions.
- Added a private, payload-free, idempotent row for every successful provider completion before parsing or validation. Run totals now accumulate initial/repair tokens and cost and survive later validation or persistence failure.
- Added conservative GPT-5.6 list-price estimation when the proxy omits cost, an explicit cost-completeness stop, separate started/completed call ceilings, and exact-redelivery protection.
- Pinned provider reasoning effort to `none` for `relic-fast` and `low` for `relic-balanced`/`relic-deep`; accepted only equivalent provider-qualified resolved-model IDs.
- Captured payload-free run/event/failure evidence before hosted cleanup, allowing the provider rejection to be diagnosed without retaining prompt or output data.

## Hosted Result

- The revised worker reached the provider but stopped at `provider_rejected` before any completion.
- A separate 16-token compatibility probe against the same protected key returned `401 missing_scope`, proving the key cannot write Chat Completions.
- No successful provider completion, provider tokens, model output, product usage event, draft, action, canon write, or embedding was produced.
- Every synthetic row and temporary Fly app was removed. Original provider secrets, gateway JWT verification, and both dispatch schedules were restored; queues are empty.

## Verification

- Clean local migration replay passed.
- Full database suite passed: 38 files / 1,080 assertions, including 19 new provider-accounting assertions.
- Full script/runtime suite passed: 101/101.
- Web TypeScript/lint and all 152 component tests passed; the production Next.js build completed successfully.
- Repository verification and touched-vault link/stale-term checks passed; local database lint reported only the pre-existing warnings.
- Staging security/performance advisors added no security finding for the new ledger/function; the unused fresh ledger index appears as the expected pre-use informational notice.

## Open Follow-up

- Replace `OPENAI_API_KEY` in the ignored protected provider state with a project key that has write permission for `/v1/chat/completions`. Do not commit or print the key.
- Rerun the already authorized six-task hosted smoke under the existing `$4.00` total stop, `$0.25` reserve, `$3.74` remaining proxy budget, and twelve-completion ceiling.
- Phase E and its goal remain open until that hosted evidence passes.

Back to [[50 - Session Log Index]].
