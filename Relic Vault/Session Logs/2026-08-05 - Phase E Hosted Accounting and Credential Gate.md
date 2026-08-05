---
status: complete
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

- Executed the explicitly authorized Phase E provider gate below its `$4.00` stop, with the final cumulative retry envelope reduced to a `$0.50` reserve plus `$3.49` isolated-proxy cap.
- Brought `relic-staging` through the committed E4-E10 migrations and the new provider-accounting migration, then aligned hosted migration history with the repository versions.
- Added a private, payload-free, idempotent row for every successful provider completion before parsing or validation. Run totals now accumulate initial/repair tokens and cost and survive later validation or persistence failure.
- Added conservative GPT-5.6 list-price estimation when the proxy omits cost, an explicit cost-completeness stop, separate started/completed call ceilings, and exact-redelivery protection.
- Pinned provider reasoning effort to `none` for `relic-fast` and `low` for `relic-balanced`/`relic-deep`; accepted only equivalent provider-qualified resolved-model IDs.
- Aligned the six provider-facing nested output contracts with their locked validators while preserving model ceilings; compact light-workshop/scaffold behavior reduced avoidable repair cost.
- Added allowlisted validation categories plus compact failed-run/cumulative accounting evidence without retaining prompts or outputs.
- Added migration `20260805220000` and worker support so a successful schema repair projects `repair_attempts = 1` as well as its already-authoritative per-completion cost ledger.

## Hosted Result

- `PHASE_E_HOSTED_ISOLATED_SMOKE_OK` and `PHASE_E_HOSTED_TASK_FAMILY_SMOKE_OK` passed on `relic-staging`.
- All six current tasks completed against the pinned Luna/Sol/Terra aliases: workshop plan, full Saga scaffold, one section regeneration, sourced Loom answer with bounded plan, full Session Prep, and substantial entity proposal.
- Six logical runs produced six usage events and eight provider completions, below the twelve-call ceiling. The conservative successful-run cost estimate was `$0.153853625` and complete for every call.
- Exact replay added no provider call, usage event, or cost. Proof state contained exactly one source-linked pending non-canon draft and zero canon audits, action intents, query embeddings, embedding events, outside-source matches, unsafe telemetry matches, or raw payload keys.
- Cleanup removed the draft and every synthetic row, restored prior staging provider secrets, JWT verification, both schedules, and the prior ignored local provider credential, and destroyed the temporary Fly app. Both queues are empty and no temporary secret/smoke file remains.

## Verification

- Clean local migration replay passed.
- Full database suite passed: 38 files / 1,084 assertions, including 23 provider-accounting assertions.
- Full script/runtime suite passed: 101/101.
- Web TypeScript/lint and all 152 component tests passed; the production Next.js build completed successfully.
- Repository verification and touched-vault link/stale-term checks passed; local database lint reported only the pre-existing warnings.
- Staging security/performance advisors added no finding for the new repair-aware checkpoint overload; reported warnings remain pre-existing project-wide items.
- Staging migration `20260805220000` is present; the repair-aware checkpoint overload exists, is executable by `service_role` only, and is denied to anonymous/authenticated roles. `ai-task-runner` v89 is active with JWT verification enabled.

## Follow-up

- Revoke the temporary testing key because it was transmitted through chat; it is no longer installed in Relic's local provider state.
- Begin F1 — Settings, retention, and quota recovery. Preserve the Phase E hosted harness as an explicitly reauthorized milestone test, not a routine regression.

Back to [[50 - Session Log Index]].
