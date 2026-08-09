# Supabase

Supabase implementation folder for Relic MVP.

- `migrations` - ordered SQL migrations for schema, RLS, policies, functions, indexes, and storage policies.
- `functions` - Edge Functions for scoped backend actions, async jobs, retrieval, Loom tasks, notifications, and exports.
- `tests` - RLS, access-control, migration, retrieval, quota, storage, and job tests.
- `fixtures` - test fixture data.
- `security/rpc-boundary.md` - browser-callable RPC boundary and accepted short-term definer-function constraints.

Guardrails:

- Start with Workspace / World / Era / Saga schema and RLS before UI work.
- Keep all user-data tables RLS-protected.
- Keep provider work server-only, schema-validated, scoped, metered, idempotent, and unable to write canon without the reviewed GM path.
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

To serve Edge Functions locally, use the repository wrapper:

```bash
npm run supabase:functions:serve
```

The wrapper reads the JWT signing secret directly from the running local Auth
container, adds it to a temporary mode-`0600` Edge environment file, and removes
that file when the function server exits. It never prints or persists the JWT
secret in the repository. If multiple local Supabase projects are running, set
`SUPABASE_AUTH_CONTAINER` to the intended Auth container name before starting.

## Transcription Worker Configuration

`transcribe-session` has a deterministic `TRANSCRIPTION_PROVIDER_MODE=test` path for local contract verification. Hosted transcription uses the canonical OpenAI-compatible LiteLLM audio endpoint and requires server-side Edge Function secrets only:

- `LITELLM_PROXY_URL`
- `LITELLM_PROXY_KEY`
- `RELIC_ENV=staging` or `production`
- `TRANSCRIPTION_PROVIDER_MODE=live`
- `TRANSCRIPTION_MODEL_ALIAS=relic-transcribe`
- `TRANSCRIPTION_RESOLVED_MODEL=<the exact deployed backing model>`
- `TRANSCRIPTION_TIMEOUT_MS`
- `INTERNAL_TOKEN`
- `RELIC_JWT_SIGNING_SECRET`

`TRANSCRIPTION_PROVIDER_BASE_URL` and `TRANSCRIPTION_PROVIDER_API_KEY` are local-development overrides only. Hosted staging/production must use the shared LiteLLM proxy variables and cannot fall back to generic AI credentials. Never prefix these values with `NEXT_PUBLIC_` or expose them to browser code. A live-provider smoke test is a deployment check, not part of the deterministic local suite.

## Hosted AI Task Configuration

`ai-task-runner` defaults to live mode and rejects deterministic mode in staging/production. Hosted task delivery requires these server-only Edge secrets/configuration values:

- `RELIC_ENV=staging` or `production`
- `AI_PROVIDER_MODE=live`
- `LITELLM_PROXY_URL`
- `LITELLM_PROXY_KEY`
- `AI_MODEL_RELIC_FAST=relic-fast`
- `AI_RESOLVED_MODEL_RELIC_FAST=<exact backing model>`
- `AI_MODEL_RELIC_BALANCED=relic-balanced`
- `AI_RESOLVED_MODEL_RELIC_BALANCED=<exact backing model>`
- `AI_MODEL_RELIC_DEEP=relic-deep`
- `AI_RESOLVED_MODEL_RELIC_DEEP=<exact backing model>`
- `AI_TIMEOUT_MS`

The public aliases must match the Registry tiers exactly. A missing mapping or provider-reported model mismatch fails closed with a safe category. Provider keys remain in the LiteLLM host's secret store; only the proxy credential reaches Supabase Edge secrets.

## E2 Secure Bootstrap

Run the non-mutating preflight at any time:

```powershell
npm run e2:preflight
```

`scripts/e2-secure-bootstrap.ps1` defaults to preflight and performs no hosted write or provider call. Its `-Apply` path is deliberately unavailable until the Supabase CLI is authenticated and `RELIC_JWT_SIGNING_SECRET` already exists remotely or is present only in the current process. It:

- generates or reuses a staging-only `INTERNAL_TOKEN`;
- reads the proxy credential from the ignored local secret state without printing it;
- uploads Edge configuration through a protected OS-temporary env file;
- optionally sends `OPENAI_API_KEY` to Fly through standard input rather than a command argument;
- verifies configured secret **names** only;
- deletes the temporary env file in `finally` after validating that its resolved path is under the OS temporary directory;
- retains only the staging internal/proxy credentials in ignored, ACL-restricted `infra/litellm/.secrets.e2-staging` for the subsequent smoke run. It never retains the OpenAI key or Auth signing secret.

E2 bootstrap is complete. Treat `-Apply` as a recovery/rotation operation that requires a fresh reviewed authorization; it is not a routine smoke command. Never pass secret values as script parameters, paste them into chat, or commit the ignored state file.

Generate the deliberately synthetic transcription fixture with:

```powershell
npm run e2:audio-fixture
```

The generator speaks a fixed non-sensitive sentence into an OS-temporary WAV file. It reads no application or user content and can regenerate the fixture immediately before the hosted smoke.

## E2 Operational Queries

The additive E2 migration records fixed-field, service-only provider pipeline events. It rejects non-allowlisted metadata rather than storing prompts, transcripts, source text, audio, responses, vectors, credentials, tokens, or signed URLs.

Service-role operators can call:

```sql
select public.get_provider_operations_summary_for_worker(60);
select public.get_provider_operational_alerts_for_worker();
```

The first query reports event states, p95 queue/provider/end-to-end latency, alias/model routes, live queue counts, and Relic cron run state. The second reports provider failures, dead-letter growth, stranded jobs, model/dimension mismatches, repeated quota denial, hosted deterministic-mode use, missing worker/scheduler execution, duplicate metering, and sensitive-field logging regressions. These functions are revoked from browser roles.

Staging schedules `relic-dispatch-transcription`, `relic-dispatch-embeddings`, and `relic-dispatch-ai-tasks` run once per minute using only Vault secret-name lookups. The AI command selects one due pending/retryable run and passes its `run_id`; an empty AI queue issues no HTTP/provider request. Latest E2 closeout evidence records all three as successful with empty queues and no active alerts.

## Public RPCs Added By Foundation

The current callable boundary is documented in `supabase/security/rpc-boundary.md` and enforced by `supabase/tests/access_control.sql`.

- `ensure_default_workspace()`
- `get_bootstrap_context()`
- `check_quota_preflight(workspace_id, world_id, saga_id, action_kind, requested_units, metadata)`
- `get_workspace_usage_summary(workspace_id)`
- `search_for_ui(workspace_id, world_id, saga_id, query_text, surface, top_k, include_archived, literal_only, include_world_canon)`
- `retrieve_for_task(workspace_id, world_id, saga_id, era_id, query_text, task_profile, filters, top_k)`
