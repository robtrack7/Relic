---
date: 2026-07-22
packet: E2
status: complete
---

# Hosted Provider and Observability Gate

Linked from [[50 - Session Log Index]]. The active contracts are [[21 - Tech Architecture]], [[22 - Memory and Retrieval]], [[23 - AI Task Registry]], and [[25 - Pricing and Rate Limits]].

## Hosted readiness audit

- Inspected the completed E1 commit and [[Session Logs/2026-07-21 - Embedding and Re-embedding Delivery]], root plan/gap ledger, architecture, memory/retrieval, AI registry, quotas, deployment, security, worker/runtime, transcription, embedding, and AI runner paths.
- Preserved unrelated deleted/replacement Claude design files, `.tmp/`, `CLAUDE.md`, and `Untitled.base` without staging or modifying them.
- Confirmed E1 used a local Supabase worker/database against hosted development Fly app `relic-llm-dev`; this is not staging evidence.
- The initial audit found only `relic-embed` → `text-embedding-3-small`; the later authorized deployment added explicit transcribe/fast/balanced/deep mappings with no fallback.
- The initial CLI audit had no hosted Supabase authentication. The connected Supabase account and authenticated Fly CLI subsequently supplied project/database/function and proxy access, but no callable Supabase secret-setting interface.
- The initial audit made no hosted mutation or provider call. Authorized deployment evidence is recorded below.

## Provider-independent E2 work

- Added an additive service-only provider event ledger with fixed safe fields, indexes, metadata allowlisting, and browser-role revocation.
- Added operational summary and alert RPCs for event/queue state, alias/model routing, p95 queue/provider/end-to-end latency, cron state, failures, dead letters, stranded work, mismatch, quota denial, hosted deterministic mode, missing execution, duplicate metering, and sensitive-field rejection.
- Added shared Edge observability across generic workers, embeddings, transcription, hybrid fallback, and AI tasks. Logs and database events omit raw failures and all prompts, transcript/import/source text, audio, provider bodies, vectors, credentials, tokens, cookies, and signed URLs.
- Hardened hosted provider configuration: explicit environment/live mode, canonical alias, resolved-model provenance, LiteLLM-only hosted credentials, bounded timeouts, unexpected-model rejection, and no production deterministic fallback.
- Completed strict registry schema validation for the bounded light smoke `propose_thread_complication`; retained `synthesize_session` as the existing deep smoke.
- Completed AI-run exact replay short-circuiting so an already-complete run does not make another provider call.
- Added `docs/E2_HOSTED_READINESS.md` with non-secret environment evidence, secret placement, functions, schedules, smoke/cost ceiling, rollback, and Decision Stop requirements.

## Verification

- Clean `supabase db reset` replay passed through every repository migration, including both E2 migrations.
- Full pgTAP: 26 files and 763 assertions passed; the E2 observability file passed all 54 assertions.
- Script/runtime suite: 40 tests passed, including hosted-mode fail-closed, alias/model mismatch, redaction, protected hosted-runner handling, worker boundaries, and E1 embedding regressions.
- Web: TypeScript lint passed, 27 test files/123 tests passed, and the Next.js production build passed.
- Every E2 Edge route compiled and reached the internal-auth boundary in the local Supabase runtime.
- The accepted E1 retrieval evaluation remains green: recall@5 1.0, MRR 0.96, zero isolation failures, and lexical fallback success 1.0. A current rerun was blocked only by the local Docker named-pipe sandbox after the clean reset; the embedding/retrieval pgTAP contracts passed in the 763-assertion suite.
- Repository verification passed; the production browser static bundle had zero sensitive-identifier hits, and the scoped diff/history scans had zero credential-shaped hits.
- `supabase db lint --local` reported no E2 findings; four pre-existing warnings remain in older quota/transcription functions.
- Initial external calls: **0**. Later provider-authentication probes are recorded below.
- Hosted usage/latency results: no successful inference yet.

## Historical environment gate

At this earlier checkpoint E2 remained incomplete. The bounded application smoke had been rejected before process start because the Codex execution environment exhausted its tool allowance, and the staging migration ledger still needed reconciliation. Both gates were later resolved; the completion evidence is recorded below.

## Connected-account follow-up

