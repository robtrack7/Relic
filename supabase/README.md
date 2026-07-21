# Supabase

Supabase implementation folder for Relic MVP.

- `migrations` - ordered SQL migrations for schema, RLS, policies, functions, indexes, and storage policies.
- `functions` - Edge Functions for scoped backend actions, async jobs, retrieval, notifications, exports, and later AI runtime work.
- `tests` - RLS, access-control, migration, retrieval, quota, storage, and job tests.
- `fixtures` - test fixture data.
- `security/rpc-boundary.md` - browser-callable RPC boundary and accepted short-term definer-function constraints.

Guardrails:

- Start with Workspace / World / Era / Saga schema and RLS before UI work.
- Keep all user-data tables RLS-protected.
- Do not add live AI runtime functions until `Relic Vault/43 - AI Runtime Implementation Plan.md` is accepted.
- Storage paths must preserve Workspace / World / Saga boundaries.

## Local Foundation Checks

Install Docker Desktop and the Supabase CLI, then run the backend baseline:

```bash
npm run backend:baseline
```

This command runs:

- `npm run test:scripts`
- `npm run verify`
- `npx pnpm@10.11.0 --filter @relic/web test`
- `supabase start` when the local stack is not already running
- `npm run test:supabase`

To prove migrations replay cleanly from the current migration set, run:

```bash
npm run backend:baseline:reset
```

The reset command applies local migrations, runs seed data, then runs the pgTAP harnesses in `supabase/tests/access_control.sql`, `supabase/tests/approval_queue.sql`, `supabase/tests/canon_write_path.sql`, and `supabase/tests/foundation.sql`.

Do not paste local Supabase keys, JWT secrets, storage keys, or generated service credentials into notes, logs, commits, or screenshots.

## Transcription Worker Configuration

`transcribe-session` has a deterministic `TRANSCRIPTION_PROVIDER_MODE=test` path for local contract verification. Hosted transcription uses the canonical OpenAI-compatible LiteLLM audio endpoint and requires server-side Edge Function secrets only:

- `LITELLM_PROXY_URL`
- `LITELLM_PROXY_KEY`
- `TRANSCRIPTION_MODEL=relic-transcribe`
- `INTERNAL_TOKEN`
- `SUPABASE_JWT_SECRET`

`TRANSCRIPTION_PROVIDER_BASE_URL` and `TRANSCRIPTION_PROVIDER_API_KEY` are optional per-worker overrides. Never prefix these values with `NEXT_PUBLIC_` or expose them to browser code. A live-provider smoke test is a deployment check, not part of the deterministic local suite.

## Public RPCs Added By Foundation

The current callable boundary is documented in `supabase/security/rpc-boundary.md` and enforced by `supabase/tests/access_control.sql`.

- `ensure_default_workspace()`
- `get_bootstrap_context()`
- `check_quota_preflight(workspace_id, world_id, saga_id, action_kind, requested_units, metadata)`
- `get_workspace_usage_summary(workspace_id)`
- `search_for_ui(workspace_id, world_id, saga_id, query_text, surface, top_k, include_archived, literal_only, include_world_canon)`
- `retrieve_for_task(workspace_id, world_id, saga_id, era_id, query_text, task_profile, filters, top_k)`
