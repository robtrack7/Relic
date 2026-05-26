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
last_audited: 2026-05-26
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

## Open Follow-Ups

- Add targeted pgtap fixtures for each relationship/source trigger, beyond the current session-pinned sibling-Saga regression.
- Run Supabase SQL tests against a local database after Docker/Supabase is available.
- Revisit security-definer RPC placement if the project moves to a dedicated exposed API schema.