- The Supabase connector initially found the free-plan `RELIC` organization and no projects; the authorized `relic-staging` project was subsequently created at `$0/month`.
- The authenticated Fly account contains only `relic-llm-dev` in `iad`. Its 2 GB Machine remains autostop/autostart-enabled; release 5 now carries the E2 alias configuration.
- Fly secret-name inventory contains `LITELLM_MASTER_KEY` and `OPENAI_API_KEY`; no values were read or displayed.
- GitHub has no Environment, Actions secret/variable, or deployment record for staging.
- The temporary approved E2 proxy exposes `relic-transcribe`, `relic-embed`, `relic-fast`, `relic-balanced`, and `relic-deep` with explicit OpenAI-only mappings and no fallback: Whisper 1, `text-embedding-3-small` at 1536 dimensions, and GPT-5.6 Luna/Terra/Sol.
- A local Fly CLI was installed from Fly's official installer to use the existing authenticated credential file. This changed only local tooling.
- The AI runner now atomically claims/leases, checkpoints validated provider output, bounds retries, preserves idempotent metering/output, dead-letters safe metadata, resets stalled work, and prevents replay over complete/newer output. The five-minute watchdog is active in staging.

## Authorized hosted deployment

- Created Supabase `relic-staging` (`scagegrrilvrpuilthzz`) in `us-east-1`; it is active/healthy and contains no Auth users, Storage objects, jobs, drafts, usage events, canon audit rows, or provider events.
- Applied all 41 repository migrations in order, then ran all 26 pgTAP files against hosted Postgres with assertion failures configured to throw. All passed; the temporary pgTAP extension was removed afterward.
- Deployed `issue-scoped-jwt`, `transcribe-session`, `embed-row-dispatch`, `hybrid-search`, and `ai-task-runner`. Unauthenticated probes fail closed with `internal_token_not_configured` before database, Storage, proxy, or provider access.
- Deployed Fly release 5 with the pinned LiteLLM image and five aliases. Public liveness and authenticated alias inventory pass. The machine was returned to stopped/autostart state after checks.
- Active schedules include `relic-finalize-stage-sessions`, the five-minute `relic-ai-task-watchdog`, and daily `relic-prune-provider-events`. The database-native alert view correctly reports the three still-missing provider dispatch schedules/executions.
- The hosted operational summary and alerts are service-only. Browser roles have no direct internal-schema table or function privileges; public E2 tables retain RLS and no browser mutation grants.
- Supabase security advisors report zero errors. Remaining warnings are the catalogued mutable-search-path advisory on unprivileged helpers and intentional browser-callable scoped `security definer` RPCs; every privileged public definer has a fixed `search_path`.
- The static fixture view is now `security_invoker=true`. No production environment or user data was touched.

## Provider and cost evidence

- Official OpenAI documentation confirms the deployed GPT-5.6 Luna/Terra/Sol model identifiers and current tier roles/pricing.
- The OpenAI project had a user-managed hard `$5` ceiling; the initial E2 authorization stopped at 12 inference calls or `$1` and was later explicitly raised to 40 attempts while retaining both monetary caps.
- One early model-list request returned 403, consistent with a restricted key. Three inference attempts using the superseded key authenticated to LiteLLM but returned upstream OpenAI authentication failure before generation.
- After replacement, one tiny balanced inference succeeded. Cumulative inference attempts: **4**; successful inference calls: **1**; successful token usage: **20**. Application usage events/drafts/canon writes remain **0**.
- Fly log classification found one upstream authentication error and zero proxy-invalid-key events. Safe-log scans found zero prompt fixture text, bearer/key shapes, or provider credentials.
- The Fly `OPENAI_API_KEY` was replaced directly in server-side secret storage. The value was never sent through chat or committed.

### Authenticated retry after local firewall remediation

- Supabase CLI login now succeeds and resolves only the expected active/healthy `relic-staging` project. Its name-only Edge-secret inventory contains the Supabase defaults but none of the required custom E2 names, so the secure bootstrap has not run.
- Fly liveness and authenticated alias inventory passed for all five aliases without an OpenAI call.
- Retried `relic-balanced` once with the fixed non-sensitive token fixture. It reached the provider boundary, returned HTTP 401 in 2,931 ms, and was safely classified from buffered logs as `upstream_invalid_or_rejected_key`.
- The retry stopped before `relic-deep`. New inference attempts: **1**. Cumulative external OpenAI HTTP attempts: **4**; successful generations, metered usage, drafts, and canon writes remain **0**; expected incremental charge remains **$0**.
- Buffered-log classification printed no raw log entries and found zero synthetic-prompt or credential-shape hits.

### Secure bootstrap and successful provider probe

