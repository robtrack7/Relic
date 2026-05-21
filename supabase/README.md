# Supabase

Supabase implementation folder for Relic MVP.

- `migrations` - ordered SQL migrations for schema, RLS, policies, functions, indexes, and storage policies.
- `functions` - Edge Functions for scoped backend actions, async jobs, retrieval, notifications, exports, and later AI runtime work.
- `tests` - RLS, migration, retrieval, quota, storage, and job tests.
- `fixtures` - test fixture data.

Guardrails:

- Start with Workspace / World / Era / Saga schema and RLS before UI work.
- Keep all user-data tables RLS-protected.
- Do not add live AI runtime functions until `Relic Vault/43 - AI Runtime Implementation Plan.md` is accepted.
- Storage paths must preserve Workspace / World / Saga boundaries.

## Local Foundation Checks

Install the Supabase CLI, then run:

```bash
supabase start
npm run test:supabase
supabase stop --no-backup
```

The test harness uses `supabase/tests/foundation.sql` and deterministic fixture rows from `supabase/fixtures/foundation.sql`.

## Public RPCs Added By Foundation

- `ensure_default_workspace()`
- `get_bootstrap_context()`
- `check_quota_preflight(workspace_id, world_id, saga_id, action_kind, requested_units, metadata)`
- `get_workspace_usage_summary(workspace_id)`
- `search_for_ui(workspace_id, world_id, saga_id, query_text, surface, top_k, include_archived, literal_only, include_world_canon)`
- `retrieve_for_task(workspace_id, world_id, saga_id, era_id, query_text, task_profile, filters, top_k)`
