---
status: active
authority: secondary
scope: security
read_after:
  - "[[00 - Start Here]]"
depends_on:
  - "[[20 - Entity and Canon Schema]]"
  - "[[21 - Tech Architecture]]"
  - "[[41 - Foundation Implementation Plan]]"
supersedes: []
last_audited: 2026-07-23
source_file: "Relic Vault/45 - Security Findings Register.md"
---

# Security Findings Register

Use this register to track security findings, their current status, and the verification that proves a finding is fixed or intentionally deferred. Do not record secrets, keys, tokens, private environment values, or production identifiers here.

Status values: `live`, `fixed`, `deferred`, `accepted-risk`.

| Finding ID | Severity | Status | Area | Summary | Fix or Mitigation | Verification |
|---|---|---|---|---|---|---|
| SEC-FOUNDATION-001 | high | fixed | quota | Workspace usage limits were editable through the user-owned `workspaces` row. | Revoked direct browser-role writes on public tables and moved quota reads through scoped RPCs. | `supabase/tests/foundation.sql`: direct `workspaces.usage_limits` update must be denied. |
| SEC-FOUNDATION-002 | high | fixed | RLS | Sibling-Saga isolation depended on an active Saga JWT claim that normal app sessions did not set. | `active_saga_matches()` now fails closed when the claim is absent; app access uses scoped RPCs that validate Workspace/World/Saga hierarchy. | `supabase/tests/foundation.sql`: direct Saga-scoped reads without active Saga claim return no rows. |
| SEC-FOUNDATION-003 | high | fixed | usage | Authenticated users could update or delete their own `usage_events`. | Replaced the broad usage policy with select/insert-only policy and revoked direct update/delete grants. | `supabase/tests/foundation.sql`: direct usage-event update/delete must be denied. |
| SEC-FOUNDATION-004 | medium-high | fixed | drafts | Draft state could be directly mutated by authenticated users. | Revoked direct draft updates and added `update_draft_state()` as the scoped resolution path. | `supabase/tests/foundation.sql`: direct update denied; scoped RPC resolves draft. |
| SEC-FOUNDATION-005 | medium | fixed | app actions | Server actions trusted hidden Workspace/World/Saga form IDs too much and wrote directly to tables. | Server actions now call scoped RPCs that validate hierarchy server-side. | `apps/web/tests/security-actions.test.ts`: actions use RPCs and avoid direct table mutation. |
| SEC-FOUNDATION-006 | medium | fixed | relationships | Session/junction rows could point at out-of-scope entity IDs. | Added trigger validation for session pinned entities and active threads; relationship/source validations remain part of the next schema-hardening pass. | `supabase/tests/foundation.sql`: sibling-Saga pinned entity insert must be rejected. |
| SEC-FOUNDATION-007 | medium | fixed | grants | Broad public-schema DML grants made future table exposure fragile. | Revoked direct insert/update/delete on public tables from browser roles; re-granted only storage object DML under storage RLS and scoped function execution. | Migration review plus `supabase/tests/foundation.sql` permission-denial cases. |
| SEC-FOUNDATION-008 | medium | deferred | retrieval | Retrieval still uses lexical/trigram behavior until embedding workers populate real vectors. | Keep current retrieval as MVP-safe fallback; require embedding-worker verification before claiming vector retrieval complete. | Future AI/runtime or embedding-worker phase. |
| SEC-FOUNDATION-009 | medium | deferred | jobs | Background job worker/service-role execution model is schema-only. | Keep jobs inert until worker code defines scoped execution, service-role use, retry, and audit behavior. | Future job-worker implementation plan. |
| SEC-FOUNDATION-010 | medium | deferred | storage | Upload UI is not active, so signed upload and storage RLS UX are not fully exercised. | Keep private buckets and path RLS; require signed upload/RLS verification before enabling uploads. | Future upload-flow implementation. |
| SEC-FOUNDATION-011 | medium | accepted-risk | RPC boundary | Browser-callable RPCs currently live in `public` and use `security definer` for scoped operations. | Accepted for the rough-UI backend milestone only. Direct table writes are revoked, anonymous function execution is denied, authenticated execution is allowlisted, every public `security definer` function requires fixed `search_path`, and the boundary is documented in `supabase/security/rpc-boundary.md`. | `supabase/tests/access_control.sql` plus `npm run backend:baseline:reset`. |
| SEC-E2-001 | high | fixed | hosted secrets | The staging project/functions and proxy aliases initially lacked custom Edge secrets and authenticated CLI access. | Required names are installed only in server-side hosted storage; values were never requested in chat, fixtures, documentation, commits, or browser-visible configuration. | Name-only bootstrap verification, hosted fail-closed probes, and `docs/E2_HOSTED_READINESS.md`. |
| SEC-E2-002 | high | fixed | provider configuration | Transcription and AI deterministic modes or implicit model/endpoint fallbacks could activate without an explicit hosted mapping. | Hosted modes require `RELIC_ENV`, explicit live mode, canonical alias, explicit resolved model, and LiteLLM proxy configuration; unexpected model responses fail closed. | `scripts/provider-config-safety.test.mjs` and Edge source tests. |
| SEC-E2-003 | high | fixed | telemetry | Older active language allowed raw query/prompt/response logging, which conflicts with provider-pipeline privacy requirements. | Disabled raw proxy logging; added fixed safe event fields, metadata allowlist, server-only grants, and sensitive-key rejection/omission tests. | `supabase/tests/hosted_observability_e2.sql` and Edge source tests. |
| SEC-E2-004 | high | fixed | delivery | Hosted retry, scheduler, metering, and worker-restart evidence was initially absent. | Synthetic staging transcription, embedding, light/deep tasks, exact retry, dead-letter/replay, Vault-authenticated schedules, cold restart, idempotent metering, tenant isolation, and zero canon writes now pass. | [[Session Logs/2026-07-22 - Hosted Provider and Observability Gate]] and `docs/E2_HOSTED_READINESS.md`. |
| SEC-E2-005 | high | accepted-risk | provider permission | Restricted capability settings returned 401 for transcription, so the isolated capped E2 key was temporarily set to All permissions. | E2 passed under the `$5` project cap and `$1` packet stop. Rotate or restrict the temporary key after E2; normal staging/production must use independently rotatable least-privilege keys. | Hosted transcription proof and safe-log scan; no key, body, prompt, audio, or transcript logged. |
| SEC-E2-006 | medium | accepted-risk | hosted database | Supabase advisors flag internal tables with RLS disabled even though browser roles lack schema usage, table grants, and direct internal-function execution. Enabling no-policy RLS blindly could break service workers. | Preserve explicit privilege revocation for E2; review defense-in-depth RLS with worker-role tests before production rather than changing it during the hosted smoke. | Hosted catalog privilege queries, pgTAP access suite, and zero advisor errors after `security_invoker` hardening. |
| SEC-E2-007 | high | fixed | call guard | The restart harness made a 41st inference attempt after the authorized 40-call ceiling by invoking generic idle embedding dispatch, which claimed a different queued synthetic job. | Removed repeat-mode idle dispatch, cleaned all synthetic residue, hard-disabled the runner at 41 previous/0 additional/40 limit, and retained the incident in closeout evidence. It was not an exact-retry duplicate and remained below `$1`/`$5`. | Hosted closeout log, smoke-runner call guard, and script safety tests. |
| SEC-E3-001 | high | fixed | local provider isolation | The initial E3 local Edge harness inherited live provider values from `supabase/.env.local` despite process-level deterministic overrides, producing four synthetic LiteLLM requests before detection. | Stopped the harness, audited safe telemetry, and changed `serve-functions-local.mjs` to build an authoritative temporary environment that defaults AI/embedding/transcription to deterministic modes and omits every live provider endpoint/key. Live local mode now requires explicit opt-in. | Edge source tests plus the repeated authenticated E3 browser proof: providers are `deterministic-test` / `deterministic-development-test`, billable flags are false, repair count is zero, and no LiteLLM event exists after clean reset. |
| SEC-E3-002 | high | fixed | Guide authorization | Browser-provided source IDs, models, aliases, history, quota decisions, and mutation targets could create BOLA or prompt-boundary risk if trusted. | Browser actions send only scope identifiers, logical turn identity, and question; scoped preflight validates the GM, worker RPCs revalidate hierarchy, source allowlists are server-generated/frozen, public tables are select-only under owner RLS, and action acceptance revalidates scope and task quota. | `relic_guide_e3.sql`, `security-actions.test.ts`, and `edge-runtime-source.test.mjs`. |

## Open Follow-Ups

- Add targeted pgtap fixtures for each relationship/source trigger, beyond the current session-pinned sibling-Saga regression.
- Revisit the accepted public-schema `security definer` RPC placement before production hardening or multi-tenant collaboration work.