- The user replaced the OpenAI key directly in the capped provider project and installed the staging legacy JWT verification secret directly in server-side Edge secret storage. Neither value entered chat, repository files, fixtures, command arguments, or output.
- The authenticated bootstrap generated a staging-only internal token and securely installed the internal/proxy credentials plus explicit `RELIC_ENV=staging`, live provider modes, five canonical aliases, resolved models, dimensions, timeouts, and output caps. Name-only verification passed and printed no values.
- A protected ignored local state file contains only the internal/proxy credentials needed for the smoke, with Windows inheritance removed. A PowerShell parent passes the internal token to the Node runner only through the child environment and clears it in `finally`.
- A tiny `relic-balanced` probe then succeeded through Fly and the replacement OpenAI key: 14 prompt tokens, 6 completion tokens, 20 total tokens, and 33,074 ms. No raw prompt or response was printed. Cumulative inference attempts remain **4**: three rejected attempts with the superseded key and one successful attempt with the replacement key.
- Supabase CLI linking and a read-only Management API query verified the expected empty staging project. The ignored stale link metadata was moved to recoverable `.tmp/supabase-temp-pre-e2-link`; no repository or hosted data was deleted.
- The migration audit found an important bookkeeping stop: the live schema and E2 RPCs are present, but `supabase migration list --linked` reports generated remote versions rather than the repository migration versions. This does not invalidate the already-tested schema, but another hosted migration could replay applied work.
- E2 found that `ai-task-runner` passed `session_id` as a nonexistent retrieval RPC argument. The fix uses `filters.session_id`, the regression source check passed, and only `ai-task-runner` was redeployed as active version 4.
- Added a fail-closed hosted runner for one synthetic private WAV, transcription, record/query embeddings, light/deep registry tasks, quota preflight, exact retries, safe telemetry, isolation, zero canon writes, and full Storage/database cleanup. Its dry run and source checks pass.
- The live runner allows at most seven new calls, so the maximum first-pass cumulative count is 11 of 12. Its external execution approval was rejected because this Codex session hit its tool-usage limit. The runner never started: new calls **0**, new hosted mutations **0**, and no cleanup was necessary.

## Secret and privacy verification

- Tracked-source and Git-history credential-shape scans: zero hits.
- Shipped `.next/static` scans: zero hits for provider/internal secret names, OpenAI/AWS key shapes, or private-key headers.
- `infra/litellm/.secrets.dev` is ignored and untracked.
- Five hosted fail-closed Edge probes produced no bearer/JWT/key/signed-URL/private-payload patterns in Edge logs.
- No raw prompt, transcript, imported note, source excerpt, audio, provider response, or embedding vector was persisted in provider-event rows or logged by the checked paths.

## Remaining risks and E3 dependency

- The local Supabase CLI is authenticated and every required custom Edge secret/configuration name is installed. No further credential action is required for the first application smoke.
- The current scoped JWT issuer uses the legacy HS256 Auth secret. Supabase now recommends asymmetric signing keys for production. The smallest synthetic E2 path is staging-only legacy compatibility; production requires an asymmetric issuer/rotation decision.
- Reusing `relic-llm-dev` is a bounded E2 exception, not acceptable normal staging isolation. A distinct proxy/key remains required before normal staging traffic.
- At this checkpoint E3 was not started and E2 still required the prepared hosted transcription, embedding, light/deep, retry/metering, recovery, logging, isolation, zero-canon, restart, and migration-ledger evidence. Those gates later passed as recorded below.

## Remote-safe continuation

- Added `docs/E2_OPERATOR_SECRET_SETUP_GUIDE.md`, a beginner-oriented operator procedure for the three remaining user-owned actions. It uses project/app identity checks, interactive or standard-input secret handling, name-only evidence, explicit stop conditions, and credential-class rollback without recording any value.
- Rechecked the operator steps against current OpenAI RBAC/error guidance, Supabase Edge-secret/JWT/CLI documentation, and the current Supabase changelog. No platform change invalidates the staged procedure; temporary personal access tokens should use the shortest practical expiry.
- Added a default-read-only E2 preflight/bootstrap helper pinned to `relic-staging` and `relic-llm-dev`. It never prints values, uses a protected OS-temporary env file for Supabase, can send an optional Fly key through standard input, verifies names only, and removes temporary material in `finally`.
- The later `-Apply` path stops before mutation unless Supabase CLI authentication, the proxy credential, and the hosted/current-process JWT secret are available. It stores only the staging internal/proxy credentials in an ignored ACL-restricted local file for the smoke; it never stores the OpenAI key or signing secret.
- Added a fixed synthetic speech generator for “The glass heron waits beside the blue observatory.” The valid WAV is created under the OS temporary directory and contains no user or Relic content.
- Added five safety tests for read-only default behavior, stdin/env-file and child-environment secret handling, verified temporary cleanup, and fixed non-sensitive audio input. The full script suite now passes 40 tests.
- Local Checkpoint B rerun passed repository verification, web TypeScript lint, all 123 web tests, production build, clean full migration replay, all 26 pgTAP files / 763 assertions, and the E2 redaction/provider/source suites. The only current local limitation is direct Docker named-pipe access for the standalone E1 evaluator; its accepted baseline and database contracts remain green.
- At this checkpoint the user-owned key, JWT, and CLI-login actions were complete; Codex execution capacity and migration-ledger reconciliation were the remaining gates. Both were later resolved.

## Hosted continuation and Decision Stop 1

- Reconciled the hosted migration ledger and applied the authorized scoped-JWT claim compatibility migration. A clean local reset now replays all migrations, and pgTAP passes 27 files with 766 assertions.
- Updated the worker scoped-client boundary to use the Supabase SDK access-token hook and propagate permitted Saga scope. Hosted preflight proves the target Saga is visible and a sibling Saga is not.
- Deployed current staging function revisions: `issue-scoped-jwt` v5, `transcribe-session` v7, `embed-row-dispatch` v6, `hybrid-search` v6, and `ai-task-runner` v7.
- Provider-independent Checkpoint B passes: repository verification, 42 script/runtime tests, web TypeScript lint, 27 files/123 web tests, production build, browser static-bundle secret scan, and the E1 deterministic evaluation. The current E1 quality evidence is Recall@5 1.00, MRR 0.96, zero isolation failures, lexical fallback success 1.00, and 31.601 ms database p95.
- Confirmed the Fly release runs LiteLLM 1.93.0 and inspected its installed OpenAI transcription adapter. The adapter passes the configured server-only API key to the OpenAI client; no proxy-side key substitution was found.
- Chat succeeds with the deployed key, while transcription returns 401 both through LiteLLM and in one direct server-side OpenAI SDK request using a generated one-second silent WAV. The direct check emitted only status 401 and safe exception class `AuthenticationError`; it printed no key, response body, audio, transcript, or provider internals.
- Decision Stop 1 was an OpenAI key-permission gate: the isolated capped E2 key temporarily required All permissions before the application smoke could continue. The project remained capped at `$5`; the then-current packet stop was `$1` or 22 attempts and was later explicitly raised to 40 attempts.
- The user enabled the temporary All-permissions setting on the isolated capped E2 key. A subsequent real application run passed hosted transcription, record embedding, and query embedding before the light task returned safe HTTP 422 after its single allowed schema repair.
- The 422 proved bounded repair and terminal failure behavior. The fault was in the synthetic instruction, which listed the complication fields but omitted the registry-required top-level `complications` array; no product schema was weakened. The fixture now provides exact light/deep JSON shapes and its source/schema tests pass.
- The first corrected run also exposed a harness-only response-contract mismatch: the embedding worker deliberately returns `managed` after its completion RPC, while the harness expected `complete`. The harness now verifies `managed` at the HTTP boundary plus `complete` in the job ledger.
- Each failed run completed its fixture cleanup. Count-only checks found zero Workspace, Storage, transcription, embedding, AI-run, or provider-event residue.
- Cumulative E2 inference attempts are conservatively counted as 20. The user subsequently authorized a ceiling of 40 attempts; the $1 E2 stop and $5 project hard cap remain unchanged.

## Hosted application completion — 2026-07-23

- Hosted transcription passed through the private Storage/application boundary with a generated non-sensitive WAV, `relic-transcribe` → `whisper-1`, validated timestamp segments, exactly-once duration metering, safe Session Review state, zero canon writes, and payload-free logs.
- Hosted record/query embeddings passed through `relic-embed` → `text-embedding-3-small` at 1536 finite dimensions. The record vector persisted through the scoped worker, query embedding participated in hybrid retrieval, exact retry did not duplicate provider work or metering, lexical fallback remained callable, and sibling-Saga/pending-draft/unapproved-import sources remained excluded.
- The existing light task `propose_thread_complication` passed through `relic-balanced` → `gpt-5.6-terra` after the synthetic fixture was corrected to match the registered schema. The preceding malformed fixture exhausted exactly one schema repair and failed terminally, proving the bounded repair path.
- The existing deep task `synthesize_session` passed through `relic-deep` → `gpt-5.6-sol` in 4,626 ms with one provider attempt, zero repairs, one usage event, one pending draft batch, exact-retry replay, zero sibling-source matches, and zero canon-audit writes.
- Controlled missing/invalid configuration, timeout/outage, rate limit, malformed response, model/dimension mismatch, quota denial, duplicate delivery, retry exhaustion, dead-letter, replay, and lexical/manual fallback paths preserved input, bounded retries, safe categories, and idempotent metering.
- Synthetic cleanup removed the Workspace, private Storage objects, jobs, AI runs, provider events, and AI dead letters. Fixed-ID verification found and removed two old synthetic dead letters without touching unrelated rows.

## Restart and scheduler evidence

- Restarted Fly machine `d8d967d1c719d8` and redeployed `transcribe-session` plus `embed-row-dispatch`. The first repeat safely exposed an accidental `verify_jwt=true` deployment default as a pre-provider 401. Both functions were redeployed with `--no-verify-jwt`, restoring the intended internal-token boundary; cold-state transcription and embedding then passed.
- Installed Vault names `relic_edge_functions_base_url` and `relic_internal_worker_token` using the existing protected local internal token. The script suppressed CLI output, protected its OS-temporary SQL material with explicit Windows ACLs, verified the resolved path, and removed it.
- Added and deployed one-minute `relic-dispatch-transcription`, `relic-dispatch-embeddings`, and `relic-dispatch-ai-tasks` schedules. The first runs exposed missing `pg_net`; the additive `enable_pg_net_e2` forward fix recovered execution.
- A second forward fix makes AI Cron select only a due `pending`/`retryable` run and pass its `run_id`, aligns heartbeat checks with actual worker types, and checks missing execution only when work exists.
- Latest hosted runs for all three schedules are `succeeded`; transcription/embedding/AI active queues are `0/0/0`; the service-only operational alert query returns `[]`; transcription and embedding idle heartbeats are present; prohibited sensitive-field indicator matches are zero.
- Hosted migration ledger matches the repository through `20260723141043_fix_e2_dispatch_and_worker_alerts.sql`. `supabase db lint --linked --level error` reports no errors.

## Call-count incident

- Final conservative inference-attempt count is **41**, one above the user-authorized ceiling of **40**. The extra request occurred after the target cold-state transcription and embedding proof had passed: repeat mode invoked the generic idle embedding dispatcher, which claimed a different queued synthetic embedding job.
- This was not an exact-retry duplicate, did not duplicate the completed target's usage event, touched no private user data, and remained below the E2 `$1` stop and project `$5` cap.
- The repeat-mode idle dispatch was removed, all synthetic residue was cleaned, and the smoke runner is hard-disabled at 41 previous / 0 additional / 40 packet limit. No further E2 provider call is authorized. The incident is retained as a resolved harness/call-guard defect.

## Final integrated verification

- Clean migration replay passed through the three scheduler/`pg_net` forward fixes.
- Full pgTAP passed: 28 files / 780 assertions.
- Repository verification passed.
- Script/runtime suite passed: 43 tests.
- Web TypeScript lint passed with repository-pinned pnpm 10.11.0.
- Web tests passed: 27 files / 123 tests.
- Production build passed.
- Deterministic E1 evaluation passed: Recall@5 1.00, MRR 0.96, zero isolation failures, lexical fallback 1.00, database p95 35.442 ms.
- Browser static-bundle sensitive match files: zero. Repository credential-shaped match files: zero. Scheduler temporary secret directories: zero.
- Hosted tenant isolation, zero automatic canon writes, idempotent usage/drafts, safe logs, bounded retry/recovery, Cron, queue, dead-letter, and restart evidence all pass.

## Closeout and next packet

- E2 is complete for the synthetic `relic-staging` gate. Production remains untouched and unauthorized.
- Open production risks are deliberately separate: create an isolated `relic-llm-staging` proxy/key before normal staging use, replace the legacy HS256 issuer path before production, and rotate/restrict the temporary broad-permission OpenAI key after E2.
- Immediate next packet is E3 Relic Guide. It may use the shared hosted delivery boundary but must preserve scoped retrieval/source allowlists, quota/metering, idempotency, safe telemetry, provenance, and explicit GM approval.
