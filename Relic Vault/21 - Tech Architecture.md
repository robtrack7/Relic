---
status: active
authority: secondary
scope: mvp
read_after:
  - "[[00 - Start Here]]"
depends_on:
  - "[[00 - Start Here]]"
supersedes: []
last_audited: 2026-07-20
source_file: "Sourced - Downloaded - 260518/relic-tech-architecture-spec-v1_2.md"
---

> [!info] How to use this spec
> Owns: Supabase, RLS, Edge Functions, jobs, sync, deployment, monitoring, and backend mechanisms.
> Does not own: Historical rationale and superseded naming unless explicitly retained as an internal identifier.
> Read next: [[00 - Start Here]]
> Implementation-critical note: Treat this as coding input only after reading the authority order in [[00 - Start Here]].
# Relic — Tech Architecture Spec v1.2

**Source of truth:** `[[11 - Product Basepoint]]` §13 · `[[12 - MVP PRD]]` §0.4, §7 · `[[20 - Entity and Canon Schema]]` · `[[22 - Memory and Retrieval]]` · `[[23 - AI Task Registry]]` · `[[24 - Approval Queue]]` · `[[31 - Session Prep Flow]]` · `[[25 - Pricing and Rate Limits]]` · Design System (`[[13 - Design System]]`)
**Status:** Locked spec. Engineering and Claude Code may build against this document. Closes carry-forward items 3–11, 17–20.
**Scope:** Contracts and mechanisms for engineering. Not runbooks. CI/CD, log retention, and on-call rotation are out of scope unless they shape what gets built.

---

## Changelog

**Stage non-audio recovery patch (July 2026).** Extends the web IndexedDB recovery contract to Quick Capture, Quick Stub, Mark Moment, End Session, and Undo. Replay is session-scoped FIFO, stops on the first failed dependency, reuses stable idempotency keys, and enters Supabase through one scoped transactional RPC backed by a private receipt ledger.

**Post-session transcription delivery patch (July 2026).** Implements the `relic-transcribe` LiteLLM audio call behind the Edge worker, ordered scoped Storage reads, timestamped response validation, idempotent duration metering, service-role-only worker completion/failure boundaries, retry/dead-letter recovery, and scoped session-review/read/retry RPCs. Deterministic local provider mode is test evidence only; the hosted LiteLLM path still requires deployed secrets and a live smoke test.

**Stage evidence recovery patch (July 2026).** Locks the web-first IndexedDB queue, retry-safe direct Storage upload/registration, explicit expected-chunk finalization marker, and scheduled server-owned `ended_pending_undo` expiry. Transcription enqueue waits for the ended Session plus every declared chunk.

**v1.2 (May 2026).** Priority 6 and document-control alignment. Adds quota preflight expectations, Workspace-level usage metering, hard-stop error contracts, and `get_workspace_usage_summary` as the read model for usage/upgrade surfaces. Refreshes active source references to the current versioned files.

**Priority 3 continuity architecture patch (May 2026).** Updates technical assumptions from Saga-only tenancy to Workspace / World / Era / Saga tenancy. RLS helpers, storage paths, job payloads, exports, retrieval calls, and observability events must preserve `workspace_id`, `world_id`, and `saga_id` where applicable. Workspace owns billing/usage/future collaboration. World owns shared canon. Saga owns active play/session data. Era fields are V1-ready only.

**v1.1 (May 2026).** Alignment pass with Stage UX Flow v0.2 and Next Steps. Adds session prep workspace-specific query role guidance, session prep workspace offline functional minimum, `ready` session caching, web/mobile session prep workspace deployment surfaces, Saga Creation table rename in RLS/export references, and V1 architecture placeholders for rulebook RAG, `derive_system_schema`, and `generate_from_context`.

**v1.0 (May 2026).** Locked. Two changes from v0.1 first draft. Added notification system (§18) with email-on-`ready_for_review` and push notifications for mobile — closes the open item from v0.1 §20 and the PRD `PSP-FR-9` "GM notified" mechanism. Promoted transcript editing from V1 to MVP with frozen-citation-with-drift-indicator handling (§7.9, §13 updated): GMs can edit transcript segments during the pipeline review window; `sources.raw_excerpt` stays frozen per Schema §8.1; the source-view surface shows a citation-drift indicator when a cited segment has been edited after capture. Section numbering shifted from v0.1 starting at §18; previous §18–§20 renumbered.

**v0.1 (May 2026).** First draft. Closed carry-forward items 3–11, 17–20. Two material decisions deferred for review: notification mechanism for `PSP-FR-9` and transcript-edit cadence per Memory Spec §13.

---

## 0. How to read this

This spec is the backend contract. Every upstream doc has deferred at least one item here. Each section names the upstream spec that defines the *what*; this doc owns the *how*.

The spec is organized by the engineering surfaces it touches, roughly in the order they fire during a saga's lifetime:

1. Supabase project layout (the substrate).
2. Row-level security (the tenancy seam).
3. LiteLLM proxy (the AI seam).
4. Edge Functions (the async backbone).
5. JWT issuance for async jobs (the auth seam).
6. Embedding job queue (the largest async surface).
7. Transcription pipeline (the second-largest), including transcript editing.
8. Retrieval-layer config (Stage timeout, HNSW, BM25 fallback).
9. Token counting and budget pre-checks.
10. Mention detection placement.
11. Storage (audio, attachments, exports).
12. Export pipeline (Markdown + JSON archive).
13. Stale-pipeline-warning scheduler.
14. Offline sync (expo-sqlite + Drizzle).
15. Deployment shape.
16. Monitoring (Sentry + PostHog).
17. Notification system (email + push).
18. Trade-offs surfaced.

Numbered carry-forward items appear in section headings (`CF-3`, `CF-4`, …) so every blocking deferral has a visible home.

---

## 1. Supabase project layout

### 1.1 Project shape

One Supabase project per environment: `relic-dev`, `relic-staging`, `relic-prod`. Each has its own Postgres database, Auth, Storage, and Edge Functions. No multi-tenant DB tricks — RLS does tenancy *within* a project; environment isolation is at the project boundary.


### 1.1b Product hierarchy

The physical tenancy hierarchy is:

```text
Account
└── Workspace  -- ownership, billing, usage, future collaboration
    └── World  -- shared setting and World canon
        ├── Era / Timeframe  -- V1-ready temporal context
        └── Saga  -- playable campaign/storyline
            └── Session
```

Billing, usage limits, and future membership attach to `workspace_id`. World canon attaches to `world_id` with `scope='world'`. Active play and post-session processing attach to `saga_id` with `scope='saga'`.

### 1.2 Postgres version

**Postgres 15.** Matches Schema v0.8 declaration. We do not need 16's logical replication features for MVP; 15 has pgvector + HNSW + every range type and trigger feature we use.

### 1.3 Extensions

| Extension | Purpose | Where used |
|---|---|---|
| `pgvector` | Vector storage and HNSW index | `embeddings.vector`, Memory Spec §3, §11.1 |
| `pg_trgm` | Trigram similarity for possible-duplicate detection | `synthesize_session` pre-LLM candidate filter (Registry v1.0 §6) |
| `pgcrypto` | UUID v7 generation, secure RNG | UUID primary keys (Schema §1.1) |
| `pg_cron` | Scheduled jobs (stale-pipeline warning, JWT key rotation triggers) | §13 |
| `pg_net` | HTTP-from-Postgres for trigger → Edge Function hand-off | §6.2 |

UUID v7 is not native to Postgres 15. We use a SQL function from the `uuid7` extension or a small `CREATE FUNCTION` wrapper around `pgcrypto`. The function returns time-ordered UUIDs without an `id_seq` column (Schema §1.1).

### 1.4 Schemas

| Schema | Contents |
|---|---|
| `public` | All product tables per Schema v0.8. RLS-protected. |
| `internal` | Job queue tables (§6.4), staging tables for transcription chunks, stale-warning bookkeeping, notification queue (§17). Service-role-only access; RLS disabled because nothing user-owned lives here. |
| `auth` | Supabase Auth (managed). |
| `storage` | Supabase Storage metadata (managed). |
| `extensions` | Extension installs (managed). |

`internal` exists so service-role code has a clear shelf for queue and bookkeeping rows that should not be visible to any client. If something is user data, it goes in `public` and gets RLS. If it's operational, it goes in `internal` with no RLS and no `authenticated`-role grants.

### 1.5 Connection pooling

**PgBouncer in transaction mode** (Supabase's default Supavisor pooler). All app-side reads and writes go through the pooler; Edge Functions get a separate pooler endpoint.

**Why transaction mode.** Session-mode pooling would pin each request to a connection for its lifetime; the embedding queue and synthesis pipeline both burst — transaction mode handles bursts at the cost of forbidding `SET LOCAL` outside transactions and `LISTEN/NOTIFY`. We rely on neither (we use Edge Functions and `pg_cron` for everything LISTEN-shaped).

**Statement timeouts.** Configured per role (§8.1), not per connection.

---

## 2. Row-level security (CF-18)

Schema v0.8 §13 ships a pattern; this section makes it complete. RLS is enabled day one (PRD `ACC-FR-5`). The full test suite hits every table from authenticated and anonymous roles and confirms zero cross-Workspace, cross-World, or cross-Saga leakage (Memory Spec §10.3).

### 2.1 Roles

| Role | Origin | Granted on |
|---|---|---|
| `anon` | Supabase Auth (logged-out) | Nothing in `public`. |
| `authenticated` | Supabase Auth (logged-in GM) | All `public` tables, RLS-enforced. |
| `service_role` | Supabase Auth (server-side only) | All `public` and `internal` tables, RLS bypassed. Used only by Edge Functions for narrow ops that need it (e.g. issuing scoped JWTs, §5). |

`service_role` is **not** used for AI grounding, embedding writes, or any user-data access path. Memory Spec Decision 9 forbids `SECURITY DEFINER` on retrieval; we keep the same posture for all user-data writes.

### 2.2 The Workspace / World / Saga predicates

Most product tables now carry `workspace_id` and `world_id`; Saga-scoped rows also carry `saga_id`. Encode ownership and hierarchy checks once as SQL helper functions:

```sql
create or replace function public.user_owns_workspace(target_workspace_id uuid)
returns boolean
language sql
security invoker
stable
as $$
  select exists (
    select 1 from public.workspaces
    where id = target_workspace_id
      and owner_gm_id = auth.uid()
      and deleted_at is null
  );
$$;

create or replace function public.world_belongs_to_workspace(target_world_id uuid, target_workspace_id uuid)
returns boolean
language sql
security invoker
stable
as $$
  select exists (
    select 1 from public.worlds
    where id = target_world_id
      and workspace_id = target_workspace_id
      and deleted_at is null
  );
$$;

create or replace function public.saga_belongs_to_world(target_saga_id uuid, target_world_id uuid)
returns boolean
language sql
security invoker
stable
as $$
  select exists (
    select 1 from public.sagas
    where id = target_saga_id
      and world_id = target_world_id
      and deleted_at is null
  );
$$;
```

`user_is_workspace_member(workspace_id)` is a V1-ready alias for `user_owns_workspace(workspace_id)` in MVP. Future co-GM support changes that helper, not every policy.

### 2.3 Policy template

For mixed World/Saga content:

```sql
create policy "gm can read own scoped rows"
on <table> for select
using (
  public.user_is_workspace_member(workspace_id)
  and public.world_belongs_to_workspace(world_id, workspace_id)
  and (
    (scope = 'world' and saga_id is null)
    or
    (scope = 'saga' and saga_id is not null and public.saga_belongs_to_world(saga_id, world_id))
  )
);
```

For Saga-only operational tables, `saga_id` is non-null and the policy validates the full chain: Workspace → World → Saga. `with check` clauses mirror `using` so a GM cannot retarget a row into another Workspace, World, or Saga.

### 2.4 Per-table deviations

The pattern above covers most mixed-scope content. Structural and operational tables deviate.

**`workspaces`.** Direct ownership check on `owner_gm_id = auth.uid()`. In MVP this is one owner only. Future workspace members update `user_is_workspace_member()` rather than every table policy.

**`worlds`.** Validates `public.user_is_workspace_member(workspace_id)` and `deleted_at is null`.

**`sagas`.** Validates the full chain: `public.user_is_workspace_member(workspace_id)`, `public.world_belongs_to_workspace(world_id, workspace_id)`, and `deleted_at is null`. Saga delete is blocked at app level while a session is `in_progress` or `ended_pending_undo` (Schema §2.5) because that check spans `sessions`.

**`gm_profiles`.** User-scoped by `user_id = auth.uid()`; no Workspace scope.

**`canon_audit`.** INSERT-only for `authenticated`; SELECT uses the same Workspace/World/Saga hierarchy predicate as its source row. UPDATE and DELETE are revoked at the GRANT level. This prevents anyone, including a compromised app session, from rewriting history. Saga delete cascades Saga-scoped audit rows; World-scoped audit rows remain until World deletion.

**`workshop_sessions` / saga-creation sessions.** User-scoped until commit. Once `workspace_id`, `world_id`, and `saga_id` are attached, the row must also validate the full Workspace → World → Saga chain. A GM cannot mid-flow retarget a saga-creation session into another Workspace, World, or Saga.

### 2.5 Storage RLS

Supabase Storage uses RLS-style policies on `storage.objects`. The bucket structure (§12) namespaces by Workspace/World/Saga IDs in the object path. Example audio policy:

```sql
create policy "audio_chunks_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'audio'
    and public.user_is_workspace_member((storage.foldername(name))[1]::uuid)
    and public.world_belongs_to_workspace(
      (storage.foldername(name))[2]::uuid,
      (storage.foldername(name))[1]::uuid
    )
    and public.saga_belongs_to_world(
      (storage.foldername(name))[3]::uuid,
      (storage.foldername(name))[2]::uuid
    )
  );
-- Analogous insert / update / delete policies.
```

The path shape is `audio/<workspace_id>/<world_id>/<saga_id>/<session_id>/<sequence>.<ext>`. Attachments and exports use the same hierarchy, with a `scope` segment where needed for World-scoped files.

### 2.6 The cross-table-join question

A few queries cross tables such as `draft_sources` → `sources` → `transcripts` for the source-view UI. Each user-data table carries enough Workspace/World/Saga columns for RLS to fire independently. The join naturally inherits the constraint. Any new user-data table must either carry the same scope columns or define an explicit policy template.

### 2.7 RLS test suite

A dedicated test database. Two seed users, A and B. Each owns one Workspace, one World, one Saga, and full fixture data. Additional fixtures include two sibling Sagas inside the same World.

1. Authenticate as A. `SELECT count(*) FROM <table>` returns only A's rows.
2. Authenticate as A. Queries against B's `workspace_id`, `world_id`, or `saga_id` return zero.
3. Authenticate as A. Default retrieval/search cannot see a sibling Saga inside the same World.
4. Authenticate as A. Attempt every INSERT/UPDATE/DELETE against B's scope IDs; all fail.

Test runs in CI on every migration that touches `public.*`. A failure blocks the merge.

## 3. LiteLLM proxy (CF-3)

### 3.1 What the proxy is

LiteLLM is a thin HTTP service that exposes an OpenAI-compatible API and routes to multiple providers (Anthropic, OpenAI, Google, etc.) using a config file. Every AI call from the app — Edge Functions, Next.js API routes, the Whisper job — goes to the LiteLLM endpoint, never directly to a provider. PRD `AI-FR-1`.

### 3.2 Deployment shape

**Self-hosted container on Fly.io.** One container per environment, each with its own LiteLLM config and provider keys.

Why Fly over Vercel/Supabase Edge:

- **Persistent process.** LiteLLM benefits from keeping connection pools and warm clients to providers. Vercel's serverless lambdas cold-start; Fly machines stay warm.
- **Latency.** Fly lets us co-locate regions with Supabase (us-east-1) so the round-trip is internal.
- **Cost predictability.** A small always-on Fly machine is cheaper than per-invocation lambda billing at expected MVP volume, and the marginal cost of an extra synthesis call is zero infra-side.
- **Streaming.** LiteLLM streams responses. Fly handles long-running streaming connections cleanly; Vercel Edge Functions have a 25s limit that synthesis can blow through.

Trade-off accepted: one more service to operate. Mitigation: LiteLLM is a single container with a config file. There is no state. Restart = zero-downtime swap.

### 3.3 Tier-to-model mapping

The mapping lives in LiteLLM's `config.yaml`, source-controlled in the same repo as the Edge Functions. Initial map for alpha, with provider fallbacks configured for outage resilience:

```yaml
model_list:
  - model_name: relic-fast
    litellm_params:
      model: anthropic/claude-haiku-4-5-20251001
      api_key: os.environ/ANTHROPIC_API_KEY
  - model_name: relic-balanced
    litellm_params:
      model: anthropic/claude-sonnet-4-6
      api_key: os.environ/ANTHROPIC_API_KEY
  - model_name: relic-deep
    litellm_params:
      model: anthropic/claude-opus-4-7
      api_key: os.environ/ANTHROPIC_API_KEY

  # Fallback alternates — same logical tier, different provider.
  # LiteLLM's fallback router fires on 5xx from the primary.
  - model_name: relic-balanced
    litellm_params:
      model: openai/gpt-5
      api_key: os.environ/OPENAI_API_KEY
  - model_name: relic-deep
    litellm_params:
      model: google/gemini-2.5-pro
      api_key: os.environ/GEMINI_API_KEY

router_settings:
  routing_strategy: simple-shuffle
  fallbacks:
    - relic-fast: [relic-balanced]
    - relic-balanced: [relic-deep]
```

App-side, every AI call references `relic-fast`, `relic-balanced`, or `relic-deep`. Tier names are stable. The model behind a tier rotates via config redeploy; **no Registry consumer references model names directly** (Registry v1.0 §0.2).

The `fallbacks` block matters: if Anthropic returns 5xx, LiteLLM transparently retries against the next entry. The app sees a slower call, not a failure. Fallback firing rate is tracked as a PostHog `ai_call_fallback` event so we can spot provider degradation.

### 3.4 Embedding model

Embeddings go through LiteLLM too, but the model never rotates in MVP — Memory Spec §3.4 locks `text-embedding-3-small` (1536 dims). We still route through the proxy so model swaps don't require Edge Function redeploys:

```yaml
  - model_name: relic-embed
    litellm_params:
      model: openai/text-embedding-3-small
      api_key: os.environ/OPENAI_API_KEY
```

Hot-swap on model upgrade follows Memory Spec §10.4 (multi-version coexistence, atomic `is_current` flip).

### 3.5 Whisper

Whisper is not a chat model, but LiteLLM proxies audio endpoints too. Routing it through the proxy means a single secret store and a single observability surface for all model traffic:

```yaml
  - model_name: relic-transcribe
    litellm_params:
      model: openai/whisper-1
      api_key: os.environ/OPENAI_API_KEY
```

### 3.6 Secrets

Provider keys live in Fly's secret store, injected as env vars at boot. The app never sees them. Rotation is one command per provider; LiteLLM picks up new keys on the next container restart.

App-side authentication to LiteLLM uses a shared bearer token (`LITELLM_PROXY_KEY`), one per environment, stored in Supabase's secret manager and injected into Edge Functions. The proxy validates the token and refuses unauthenticated requests. This is not user-authentication — it's service-to-service. User identity flows through separately (request metadata for logging, not auth).

### 3.7 BYOK readiness without shipping BYOK

V1 BYOK requires per-saga or per-GM model selection. The proxy already supports it via LiteLLM's `user_api_key_auth` and per-key model lists — we just don't expose any UI for it in MVP.

To stay future-compatible without building BYOK now:

- The proxy already accepts a per-request `user` parameter (sent today for logging/observability). When BYOK ships, this same parameter routes to a per-GM virtual key.
- All model selection in app code is by tier (`relic-fast`, etc.). When BYOK ships, the proxy resolves the tier against the GM's chosen provider.
- No app code today encodes a model name. Lifting BYOK becomes "add a UI and a config table"; no path changes.

### 3.8 Observability

LiteLLM emits per-call metrics: provider, model, tokens in/out, latency, cost. These ship to PostHog as a single `ai_call` event (§16) so we have one dashboard for "what tasks are expensive."

LiteLLM also logs the prompt and response. Storage of those logs is short-lived (7 days) and per-environment. Not for analytics — for debugging when a draft looks wrong.

---

## 4. Edge Functions

### 4.1 Inventory

Every async surface in the system. For each: trigger, idempotency, retries, queue mechanism.

| Function | Trigger | Idempotency key | Retry | Queue |
|---|---|---|---|---|
| `embed-row` | DB trigger via `pg_net` → HTTP call | `(source_kind, source_entity_id, model, model_version)` | 5 retries, exponential backoff (1s, 4s, 16s, 60s, 240s) | `internal.embedding_jobs` |
| `transcribe-session` | DB trigger when all `audio_chunks` for session uploaded | `session_id` | 3 retries with backoff (10s, 60s, 300s) | `internal.transcription_jobs` |
| `synthesize-session` | DB trigger when `pipeline_runs.state` flips to `'synthesizing'` | `pipeline_run_id` | 2 retries on transient; visible failure surface on persistent (per Registry Q11) | `internal.synthesis_jobs` |
| `end-session-flip` | `pg_cron` every 30s | `(session_id, generation)` | Idempotent — re-running is a no-op | None (cron-driven) |
| `cleanup-audio` | DB trigger when `transcripts.state` flips to `'complete'`, if saga's `audio_retention='delete_after_transcription'` | `transcript_id` | 3 retries | `internal.cleanup_jobs` |
| `cleanup-saga` | DB trigger on `sagas.deleted_at` set | `saga_id` | 5 retries | `internal.cleanup_jobs` |
| `detect-mentions` | DB trigger on entity save, debounced 5s | `(source_entity_type, source_entity_id, content_hash)` | 3 retries | `internal.mention_jobs` |
| `stale-pipeline-warning` | `pg_cron` daily at 03:00 UTC | `pipeline_run_id + warning_stage` | None (re-runs are no-ops; idempotent) | None (cron-driven) |
| `export-saga` | HTTP from app (GM hits Export) | `(saga_id, requested_at)` | 1 retry on transient; surface failure to GM | `internal.export_jobs` |
| `issue-scoped-jwt` | Internal call from other Edge Functions | None — synchronous | None — caller retries | None |
| `send-notification` | DB trigger on `internal.notification_queue` insert | `(notification_id)` | 3 retries with backoff (5s, 30s, 120s) | `internal.notification_queue` |
| `transcript-edit-reembed` | `pg_cron` every 5min OR pipeline-close trigger | `pipeline_run_id` | 3 retries | `internal.transcript_edit_jobs` |

Each function lives in `supabase/functions/<name>/index.ts`, deployed via `supabase functions deploy`.

### 4.2 The trigger → Edge Function bridge

Supabase doesn't natively call Edge Functions from triggers. We use `pg_net` (extension §1.3) to fire an async HTTP POST from the trigger function:

```sql
-- Example: enqueue an embedding job on entity content change
create or replace function public.enqueue_embedding_job()
returns trigger
language plpgsql
security definer  -- only for queue insertion; the job itself does NOT use definer
as $$
begin
  insert into internal.embedding_jobs (saga_id, source_kind, source_entity_id, gm_id, debounce_until)
  values (new.saga_id, 'entity', new.id, auth.uid(), now() + interval '5 seconds')
  on conflict (source_kind, source_entity_id) do update
    set debounce_until = excluded.debounce_until,
        gm_id = excluded.gm_id,
        attempts = 0;

  perform net.http_post(
    url := current_setting('app.edge_functions_url') || '/embed-row-dispatch',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.internal_token')),
    body := jsonb_build_object('saga_id', new.saga_id, 'source_id', new.id)
  );
  return new;
end;
$$;
```

**Why `security definer` on the trigger.** The trigger needs to write to `internal.embedding_jobs`, which the GM has no privilege on. The function runs as the table owner. **This is the only use of `security definer` for queue inserts**, and it does not bypass RLS for any user data — it just writes a job row.

The Edge Function on the receiving end (`embed-row-dispatch`) reads the job from the queue, issues a scoped JWT (§5) for the recorded `gm_id`, and re-enters Postgres as that user to do the actual work.

### 4.3 Idempotency model

Every job carries an idempotency key (column on the queue table). The Edge Function:

1. Reads the job row, marks it `state='running'` with a row-level lock (`SELECT ... FOR UPDATE SKIP LOCKED`).
2. Performs the work.
3. On success: marks the job `state='complete'`, sets `completed_at`.
4. On transient failure: increments `attempts`, schedules retry, marks `state='pending'`.
5. On permanent failure: marks `state='failed'`, sets `failure_reason`.

`SKIP LOCKED` means concurrent dispatchers don't double-process. If the function crashes mid-run (no `state='complete'`), a watchdog cron resets the job to `state='pending'` after a timeout (typically 10× expected latency).

### 4.4 Retry policy

Exponential backoff, jittered. Different curves for different jobs:

- **Embedding:** retries are cheap and the source data is stable. 5 attempts, base 1s, multiplier 4×, jitter ±25%.
- **Transcription:** retries are expensive (Whisper cost). 3 attempts, base 10s, multiplier 6×, jitter ±25%.
- **Synthesis:** retries are very expensive. 2 attempts, base 30s. After 2 failures, the pipeline_run flips to `state='failed'` and the GM sees a visible-retry button (Registry Q11).
- **Audio/saga cleanup:** retries on Storage 5xx. 5 attempts, base 5s, multiplier 3×.
- **Notifications:** retries on transient SMTP/push-service errors. 3 attempts, base 5s, multiplier 6×.

### 4.5 Dead-letter handling

Jobs that exhaust retries land in `internal.dead_letter_jobs` with full context. PostHog fires an alert; the operator inspects and either re-enqueues manually or accepts the loss. For GM-visible jobs (synthesis, transcription, notifications), the user sees a clear retry affordance — no silent loss.

---

## 5. JWT issuance for async jobs (CF-6, security-critical)

### 5.1 The problem

Memory Spec §11.3 mandates: embedding jobs (and by extension, anything async that writes user data) run **as the GM who triggered the change**. No `SECURITY DEFINER`. RLS applies normally. This protects against bugs that would otherwise bypass tenancy at the queue layer.

We need a way for an Edge Function — running as `service_role` — to mint a Postgres JWT scoped to a specific GM and use it for the actual data operations.

### 5.2 The mechanism: dedicated issuer function

A single Edge Function, `issue-scoped-jwt`, is the **only** function that holds the JWT secret. All other Edge Functions call it via internal HTTP to obtain a scoped token.

```typescript
// issue-scoped-jwt Edge Function — the ONLY function with SUPABASE_JWT_SECRET in its env
import { create, getNumericDate, Header, Payload } from "jwt";

const JWT_SECRET = Deno.env.get("SUPABASE_JWT_SECRET")!;
const INTERNAL_TOKEN = Deno.env.get("INTERNAL_TOKEN")!;
const ALGORITHM = "HS256";

Deno.serve(async (req) => {
  // Service-to-service auth: only other Edge Functions in the same project can call this.
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${INTERNAL_TOKEN}`) {
    return new Response("forbidden", { status: 403 });
  }

  const { gm_user_id, purpose } = await req.json();
  if (!gm_user_id || !purpose) {
    return new Response("missing parameters", { status: 400 });
  }

  const header: Header = { alg: ALGORITHM, typ: "JWT" };
  const payload: Payload = {
    sub: gm_user_id,
    role: "authenticated",
    aud: "authenticated",
    iss: "supabase",
    iat: getNumericDate(0),
    exp: getNumericDate(60 * 5),  // 5-min TTL
    // No service_role claim. No admin claim.
    purpose,  // for audit logging only
  };
  const token = await create(header, payload, JWT_SECRET);

  // Log issuance (PostHog `jwt_issued` event) for audit visibility.
  return new Response(JSON.stringify({ token }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

**Why a dedicated function and not in-process minting in every Edge Function.** Centralizing the secret to one function means:

- One place to audit; one function to monitor for anomalies.
- The blast radius of an Edge Function compromise is bounded — only `issue-scoped-jwt` leaks the secret if it falls; the others can be inspected without secret-exposure risk.
- Future rate-limiting or anomaly detection on JWT issuance has a single hook.
- Rotation requires updating one function's env, not many.

The added ~50ms per-call round-trip is invisible against embedding job latency (which is dominated by the LiteLLM embedding call at 200–800ms). For synthesis and transcription jobs, 50ms is negligible.

### 5.3 Usage pattern

Inside `embed-row` (or any other job-handling function):

```typescript
async function approveScopedClient(gmId: string, purpose: string): Promise<SupabaseClient> {
  const res = await fetch(`${EDGE_FUNCTIONS_URL}/issue-scoped-jwt`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${INTERNAL_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ gm_user_id: gmId, purpose }),
  });
  if (!res.ok) throw new Error("jwt issuance failed");
  const { token } = await res.json();
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

// Usage:
const job = await dequeueJob();
const supabase = await approveScopedClient(job.gm_id, "embed_row");
// Now every supabase.from(...) call runs under the GM's identity. RLS applies.
await supabase.from("embeddings").insert({ ... });
```

Other job functions never touch the JWT secret directly.

### 5.4 What goes wrong if we got this wrong

If we used `service_role` for embedding writes, a bug in the queue dispatcher that mis-routed a job (e.g., embedded saga A's content into saga B's row) would be undetectable until query time, by which point cross-Workspace/World/Saga contamination is already in the index. With scoped JWTs, the same bug fails noisily: the INSERT is denied by RLS.

### 5.5 Test surface

A dedicated security test:

1. Create users A and B, each with one saga.
2. Insert a corrupted job in `internal.embedding_jobs` with A's `saga_id` but B's `gm_id`.
3. Run the dispatcher.
4. Confirm the INSERT fails (B doesn't own A's saga). The job moves to `failed` with a clear reason. No row lands in `embeddings`.

Additional test specific to the dedicated issuer:

5. Call `issue-scoped-jwt` without `INTERNAL_TOKEN`. Confirm 403.
6. Call `issue-scoped-jwt` with `INTERNAL_TOKEN` but missing `gm_user_id`. Confirm 400.

These tests run in CI.

### 5.6 JWT secret rotation

Same lifecycle as Supabase Auth's JWT secret. When rotated:

1. Update `issue-scoped-jwt`'s `SUPABASE_JWT_SECRET` env var.
2. In-flight scoped JWTs (≤5 min old) signed with the old secret remain valid for their TTL.
3. New issuances use the new secret immediately.
4. Total disruption window: ~0 (in-flight tokens self-expire).

Other Edge Functions do not need to be redeployed during rotation — they don't hold the secret.

---

## 6. Embedding job queue (CF-5, CF-7)

### 6.1 Scheduling: trigger-driven, not cron

Memory Spec §11.3 sets a p95 < 60s SLO. Cron polling at 30s intervals can't meet that; trigger-driven dispatch can. The full mechanism:

1. **Postgres trigger** on entity, note, and transcript content changes (Schema-defined columns only — Memory Spec §3.2 enumerates them) writes a row to `internal.embedding_jobs` and fires an `pg_net` POST to the dispatcher Edge Function.
2. **Dispatcher** (`embed-row-dispatch`) reads pending jobs, picks one with `SKIP LOCKED`, processes it.
3. **Watchdog cron** (every minute) re-enqueues stalled jobs (running for > 60s without completion).

Cron is the failsafe; the trigger is the fast path.

### 6.2 Queue table

```sql
create schema if not exists internal;

create table internal.embedding_jobs (
  id                  uuid primary key default gen_random_uuid(),
  saga_id             uuid not null,                        -- not FK; cascade-on-saga-delete handled at app
  source_kind         text not null,                        -- 'entity' | 'note' | 'transcript_chunk' | 'attached_lore_fanout'
  source_entity_type  text,
  source_entity_id    uuid not null,
  gm_id               uuid not null,                        -- the user whose action triggered this
  fanout_root_id      uuid,                                 -- for rename/lore-attachment fanout; groups related jobs
  state               text not null default 'pending',      -- 'pending' | 'running' | 'complete' | 'failed'
  attempts            int not null default 0,
  debounce_until      timestamptz not null default now(),
  scheduled_at        timestamptz not null default now(),
  started_at          timestamptz,
  completed_at        timestamptz,
  failure_reason      text,
  created_at          timestamptz not null default now(),
  unique (source_kind, source_entity_id)                    -- enforces dedup at row level
);
create index on internal.embedding_jobs (state, debounce_until) where state = 'pending';
create index on internal.embedding_jobs (saga_id);
create index on internal.embedding_jobs (fanout_root_id) where fanout_root_id is not null;
```

The `unique (source_kind, source_entity_id)` constraint is the keystone: multiple edits to the same entity inside the debounce window collapse to one row via `ON CONFLICT DO UPDATE`. Idempotent by construction.

`internal` schema has no RLS. Service role only.

### 6.3 Deduplication and debouncing

The trigger pattern from §4.2 already does both:

- **Dedup:** `ON CONFLICT (source_kind, source_entity_id) DO UPDATE` ensures one row per logical job. Repeated edits don't queue multiple times.
- **Debounce:** Each conflict update bumps `debounce_until = now() + 5s`. The dispatcher selects `WHERE debounce_until <= now()`, so a typing GM doesn't trigger 50 embeddings — only the last one fires.

Tunable per source-kind: entities use 5s; transcript chunks use 0s (they only ever generate once, no rapid edits).

### 6.4 Fanout handling

Two heavy-fanout cases (Memory Spec §11.4):

**Entity rename.** Renaming an NPC changes the embedded text of the entity itself **and** every lore note attached to that entity (because Memory Spec §4.1 includes attached lore in the entity's retrieval surface — though the lore note's *own* embedding doesn't change, just its attribution context). For MVP we only re-embed the entity itself on rename. Attached lore notes don't re-embed; their text didn't change. Mention re-detection (§10) handles the name-string updates across other entities.

**Lore note edited where attached to N entities.** The lore note re-embeds once. The attached entities' embeddings don't change — entities embed their own `name + summary + narrative` (Schema §12.3), not the lore note bodies. The lore is retrieved as a separate result via the hybrid retrieval (Memory Spec §3.3, §5).

Net result: fanout is bounded. Heavy-fanout cases enqueue at most one job for the entity plus one job for the lore note (if its body changed). Memory Spec §11.4's concern of "tens of jobs" applies only to mention re-detection (§10), not embedding regen.

When the queue does see a burst (e.g., from a multi-section synthesis approval that touches 8 entities), all jobs share a `fanout_root_id` so queue-depth monitoring can group them.

### 6.5 Queue-depth surfacing

The saga settings page in the Sanctum shows current queue depth when it exceeds a threshold (Memory Spec §11.3). Threshold: >5 pending jobs for the saga.

```sql
-- Exposed as a Postgres function (RLS-aware via Workspace/World/Saga helper functions)
create or replace function public.embedding_queue_depth(p_saga_id uuid)
returns int
language sql
stable
as $$
  select count(*)::int
  from internal.embedding_jobs
  where saga_id = p_saga_id
    and state in ('pending', 'running')
$$;
```

Called by `service_role` via an RPC; the RPC itself checks the full Workspace/World/Saga chain before returning the count. Internal table stays internal; the caller can't read individual jobs, only the count.

### 6.6 Re-embedding cadence for edited transcripts (CF-20)

Transcript editing is supported in MVP (§7.9). Re-embedding cadence is **pipeline-close-only** to bound cost: edits during the pipeline review window accumulate locally; a single re-embed pass runs when the GM closes the pipeline_run.

Implementation: `transcript-edit-reembed` Edge Function fires on `pipeline_runs.state` flip to `'closed'`. It compares `transcripts.segments` against the pre-edit snapshot (stored in `transcripts.original_segments` jsonb, written once on first edit) and re-embeds only the segments whose text changed.

Edits between sessions (after pipeline close) are vanishingly rare but supported: the same Edge Function runs on direct `transcripts.segments` update, debounced 30s. The Sanctum surface shows "Re-embedding transcript edits…" status during the regen window.

---

## 7. Transcription pipeline

### 7.1 Audio capture and upload

Stage records audio in 30-second chunks (native on mobile; MediaRecorder on web — PRD `STG-FR-15`). Each chunk uploads to Supabase Storage at `audio/<workspace_id>/<world_id>/<saga_id>/<session_id>/<sequence>.webm` (or `.m4a` on iOS) and a row lands in `audio_chunks` (Schema §8.4).

Chunks upload as connectivity allows. Out-of-order uploads are fine — `sequence` orders them at assembly time. The Stage shows pending-upload counts in the recording status pill.

On web, each `dataavailable` Blob is committed to IndexedDB before upload begins. Upload retry reuses the same deterministic path, sequence, and registration idempotency key. Local data is deleted only after both Storage upload and `register_audio_chunk` succeed.

### 7.2 Trigger to transcribe

When recording ends, the client declares `audio_chunk_count_expected` through the scoped finalization RPC. When the session flips to `state='ended'` (after the 60s undo elapses, §14.6 below), a trigger checks:

- `recording_finalized_at` is set and registered `audio_chunks` meet `audio_chunk_count_expected`.
- A pending `transcripts` row and transcription job are created idempotently once the complete declared chunk set exists.

If both are true, the trigger enqueues a transcription job. If chunks are still uploading, a poll on chunk-upload-complete trigger re-checks.

### 7.3 Whisper API call

The `transcribe-session` Edge Function:

1. Issues a scoped JWT (§5) for the session's GM.
2. Reads all `audio_chunks` for the session, ordered by `sequence`.
3. **Assembles them into a single audio file** in memory (or scratch storage). Whisper takes one audio file per call; chunked uploads were for resilience, not for parallel transcription.
4. Calls Whisper via LiteLLM (`relic-transcribe` model alias).
5. Writes the segments (timestamps + text) to `transcripts.segments`. Sets `state='complete'`, populates `whisper_model`, `language`, `duration_seconds`.
6. Fires the post-completion trigger: enqueue embedding jobs for transcript chunks (Memory Spec §4.3), advance `pipeline_runs.state` to `'synthesizing'`, optionally trigger audio cleanup (§7.5).

The shipped worker keeps the GM-scoped client on session/audio metadata and private Storage reads. Job claim, completion, and failure cross explicit `*_for_worker` RPCs that are executable only by `service_role`; browser/authenticated clients cannot invoke them. The provider adapter sends multipart audio to `/audio/transcriptions` with the stable `relic-transcribe` alias and requests `verbose_json`, then rejects malformed or non-monotonic segment timestamps before writing. LiteLLM/provider keys stay in Edge Function secrets and are never exposed through browser configuration. `TRANSCRIPTION_PROVIDER_MODE=test` exists only for deterministic local verification and is not evidence that the hosted provider route works.

**Assembly memory cost.** A 4-hour session at 64kbps mono ≈ 115 MB. Edge Functions have a 256MB memory limit on the default plan. For sessions >3 hours we fall back to streaming the chunks through a temporary Storage path and pointing Whisper at that URL via signed URL.

### 7.4 Chunked audio assembly trade-off

We considered transcribing chunks independently and concatenating segments. Rejected because:

- Whisper handles word boundaries poorly when a chunk splits mid-word; re-assembling segments needs overlap handling.
- Per-chunk API calls are N× more expensive than one call with the same total minutes.
- One call gives global language detection; chunked calls would need per-chunk detection and stitching.

Single-call transcription is more memory-intensive but cheaper, more accurate, and simpler.

### 7.5 Audio cleanup

If the saga's `audio_retention='delete_after_transcription'` (default per Schema §2.2), the post-completion trigger enqueues `cleanup-audio`:

```typescript
// cleanup-audio Edge Function
async function cleanupAudio(transcriptId: string) {
  const supabase = await approveScopedClient(job.gm_id, "cleanup_audio");

  // Find chunks
  const { data: chunks } = await supabase
    .from("audio_chunks")
    .select("storage_path, id")
    .eq("session_id", session_id);

  // Delete from Storage (RLS on storage.objects covers this)
  await supabase.storage
    .from("audio")
    .remove(chunks.map(c => c.storage_path));

  // Mark chunks deleted (preserve row for audit)
  await supabase.from("audio_chunks").update({ deleted_at: new Date() }).in("id", chunks.map(c => c.id));
}
```

If retention is `'retain'`, this function is never enqueued; chunks persist until saga delete.

### 7.6 Failure surface

Whisper failures bubble to the pipeline (`synthesize_session`, Registry v1.0 §6; PRD `PSP-FR-8` edge case). The pipeline does **not** fail outright if other inputs survived (pasted notes, GM summary, quick captures). It marks `transcripts.state='failed'` with a clear reason, sets `pipeline_runs.inputs_summary.transcript_failed=true`, and proceeds to `synthesizing` with whatever else exists.

If the pipeline has **no surviving input** (recording-only session, transcription failed), `pipeline_runs.state='failed'` with `failure_reason='no_inputs_after_transcription_failure'`. The GM sees a clear retry CTA in the pipeline UI: re-upload audio, paste notes, or add a manual summary. Per Registry Q11: pipeline tasks use visible retry, not silent.

Retries reuse the same transcription job and complete idempotently. Retryable provider/network failures follow the existing `10s / 60s / 300s` schedule. After exhaustion, the stored audio remains available; an explicit GM retry resets the job to `pending`, clears safe failure/lock fields, restores the transcript to `pending`, and returns the pipeline to `queued`. Sessions with surviving non-audio evidence may continue to synthesis, while recording-only sessions remain visibly failed until retry or manual evidence is added.

### 7.7 Language handling

Whisper auto-detects language by default. We store the detected language in `transcripts.language` for future filtering and reporting.

**MVP behavior:** English is the default text-search config (Memory Spec §13 deferral). Non-English transcripts will transcribe and embed fine (the embedding model is multilingual), but the BM25 arm uses English stemming, which degrades for other languages. Per Memory Spec §14 V1 list, per-saga `text search configuration` is deferred.

For non-English sagas in MVP: retrieval still works (semantic arm carries most of the weight), but BM25 results may rank oddly. We document this in saga settings as a known limitation. We do **not** ship per-saga BM25 config until we have real non-English usage data — the configuration surface is non-trivial (Postgres needs a matching `text search configuration`, requires per-language dictionaries) and over-building before evidence is a trap.

### 7.8 Audio upload mechanism

Direct client-to-Storage uploads using the authenticated Supabase client. No Edge Function proxy. Security is enforced by Storage RLS (§2.5) — a GM can only write under paths for Workspaces/Worlds/Sagas they own. The client handles chunk sequencing and retry; partial uploads resume by re-POSTing the failed chunk.

Bandwidth doesn't pass through our servers, which keeps costs predictable and removes a memory-pressure point that an Edge Function proxy would introduce.

### 7.9 Transcript editing (CF-20)

Transcripts are editable during the pipeline review window. The Sanctum exposes the same entity-editor surface used for other entities, scoped to transcript segments: each segment is an inline-editable text block with its timestamp range labeled.

**Edit constraints.**

- Edits to segment text only. Timestamps, segment boundaries, and audio chunk references are immutable.
- Deleting a segment is a soft action: the segment is marked `deleted=true` in the jsonb; the visible transcript hides it but its `start`/`end` remain so source citations don't break.
- Adding new segments is forbidden in MVP. (V1 may allow inserting clarification notes inline.)

**Storage shape.** The `transcripts.segments` jsonb already holds the segment array. We add `transcripts.original_segments` (jsonb, nullable) — written once on first edit to preserve the Whisper output for diffing. Any future read of "pre-edit transcript" uses this column.

The shipped web review reads this lifecycle through `get_session_review`, renders audio/transcription/synthesis as separate states, and exposes `retry_session_transcription` only after a failed transcription. The editor submits text and soft-delete changes through the existing scoped transcript update RPC; it never permits timestamp mutation or segment insertion. This review surface is evidence management only. It does not approve a draft or mutate canon.

**The citation-drift problem.** Sources captured during pipeline synthesis store `raw_excerpt` (the relevant transcript text at draft creation, Schema §8.1). That field is **frozen** — it does not update when the transcript is edited. This is correct: the draft was reasoned about based on the text at capture time; rewriting the citation retroactively would falsify the audit trail.

But it means after editing, the transcript can drift from what the source view shows. A GM clicking through to "see the cited segment in context" might find the live transcript reads differently.

**The drift indicator.** When the source view loads a `transcript_segment` source, it compares `sources.raw_excerpt` against the live `transcripts.segments` at the same timestamp range. If they differ:

```
┌──────────────────────────────────────────────────────────┐
│ ⚠ This transcript segment was edited after the citation. │
│   The cited evidence (preserved) shows what the proposal │
│   was based on; the live transcript shows the current    │
│   version. [Show both]                                   │
└──────────────────────────────────────────────────────────┘
```

The default view shows `raw_excerpt`; `[Show both]` toggles to a side-by-side diff. Source-view UI lives in the Approval Queue Spec; this spec owns the comparison logic and the indicator's data contract:

```typescript
interface TranscriptSourceWithDrift {
  source_id: string;
  raw_excerpt: string;          // frozen, from sources.raw_excerpt
  current_text: string | null;  // live, from transcripts.segments at same range
  drift_detected: boolean;      // raw_excerpt !== current_text after normalization
  current_text_deleted: boolean; // segment marked deleted=true in jsonb
}
```

Normalization for the diff check trims whitespace and collapses multiple spaces — minor formatting changes don't trigger the indicator. Substantive text changes do.

**Re-embedding cadence.** Edits accumulate locally on the segment rows. Re-embedding runs at pipeline close (§6.6) — `transcript-edit-reembed` Edge Function diffs `original_segments` against current `segments`, re-embeds only the changed segments. Chunk overlap (Memory Spec §4.3) means a segment edit may also re-embed the adjacent chunk window; the function handles this.

**Cost ceiling.** Worst case: GM edits every segment in a 4-hour transcript (~240 segments → ~240 chunks at 60s windows). At ~0.05¢/embedding that's ~12¢ per session. Acceptable.

---

## 8. Stage statement timeout and BM25 fallback (CF-8)

### 8.1 Statement timeout configuration

Memory Spec Decision 13 sets the contract: Stage search caps at 800ms with BM25-only fallback on timeout. Implementation:

**A dedicated database role** for Stage-surface queries.

```sql
create role stage_query nologin;
grant authenticated to stage_query;  -- inherits authenticated grants
alter role stage_query set statement_timeout = '800ms';
```

The Edge Function (or Next.js API route) handling Stage search switches role via `SET ROLE stage_query` at the start of the transaction. The 800ms timeout fires automatically; Postgres aborts the query with a `57014` SQLSTATE.

### 8.2 Fallback path

The application catches `57014` (statement_timeout) from the hybrid query and re-issues a BM25-only query against the same predicates:

```typescript
async function stageSearch(sagaId: string, query: string): Promise<SearchResult[]> {
  try {
    return await supabase.rpc("search_for_ui", {
      saga_id: sagaId,
      query_text: query,
      surface: "stage",
      top_k: 10,
    });
  } catch (err) {
    if (isStatementTimeout(err)) {
      logTimeoutMetric({ saga_id: sagaId, query, duration_ms: 800 });
      return await supabase.rpc("search_for_ui", {
        saga_id: sagaId,
        query_text: query,
        surface: "stage",
        top_k: 10,
        literal_only: true,  // BM25-only
      });
    }
    throw err;
  }
}
```

Stage-surface timeouts are logged separately (PostHog event `stage_search_timeout`) so the embedding-arm slow-path gets visibility. If timeouts exceed 1% of Stage searches, we revisit HNSW params (§9) or top-k (Memory Spec §10.7).

The Sanctum surface uses the default `authenticated` role with no statement timeout (or the platform-default 8s) — Sanctum tolerates slower retrieval (Memory Spec §6.1: 1-3s budget).
**session prep workspace role.** session prep workspace uses a separate composition-oriented role, not `stage_query`. Prep synthesis and packet editing tolerate slower reads than table search, but should still avoid unbounded statements.

```sql
create role prep_query nologin;
grant authenticated to prep_query;
alter role prep_query set statement_timeout = '3000ms';
```

Use `prep_query` for session prep workspace packet preview, agenda search, and prep-grounding reads. LLM generation still runs through Edge Functions and task-level budget checks; this role is only for session prep workspace UI/query composition work.


### 8.3 Why not a fallback inside the SQL function

We considered embedding the fallback inside `search_for_ui` itself (catch timeout in PL/pgSQL, retry without the vector arm). Rejected because:

- PL/pgSQL can't catch its own statement-level timeouts inside the same statement.
- A retry-inside-function would need a session-level timer reset which conflicts with the pooler's transaction-mode pinning.
- App-level catch is one line of code and has full visibility into which arm failed.

---

## 9. HNSW index parameters (CF-9)

### 9.1 The three knobs

pgvector's HNSW index has three parameters:

- `m` — connectivity per node (build-time). Higher = better recall, more memory.
- `ef_construction` — search depth at build time. Higher = better-quality index, slower build.
- `ef_search` — search depth at query time. Higher = better recall, slower queries.

### 9.2 Initial MVP values

```sql
create index embeddings_hnsw on public.embeddings
using hnsw (vector vector_cosine_ops)
with (m = 16, ef_construction = 64)
where is_current = true;

-- Query-time setting, applied per session
set hnsw.ef_search = 40;
```

**Why these values.**

- **`m = 16`** is pgvector's default and matches the original HNSW paper's recommendation for general-purpose embedding search. With 1536-dim vectors and an expected MVP scale of ≤500K embedding rows per Supabase project (≤500-entity sagas × thousands of GMs), `m=16` gives 95–98% recall at p95 latency well under our budgets.
- **`ef_construction = 64`** is pgvector's default. Higher (128, 256) gives marginally better recall at 2-4× index-build time. Build time matters because we re-build the index when migrating embedding models (Memory Spec §10.4 phase 2). 64 keeps that migration under an hour for a typical saga.
- **`ef_search = 40`** balances recall and latency. The pgvector docs recommend `ef_search ≥ top_k`. Top-k peaks at 50 (large-context AI tasks per Memory Spec §10.7); `ef_search = 40` is intentionally below the max-top-k because we always run BM25 alongside (RRF) — vector-arm recall doesn't need to be perfect when the lexical arm catches the spillage.

### 9.3 Partial index

The `WHERE is_current = true` clause is critical (Schema §7.1). During an embedding-model migration, old and new vectors coexist; only `is_current` rows are served. The partial index keeps the active set small and the migration cheap (Memory Spec §10.4 phase 4 — atomic flip is just an UPDATE to `is_current`, no re-index).

### 9.4 Tuning trigger

We log per-query: vector-arm latency, BM25-arm latency, RRF final top result's rank in each arm. After alpha (real saga sizes, real query patterns), we revisit:

- If vector-arm recall is <90% on our eval harness (Memory Spec §9): raise `ef_search` to 60–80.
- If p95 vector latency exceeds 200ms: lower `ef_search`, or raise `m` and rebuild.
- If we move past ~1M total embeddings per project: re-evaluate `m=16` (the HNSW paper suggests `m=24-32` for very large indexes).

`ef_search` is runtime-tunable without rebuild — we ship at 40 and adjust based on eval data.

### 9.5 Trade-off in plain English

**Higher recall vs. lower latency.** HNSW gives up exactness for speed. Our hybrid retrieval (RRF over BM25 + vector) hides individual-arm misses — if vector misses a relevant chunk, BM25 might catch it. This lets us run lower `ef_search` than a vector-only system would tolerate. Net: we get sub-100ms vector retrieval at 95% recall, knowing BM25 fills the gap on the 5% miss rate.

**Build cost vs. query cost.** `ef_construction = 64` is fast to build (minutes for a typical saga). Raising to 200 buys ~1% recall at 3× build time. Not worth it for MVP. Revisit if recall plateaus on our eval set.

---

## 10. Token counting and budget pre-checks (CF-4)

### 10.1 Library choice

**`tiktoken`** for OpenAI-family models and **`@anthropic-ai/tokenizer`** for Anthropic models. Both are deterministic byte-pair tokenizers; both ship as small npm packages compatible with Deno (Edge Functions) and Node (Next.js).

We do not use a generic estimator like character-divided-by-4 because:

- The budget check is load-bearing for the pass-split decision (Registry Q7: `(transcript_tokens + canon_context_tokens) > model_context_limit * 0.7`). An estimator wrong by 15% would split when we shouldn't or fail to split when we should.
- Cost reporting (PostHog `ai_call` event) needs accurate counts for usage tracking against the Pricing & Rate Limits caps (carry-forward item 2).

For Gemini (no public tokenizer): use the Anthropic tokenizer as approximation. Log the post-call drift (actual vs. estimated tokens) in `ai_call` events; if drift exceeds ±5% systematically, we revisit.

### 10.2 The pre-call check

Every AI task that takes user-provided input runs a budget pre-check before assembly:

```typescript
import { Tiktoken } from "@dqbd/tiktoken";
import { AnthropicTokenizer } from "@anthropic-ai/tokenizer";

interface BudgetCheck {
  task_name: string;
  model_tier: "fast" | "balanced" | "deep";
  context_limit: number;       // resolved per model
  budget_ratio: number;         // 0.7 default per Q7
  retrieved_context_tokens: number;
  untrusted_input_tokens: number;
  system_prompt_tokens: number;
  total: number;
  exceeds_budget: boolean;
}

async function preCheckBudget(task: TaskName, inputs: TaskInputs): Promise<BudgetCheck> {
  const tokenizer = tokenizerForTier(task.model_tier);
  const systemPromptTokens = tokenizer.encode(task.system_prompt).length;
  const untrustedTokens = inputs.untrusted_blob
    ? tokenizer.encode(inputs.untrusted_blob).length
    : 0;
  const retrieved = await retrieveForTask(task.profile, inputs.query);
  const retrievedTokens = tokenizer.encode(assemble(retrieved)).length;
  const total = systemPromptTokens + untrustedTokens + retrievedTokens;
  const limit = MODEL_CONTEXT_LIMITS[task.model_resolved];
  return {
    task_name: task.name,
    model_tier: task.model_tier,
    context_limit: limit,
    budget_ratio: 0.7,
    retrieved_context_tokens: retrievedTokens,
    untrusted_input_tokens: untrustedTokens,
    system_prompt_tokens: systemPromptTokens,
    total,
    exceeds_budget: total > limit * 0.7,
  };
}
```

If `exceeds_budget`, the caller invokes the task's pass-split policy (`synthesize_session` in Registry v1.0 §6 owns its ordered-pass merge behavior). Single-pass tasks degrade gracefully by tightening retrieval top-k.

### 10.3 Model context limits

Hard-coded constants per resolved model. Updated when LiteLLM config rotates:

```typescript
const MODEL_CONTEXT_LIMITS: Record<string, number> = {
  "anthropic/claude-haiku-4-5-20251001": 200_000,
  "anthropic/claude-sonnet-4-6": 200_000,
  "anthropic/claude-opus-4-7": 200_000,
  "openai/gpt-5": 400_000,
  "google/gemini-2.5-pro": 1_000_000,
  // embedding/transcribe models excluded — their input limits don't apply here
};
```

The map lives alongside the LiteLLM config and is updated when models rotate. The constant is a known-fragile point; we'd love LiteLLM to expose this metadata. Until then: one PR for both files when a model changes.

### 10.4 Budget tracking and cost reporting

After every LLM call, the actual token counts (from the response, not pre-computed) ship to PostHog. The pre-check `total` and the post-call `tokens_in` should match within ±2% for Claude and OpenAI models, ±5% for Gemini. Drift alerts at >5% on Claude/OpenAI, >10% on Gemini.

---

## 11. Mention detection placement (CF-10)

### 11.1 Decision: split between Postgres and the Edge Function

Mention detection is infrastructure in MVP, not a standalone LLM task. The pipeline has two stages:

- **Stage 1 — exact name match.** Pure Postgres. Fast, deterministic, no embedding cost.
- **Stage 2 — embedding-cosine fallback for noun-phrase candidates.** Edge Function, because it needs an embedding call.

Stage 1 in Postgres because the operation is a simple `ILIKE` / `to_tsvector @@` query that's already RLS-aware. Stage 2 in an Edge Function because it needs LiteLLM access (for the embedding call) and longer compute budgets than a trigger can have.

### 11.2 Stage 1 in detail

A Postgres function called by the entity-save trigger:

```sql
create or replace function public.detect_exact_mentions(
  p_saga_id uuid,
  p_source_entity_type entity_type,
  p_source_entity_id uuid,
  p_text text
)
returns table (mentioned_entity_type entity_type, mentioned_entity_id uuid, offsets int4range[])
language plpgsql
security invoker  -- runs as the GM whose trigger fired
as $$
begin
  return query
  -- Search every entity table in the saga for word-boundary name matches in p_text.
  -- One UNION ALL per entity type. Saga scope inherits via RLS.
  -- Returns offsets via regexp_matches with word boundaries.
  -- ...
end;
$$;
```

The trigger then UPSERTs into `mentions` (Schema §5.2) with `state='suggested'`.

### 11.3 Stage 2 in detail

Stage 2 runs only when Stage 1 produced zero matches **and** the source text is >100 chars. This is the MVP-conservative posture: Stage 1 catches the common case; Stage 2 catches the "the silver-haired merchant" case when there's no name to anchor on.

The job:

1. Extracts candidate noun phrases from the source text using an infrastructure heuristic: title-cased multi-word phrases, definite-article phrases, and descriptive epithets.
2. For each candidate ≥3 words, computes an embedding via LiteLLM (`relic-embed`).
3. Cosine-compares against `embeddings` filtered to `source_kind='entity'`, `saga_id=p_saga_id`, `is_current=true`.
4. Matches with cosine > 0.82 are inserted into `mentions` with `state='suggested'`.

Stage 2 runs async because (a) it adds latency the GM doesn't need on save (Stage 1 covers the common case), and (b) it costs an embedding call per candidate.

V1 may expand Stage 2 to fire even when Stage 1 produces matches, catching descriptive references that coexist with names. Memory Spec §14 already lists this as deferred. Don't expand in MVP — Stage 1 alone is the productive baseline.

### 11.4 Why not all in Postgres

pgvector can do the cosine math; the Postgres function could embed via `pg_net` + LiteLLM. We considered it. Rejected because:

- Triggers should be fast and not call external services. The 5s debounce on embedding jobs (§6.3) already accepts trigger latency tightly.
- Noun-phrase extraction in PL/pgSQL is awkward; in TypeScript it's straightforward.
- Putting external calls in triggers creates a "trigger broke because LiteLLM is slow" failure mode. Bad.

The Edge Function is the right home.

### 11.5 Rename batching

When an entity is renamed, mention re-detection fans out: every other entity that *might* mention this one needs re-checked (Schema §5.2 in fine print). We batch via `fanout_root_id` on the mention job queue and process in bulk to amortize the embedding API roundtrips. Memory Spec §11.4 accepts this fanout as MVP-acceptable.

---

## 12. Storage layout (CF-19)

### 12.1 Bucket structure

Three buckets in Supabase Storage:

| Bucket | Contents | Lifecycle |
|---|---|---|
| `audio` | Session recordings (chunks) | Per-saga retention setting; delete on saga delete |
| `attachments` | GM-uploaded files attached to entities/notes (V1; reserved in MVP) | Delete on entity/note delete; cascade on saga delete |
| `exports` | Generated saga exports (Markdown + JSON archive) | Auto-delete after 7 days; one export per request |

Path conventions:

- `audio/<workspace_id>/<world_id>/<saga_id>/<session_id>/<sequence>.<ext>`
- `attachments/<workspace_id>/<world_id>/<scope>/<saga_id-or-world>/<entity_or_note_id>/<filename>`
- `exports/<workspace_id>/<world_id>/<saga_id>/<export_id>.zip`

The first path segment is always `workspace_id`; World and Saga path segments follow where applicable so Storage RLS can validate the full hierarchy.

### 12.2 Audio lifecycle

Default: deleted post-transcription per saga setting (Schema §2.2). Implemented via `cleanup-audio` Edge Function (§7.5).

If a transcription job fails permanently, audio is **retained regardless of setting** — the GM may need to manually intervene or retry. A daily cron sweeps `audio_chunks` rows with `deleted_at IS NULL` where their `transcripts.state='failed'` and surfaces them in saga settings as recoverable.

### 12.3 Export lifecycle

Each export request creates one zip file in `exports/<workspace_id>/<world_id>/<saga_id>/<export_id>.zip`. A 7-day TTL keeps storage costs bounded. A cron purges expired exports daily. The download URL is a Supabase Storage signed URL, valid for 1 hour.

### 12.4 Saga delete cleanup

`cleanup-saga` Edge Function (§4.1) is triggered when `sagas.deleted_at` is set. Cascades in DB tear down the rows; Storage cleanup needs an explicit pass:

```typescript
async function cleanupSagaStorage(saga_id: string) {
  for (const bucket of ["audio", "attachments", "exports"]) {
    const { data: files } = await supabase.storage.from(bucket).list(saga_id, { limit: 1000 });
    if (files?.length) {
      await supabase.storage.from(bucket).remove(files.map(f => `${saga_id}/${f.name}`));
    }
  }
}
```

This runs as `service_role` because the saga's rows (and the GM's access) are already gone by the time cleanup fires. RLS would deny otherwise.

The function is idempotent — re-running it on an already-deleted saga is a no-op.

### 12.5 Storage limits

Supabase Storage per-file limits: 50 MB (free), 5 GB (pro). MVP audio chunks are <2 MB each (30s at 64kbps). Export zips for a typical saga (≤500 entities) are <50 MB.

---

## 13. Export pipeline (CF-17)

### 13.1 Trigger and shape

The GM hits Export from saga settings (`EXP-FR-3`). The Next.js API route POSTs to `export-saga` Edge Function with `(workspace_id, world_id, saga_id, formats: ['markdown', 'json'], include_audit: boolean)`. The function builds the archive, uploads to `exports/<workspace_id>/<world_id>/<saga_id>/<export_id>.zip`, and returns a signed URL.

### 13.2 JSON shape — curated default

`EXP-FR-2`: "mirrors internal entity model + `schema_version` field." Concrete shape, default sections:

```json
{
  "schema_version": 1,
  "exported_at": "2026-05-15T12:34:56Z",
  "saga": {
    "id": "...",
    "name": "The Thornwood Accord",
    "game_system": "PF2e",
    "audio_retention": "delete_after_transcription",
    "transcript_retention": "retain",
    "created_at": "...",
    "updated_at": "..."
  },
  "characters": [ /* one object per row, all columns */ ],
  "places":     [ /* ... */ ],
  "factions":   [ /* ... */ ],
  "artifacts":  [ /* ... */ ],
  "threads":    [ /* ... */ ],
  "sessions":   [ /* ... */ ],
  "notes":      [ /* lore, summary, gm_note types */ ],
  "note_attachments": [ /* ... */ ],
  "relationships":    [ /* ... */ ],
  "mentions":         [ /* accepted only */ ],
  "transcripts":      [ /* segments included if transcript_retention='retain'; original_segments included if edited */ ],
  "pipeline_runs":    [ /* state, summary_note_id, etc. */ ]
}
```

**Optional sections** (included when `include_audit=true`):

- `drafts` — all states; full audit completeness.
- `canon_audit` — full audit trail.
- `sources` and `draft_sources` — citation evidence.
- `consent_log` — recording consent history.
- `dice_rolls` — ephemeral session metadata.
- `notes` of type `quick_capture` (excluded by default; included with audit toggle).

Excluded from export regardless: `audio_chunks` (binary; the audio files themselves are not in the zip), `embeddings` (derived, regeneratable), `workshop_sessions` (transient working state), `gm_profiles` (user-level, not saga-scoped), entire `internal.*` schema.

The Sanctum export UI exposes one checkbox: **"Include audit trail and drafts."** Default unchecked.

The `schema_version` field is the same one mirrored on `sagas.schema_version` (Schema §2.2). Future-compat: when the schema bumps, exports declare which version they're in.

### 13.3 Markdown export

`EXP-FR-1`: full saga as Markdown. Structure:

```
saga.md                           — top-level overview, GM profile, statistics
characters/<slug-name>.md         — one file per character
places/<slug-name>.md             — one file per place
factions/<slug-name>.md
artifacts/<slug-name>.md
threads/<slug-name>.md
sessions/<session-N>.md           — session detail with packet and approved summary
sessions/<session-N>-transcript.md — if transcript retained
notes/<slug-title>.md             — lore notes
audit/canon-audit.md              — chronological audit log (only if include_audit=true)
```

Each entity Markdown file follows a fixed template with Cormorant-flavored formatting: `# Name` heading, italic `_summary_` line, prose body, cross-links to other entities as relative paths. Template is deterministic — two exports of the same saga produce identical Markdown. No LLM polish (cost and non-determinism).

### 13.4 Archive packaging

Both Markdown tree and `saga.json` go into a single zip:

```
<saga-name>-export-2026-05-15.zip
├── saga.json
├── saga.md
├── characters/
├── places/
├── ...
└── README.txt   ← export metadata, schema version, what's included, what's excluded
```

If audio retention is `'retain'`, original chunks are *not* in the zip (size). A future flag could include them; not in MVP.

### 13.5 Execution model

Synchronous for small sagas (<500 entities), async with a UI poll for larger. The Edge Function inserts an `internal.export_jobs` row and returns the export ID; the UI polls for `state='complete'` then exposes the signed URL.

Exports are not embedded into RLS — they're built server-side via scoped JWT, like all other async jobs. The GM can only see exports for sagas they own (RLS on `internal.export_jobs` via the `service_role` route, app-level check before returning URL).

---

## 14. Stale-pipeline-warning scheduler (CF-11)

### 14.1 The cron

Once per day, `pg_cron` invokes the `stale-pipeline-warning` Edge Function:

```sql
select cron.schedule(
  'stale-pipeline-warning',
  '0 3 * * *',  -- 03:00 UTC daily
  $$ select net.http_post(
       url := current_setting('app.edge_functions_url') || '/stale-pipeline-warning',
       headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.internal_token'))
     ); $$
);
```

### 14.2 What the function does

```typescript
// stale-pipeline-warning Edge Function
async function staleScan() {
  // 30-day banner candidates: created >=30d ago, no warning yet, has pending drafts
  const { data: thirtyDay } = await supabaseServiceRole.rpc("find_stale_pipelines", { days: 30 });

  for (const run of thirtyDay) {
    await supabaseServiceRole
      .from("pipeline_runs")
      .update({ staleness_warned_at: new Date() })
      .eq("id", run.id);

    // Enqueue notification (§17): email + push to the saga's GM.
    await enqueueNotification({
      gm_id: run.gm_id,
      kind: "pipeline_stale_30d",
      saga_id: run.saga_id,
      pipeline_run_id: run.id,
    });
  }

  // 90-day nudge: surface stronger reminder.
  const { data: ninetyDay } = await supabaseServiceRole.rpc("find_stale_pipelines", { days: 90 });
  for (const run of ninetyDay) {
    if (run.staleness_nudge_90_at) continue;  // already notified
    await supabaseServiceRole
      .from("pipeline_runs")
      .update({ staleness_nudge_90_at: new Date() })
      .eq("id", run.id);
    await enqueueNotification({
      gm_id: run.gm_id,
      kind: "pipeline_stale_90d",
      saga_id: run.saga_id,
      pipeline_run_id: run.id,
    });
  }
}
```

The cron flips `staleness_warned_at` / `staleness_nudge_90_at` so the UI can show the 30-day or 90-day banner on the next page load (Approval Queue Spec §5.1, §7), AND enqueues notifications so the GM hears about it without needing to open the app.

### 14.3 What we do NOT do

- Auto-archive stale queues. Approval Queue Spec §5.1 forbids this. The cron only flips metadata and sends notifications.
- Notify mid-day. The cron runs once daily. We do not want to spam GMs with "this is now stale" timing.
- Repeat 30-day notifications. Once `staleness_warned_at` is set, subsequent runs skip the row.

---

## 15. Offline sync (Basepoint §13, PRD `OFL-FR-*`)

### 15.1 What's offline

Per Basepoint §13 and PRD v0.10: current session packet, pinned entities, session notes, quick capture, recording metadata, pending uploads, and the session prep functional minimum for the session the GM is actively prepping. Full Sanctum, Approval Queue, full search, and broader offline prep packet management remain online-only/P1.

**session prep workspace functional minimum:** read packet, edit agenda fields locally, accept/discard suggested pins/checklist items already loaded, and sync local edits on reconnect. session prep workspace does not run AI synthesis offline; the CTA is disabled with a clear "Reconnect to synthesize" state.

### 15.2 expo-sqlite + Drizzle on mobile

The mobile app embeds a SQLite database accessed via Drizzle ORM. Schema is a **subset** of the Supabase schema focused on offline-critical mobile workflows, starting with the Stage packet and the Sanctum records needed around prep, review, search, and context:

- `sessions` (active session plus any `status='ready'` row cached when the GM enters session prep workspace for that session)
- `characters`, `places`, `factions`, `artifacts`, `threads` (only pinned + recently-searched)
- `session_pinned_entities`
- `session_active_threads`
- `notes` (quick captures, local)
- `session_marked_moments`
- `audio_chunks` (local until uploaded)

Drizzle's TypeScript types are generated from the same schema definition file as the Supabase migrations, so the mobile model can never diverge from the server.

### 15.3 Sync state machine

Three states, surfaced in the UI (`OFL-FR-4`):

- **Online** — real-time Supabase subscription active; reads come from cache, writes go to both local and remote.
- **Offline** — writes go local only, queued in a `pending_sync` table.
- **Reconnecting** — flushing the queue.

The transition happens automatically. Network detection via `@react-native-community/netinfo`.

### 15.4 The pending_sync queue

```sql
-- Local SQLite, not Supabase. Drizzle schema:
create table pending_sync (
  id            text primary key,            -- uuidv7
  table_name    text not null,               -- 'notes' | 'audio_chunks' | 'session_pinned_entities' | ...
  operation     text not null,               -- 'insert' | 'update' | 'delete'
  payload       text not null,               -- JSON
  created_at    text not null,
  last_attempt  text,
  attempts      integer default 0,
  server_value  text                          -- populated on conflict; the server's competing value
);
```

Each Stage action (Quick Capture, Quick Stub, Mark Moment, audio chunk upload) and each session prep workspace functional-minimum edit writes to both the local table and `pending_sync` in a SQLite transaction. The local table change is immediately reflected in the UI; the sync queue handles the upstream push.

**Web B1 short-window queue.** Web keeps a separate IndexedDB intent store for `quick_capture`, `quick_stub`, `mark_moment`, `end_session`, and `undo_end_session`. Each row carries immutable Workspace/World/Saga/Session scope, a per-session monotonic sequence, the canonical JSON payload, a stable UUID-backed idempotency key, and `queued | uploading | failed` delivery state. Session metadata retains `recovered_at` and the last failure so the Stage can expose the same `queued | uploading | failed | recovered` vocabulary as audio.

Replay reads the session queue in sequence order and stops at the first failure. This makes End Session depend on every earlier capture and Mark Moment without a second dependency graph. Success deletes only the local intent; failure preserves it with exponential-backoff metadata. Reconnect, app mount, and the Stage route all retry the same intent rather than constructing a replacement.

The browser calls `apply_stage_write_intent` with the existing authenticated Supabase client. The RPC rechecks hierarchy access and session writability, serializes on `(auth.uid(), idempotency_key)`, and commits the domain write plus `internal.stage_write_receipts` row atomically. Duplicate delivery returns the first result; mismatched reuse of a key fails closed. The internal table is not Data API-visible, and the public RPC is revoked from `PUBLIC` and `anon` and granted only to `authenticated`.

Quick Capture and Quick Stub retain their existing GM-authored canon/source/audit behavior. Mark Moment retains the client occurrence timestamp carried by the queued payload. End Session carries the client confirmation timestamp so a delayed replay does not restart the GM's 60-second window; server-owned expiry still performs the final `ended` transition and exactly-once pipeline enqueue. Undo is queued behind End when necessary and is accepted only through the same lifecycle contract.

### 15.5 Reconnect flush with conflict surfacing

On `Online` transition, the sync worker:

1. Reads `pending_sync` rows in `created_at` order.
2. For each, replays against Supabase (`insert`/`update`/`delete` on the named table).
3. On success: deletes the `pending_sync` row.
4. On conflict (server has a newer `updated_at`): **last-write-wins per Basepoint §13** — the local change wins (the GM explicitly authored it). The server's competing value is captured in `pending_sync.server_value` for surfacing.
5. On hard failure (validation, RLS denial): marks `attempts++`. After 3 attempts, surfaces in saga settings as "unsynced changes" with manual review.

After flush completes, the Sanctum shows a "Sync conflicts" badge if any rows had server-value capture. The conflict surface lists each affected row with both versions visible. The GM can confirm the local write or revert to the server value. No data is silently lost — last-write-wins applies, but the GM sees what was overwritten.

### 15.6 Last-write-wins, in detail

The Stage is a single-device experience for one GM. The expected concurrency model is:

- GM is on phone in the Stage, offline.
- Edits happen locally.
- GM reconnects.
- Local writes flush. No other device was touching this saga because the GM was on the phone.

The pathological case — GM also has a laptop open in another tab editing the same entity — is rare and the GM authored both. Last-write-wins means the most recent local action overwrites; the conflict surface gives visibility. We do not invest in CRDT for this. Basepoint §13 already excludes it from MVP.

### 15.7 Audio chunk upload

Audio is a special case — chunks are immutable, append-only. The upload queue is straightforward: each chunk has a deterministic Storage path; uploads retry with exponential backoff. No conflict resolution needed.

Web uses IndexedDB for the same short-window queue contract. The queue survives refresh/app restart, records queued/uploading/failed/recovered state, and continues registering late chunks for `ended_pending_undo` or `ended` Sessions. It then replays the idempotent audio-finalization marker so the backend can enqueue transcription only after the complete declared set exists.

### 15.8 What about web?

The web Stage uses the same Stage UI but does **not** maintain a SQLite cache — it relies on React Query's cache plus Supabase's real-time subscriptions. Web offline is short-window only (the IndexedDB cache lasts a session). For laptop play in a basement with patchy wifi: works, but doesn't survive a full network drop the way mobile does.

This is an intentional platform asymmetry, not a product-surface split. The Stage is clean and focused on both web and mobile; mobile gets deeper offline resilience because table use benefits from it. Web Stage remains first-class for the web-first build and laptop play.

---

## 16. Deployment (Basepoint §13)

### 16.1 Mobile: EAS

Expo Application Services builds and submits the mobile app. Expo owns the mobile implementation of both Sanctum and Stage, including session prep, packet review, agenda edits, Ready for Stage handoff, and the live Stage surface.

- **Channels.** `development` (local dev), `preview` (TestFlight/internal Android), `production` (App Store).
- **OTA updates.** EAS Update for JS-only changes (bug fixes, copy tweaks). Native binary updates ship through stores.
- **Environment promotion.** Each channel binds to a Supabase project (`relic-dev`, `relic-staging`, `relic-prod`) via `expo-constants` reading from a per-channel env file.

### 16.2 Web: Vercel

Next.js App Router on Vercel. Web owns Sanctum and session prep workspace routes; session prep is a first-class Sanctum route, not a separate top-level product mode and not a modal. One Vercel project, three environments (Preview, Staging, Production), each bound to the matching Supabase project.

- **Preview deploys** on every PR. Pre-bound to `relic-dev` so they hit the dev DB.
- **Staging** is the `staging` branch, auto-deployed.
- **Production** is `main`, manually promoted from staging after smoke tests pass.

### 16.3 Edge Functions

Deployed via `supabase functions deploy` from the same repo. Each environment has its own Supabase project; deploys are environment-targeted.

Promotion path: PR merge → auto-deploy to dev → manual promote to staging → manual promote to production. No automatic prod deploys for backend code.

### 16.4 LiteLLM proxy

Fly.io app per environment (`relic-llm-dev`, `relic-llm-staging`, `relic-llm-prod`). Deploys via `fly deploy` triggered from the CI pipeline on merges to `main`. Provider keys are Fly secrets, not in any config file.

Rolling restarts are zero-downtime — Fly bounces machines one at a time behind a load balancer. Cold-start is ~5s; during a rollout the proxy may be ~5s slower than usual for a small window.

### 16.5 Database migrations

Migrations live in `supabase/migrations/` in the repo. Numbered, immutable once committed.

- Dev: auto-applied on push.
- Staging: applied via CI on merge to `staging` branch.
- Prod: applied via CI on merge to `main`, gated by a manual approval.

A migration that needs data backfill (e.g., the embedding-model swap in Memory Spec §10.4) is split into multiple migrations:

1. Add new column / new model rows.
2. Backfill (via a one-off Edge Function or scheduled job, not the migration itself).
3. Flip the active flag.
4. Drop old column / old rows in a later release.

This stages the change so a failure in step 2 doesn't leave the schema in an unusable state.

---

## 17. Monitoring (Basepoint §13)

### 17.1 Sentry

Errors in mobile (Expo SDK), web (Next.js), and Edge Functions (Deno SDK) ship to Sentry. One project per platform; releases tagged with the EAS / Vercel / Supabase deploy ID.

The events Sentry sees:

- Unhandled JS exceptions client-side.
- Edge Function uncaught throws.
- Postgres errors surfaced to the app (RLS denials, statement timeouts, constraint violations).
- LiteLLM call failures after retry exhaustion.

Sentry alerts on:

- Any uncaught exception in production Edge Functions (zero-tolerance).
- RLS denials with a `user_id` (should never happen — denials mean a UI is asking for something the user shouldn't see; investigate).
- Statement timeouts on **Sanctum** queries (Stage timeouts are expected and metered separately).
- Notification send failures exceeding 1% of attempts.

### 17.2 PostHog

Product analytics. Four categories of events:

**Engagement events.**

- `saga_created` — path: guided/freeform/no_ai
- `session_started`, `session_ended` — duration, has_recording, capture_count
- `quick_capture_created`, `quick_stub_created`, `mark_moment_created`
- `pipeline_completed` — duration, inputs_summary, draft_count
- `draft_approved`, `draft_rejected`, `draft_edited_and_approved`, `draft_merged`
- `entity_created`, `entity_archived`
- `transcript_edited` — segments_changed, total_chars_changed
- `stage_search` — surface=stage, literal_only, result_count, latency_ms

**AI events.**

- `ai_call` — task_name, model, tier, tokens_in, tokens_out, latency_ms, cost_estimate, prediction_drift_pct. Fires once per LiteLLM call.
- `ai_call_fallback` — when LiteLLM falls back from primary to secondary provider
- `embedding_job_complete` — source_kind, duration_ms, attempts
- `embedding_queue_depth_high` — when a saga exceeds the surface threshold
- `pipeline_failed`, `transcription_failed`
- `stage_search_timeout` — Memory Spec §10.7 retry path
- `transcript_reembed_complete` — segments_reembedded, duration_ms

**Quality events.**

- `conflict_overlay_shown` — Approval Queue concurrent-edit detected
- `citation_drift_shown` — Source view rendered drift indicator (§7.9)
- `sync_conflict_shown` — Offline sync surfaced a conflict (§15.5)
- `rls_denial` — RLS denied a query the UI requested (should be zero; if not zero, it's a bug)
- `dead_letter_job` — a job exhausted retries

**Notification events.**

- `notification_sent` — kind, channel (email/push), gm_id, latency_ms
- `notification_failed` — kind, channel, gm_id, failure_reason
- `notification_opened` — email link clicked or push tapped
- `notification_preferences_changed` — opt-outs per kind

### 17.3 Dashboards

Four PostHog dashboards, named by the Basepoint loop plus Cost:

- **Build & Organize.** Saga creation funnel, entity count distributions, saga creation path mix.
- **Run.** Session duration, recording adoption, Stage search latency p50/p95, offline-flush events.
- **Review.** Pipeline duration end-to-end, draft approval rates, conflict-overlay frequency, citation-drift surface frequency, stale-pipeline counts.
- **Cost.** `ai_call` events aggregated by task and tier. Watched daily during alpha to ensure quota caps hold.

### 17.4 Health probes

The LiteLLM proxy exposes `/health`; Fly's healthcheck pings it. Supabase status comes from their status page. Vercel and EAS surface their own dashboards.

We do not build a custom uptime monitoring service in MVP. The vendor dashboards plus Sentry alerts cover the surface.

---

## 18. Notification system

The PRD says "GM notified" on pipeline ready (`PSP-FR-9`) without specifying mechanism. This section locks the answer: email is mandatory, push is mandatory on mobile, both are opt-out-able per kind. Notifications close the loop on the "review-tomorrow" workflow — without them, GMs forget the pipeline finished and queues go stale.

### 18.1 Notification kinds

| Kind | When | Channel | Default |
|---|---|---|---|
| `pipeline_ready` | `pipeline_runs.state` flips to `'ready_for_review'` | email + push | on |
| `pipeline_failed` | `pipeline_runs.state` flips to `'failed'` | email + push | on |
| `pipeline_stale_30d` | Stale scan flips `staleness_warned_at` (§14) | email | on |
| `pipeline_stale_90d` | Stale scan flips `staleness_nudge_90_at` (§14) | email | on |
| `transcription_complete` | Useful when synthesis is slow; tells GM transcript is viewable | push only | off |
| `synthesis_in_progress` | Optional "your pipeline is now running" ping | push only | off |

`on` defaults are notifications that close the loop on the review workflow. `off` defaults are informational and would be noisy by default.

### 18.2 Schema additions

```sql
-- Per-user notification preferences. Stored on gm_profiles or as its own table.
alter table public.gm_profiles
  add column notification_preferences jsonb not null default '{
    "email": {
      "pipeline_ready": true,
      "pipeline_failed": true,
      "pipeline_stale_30d": true,
      "pipeline_stale_90d": true
    },
    "push": {
      "pipeline_ready": true,
      "pipeline_failed": true,
      "transcription_complete": false,
      "synthesis_in_progress": false
    }
  }';

-- Mobile devices registered for push notifications.
create table public.push_devices (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id),
  expo_push_token text not null,
  platform        text not null,           -- 'ios' | 'android' | 'web'
  device_name     text,
  last_seen_at    timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (user_id, expo_push_token)
);
create index on public.push_devices (user_id);

alter table public.push_devices enable row level security;
create policy "push_devices_select" on public.push_devices for select to authenticated
  using (user_id = auth.uid());
create policy "push_devices_insert" on public.push_devices for insert to authenticated
  with check (user_id = auth.uid());
create policy "push_devices_update" on public.push_devices for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "push_devices_delete" on public.push_devices for delete to authenticated
  using (user_id = auth.uid());
```

### 18.3 Internal queue

```sql
create table internal.notification_queue (
  id              uuid primary key default gen_random_uuid(),
  gm_id           uuid not null,
  saga_id         uuid,                       -- nullable for account-level notifications (future)
  kind            text not null,
  payload         jsonb not null default '{}', -- e.g. {pipeline_run_id, draft_count}
  channels        text[] not null,             -- ['email'] | ['push'] | ['email', 'push']
  state           text not null default 'pending',  -- 'pending' | 'sent' | 'failed' | 'skipped'
  attempts        int not null default 0,
  failure_reason  text,
  scheduled_at    timestamptz not null default now(),
  sent_at         timestamptz,
  created_at      timestamptz not null default now()
);
create index on internal.notification_queue (state, scheduled_at) where state = 'pending';
```

Triggers enqueue notifications by writing rows here. The `send-notification` Edge Function dispatches.

### 18.4 The dispatcher

```typescript
// send-notification Edge Function
async function dispatchNotification(notificationId: string) {
  const job = await fetchJob(notificationId);
  const prefs = await fetchPrefs(job.gm_id);

  for (const channel of job.channels) {
    if (!prefs[channel]?.[job.kind]) {
      await markChannelSkipped(notificationId, channel);
      continue;
    }
    if (channel === "email") {
      await sendEmail(job);
    } else if (channel === "push") {
      await sendPush(job);
    }
  }

  await markJobSent(notificationId);
}
```

Each notification job carries the channels to dispatch. Per-channel preferences gate at send time, not enqueue time — so if a GM toggles a preference between enqueue and dispatch, the latest preference wins.

### 18.5 Email provider

**Resend** for transactional email. One project per environment. API key in Edge Function env.

Why Resend over Supabase's built-in SMTP:

- Higher deliverability for transactional mail.
- Templating support (React Email components match our design system).
- Webhook for delivery / open / bounce events feeds back to PostHog.
- Supabase SMTP is rate-limited and not really production-grade.

Templates:

- `pipeline_ready` — "Your session is ready to review." Cormorant-styled subject, links to Approval Queue.
- `pipeline_failed` — "Something went wrong with your last session." Links to retry surface.
- `pipeline_stale_30d` / `pipeline_stale_90d` — "You have N drafts waiting for review." Links to Queue.

All emails carry a one-click unsubscribe per kind, plus a global preferences link.

### 18.6 Push notifications

**Expo Push Notifications** for mobile. The Expo SDK handles APNs and FCM under the hood; we send to `expo.dev/v2/push/send` via Expo's API.

Push token registration:

1. On first mobile launch, request notification permission.
2. On grant, fetch the Expo push token via `Notifications.getExpoPushTokenAsync()`.
3. Upload to `push_devices` (RLS scopes to user).
4. On uninstall / permission revoke, mark the device stale (cleanup cron sweeps weekly).

Web push is not in MVP — email plus mobile push are the MVP notification channels, and Web Push setup is meaningfully more work for less immediate value.

### 18.7 Preferences UI

In the Sanctum settings (saga or account level):

- Toggle per notification kind, per channel.
- Master "Pause all notifications" switch.
- "Manage devices" list showing registered push devices with last-seen timestamps and remove buttons.

Default state is the §18.1 defaults. Changes write to `gm_profiles.notification_preferences` immediately.

### 18.8 Failure handling

Per-notification:

- Transient send failure (Resend 5xx, Expo Push 5xx): retry per §4.4 policy.
- Bounce / unsubscribe at provider level: mark the GM's email/device as unhealthy; surface in settings.
- 3 consecutive bounces on the same email: auto-disable email for that GM and surface a banner asking them to update.

System-level:

- Resend or Expo Push prolonged outage: notification queue backs up. Dead-letter sweep surfaces in operator dashboard. Critical notifications (`pipeline_ready`) get a manual replay path.

### 18.9 What we do NOT do

- In-app real-time toasts during a session. The Stage is silent (Basepoint §5). Notifications fire post-session only.
- SMS. Not enough value over email for typical GM behavior; adds compliance surface (10DLC, opt-in flows, A2P registration).
- Per-saga subscription. All-or-nothing per GM. If a GM wants different settings per saga, that's V1.
- Notification batching beyond per-job dedup. Each pipeline produces one `pipeline_ready` notification; multiple pipelines produce multiple notifications.

## 18.10 V1 architecture placeholders

These are not MVP build commitments, but V0 architecture must not preclude them.

**Rulebook RAG.** Rulebook PDFs form a separate saga-local corpus from saga canon. Storage can be either a separate `rulebook_embeddings` table or shared `embeddings` with a discriminator such as `source_kind='rulebook_chunk'`; Game System Spec owns the final choice. Retrieval profile: `rulebook_grounding` (V1 profile reserved in Memory Spec §14.1).

**`derive_system_schema`.** Runs through the LiteLLM proxy as a heavy task. Inputs: selected rulebook corpus, optional system name, GM constraints. Output: proposed `mechanical_schema` draft for GM approval before binding to a saga.

**`generate_from_context`.** Runs through the LiteLLM proxy as a balanced/deep task depending on generator type. GM-initiated only, including from Stage V1. Inputs: generator type, active scene context, party level if available, and Game System constraints if bound. Output is a temporary candidate card; save-to-canon creates an approval-gated draft.

---

## 19. Locked decisions

For traceability against upstream specs.

| # | Decision | Resolves |
|---|---|---|
| T1 | Postgres 15 + pgvector + pg_trgm + pgcrypto + pg_cron + pg_net | CF-baseline |
| T2 | One Supabase project per environment; PgBouncer transaction mode | CF-baseline |
| T3 | RLS policy template via Workspace/World/Saga helper functions; saga-creation sessions use user scope until commit | CF-18 / Priority 3 |
| T4 | LiteLLM proxy deployed on Fly.io; tier→model mapping in `config.yaml` | CF-3 |
| T5 | Initial tier mapping: fast = Haiku 4.5, balanced = Sonnet 4.6, deep = Opus 4.7; GPT-5 + Gemini 2.5 Pro as fallbacks | CF-3 |
| T6 | Embedding queue: trigger-driven via `pg_net` + dispatcher Edge Function; cron watchdog as backup | CF-5 |
| T7 | JWT issuance for async jobs: dedicated `issue-scoped-jwt` Edge Function holds the secret; other Edge Functions call it over internal HTTP; 5-min TTL; no `SECURITY DEFINER` on user-data paths | CF-6 |
| T8 | Embedding queue: dedup via UNIQUE constraint; debounce via `debounce_until`; fanout grouped by `fanout_root_id` | CF-7 |
| T9 | Stage statement timeout = 800ms via dedicated `stage_query` role; app-level catch retries BM25-only. session prep workspace uses `prep_query` with a 3000ms composition budget. | CF-8 |
| T10 | HNSW: `m=16`, `ef_construction=64`, `ef_search=40`; tune via eval data | CF-9 |
| T11 | Token counting: tiktoken + Anthropic tokenizer; pre-call budget check at `0.7 * context_limit`; Anthropic tokenizer approximates Gemini | CF-4 |
| T12 | Mention detection split: Stage 1 in Postgres trigger, Stage 2 in Edge Function; Stage 2 only when Stage 1 empty AND text >100 chars | CF-10 |
| T13 | Storage buckets: `audio`, `attachments`, `exports`; Workspace/World/Saga IDs in Storage paths for RLS | CF-19 |
| T14 | Saga delete cleanup via `cleanup-saga` Edge Function; idempotent | CF-19 |
| T15 | JSON export = curated default sections; `include_audit` toggle exposes drafts, audit, sources, dice, consent, quick captures | CF-17 |
| T16 | Markdown export = templated per-entity files in a zip alongside `saga.json`; deterministic | CF-17 |
| T17 | Stale-pipeline warning: daily `pg_cron` at 03:00 UTC; flips `staleness_warned_at` AND enqueues notifications; no auto-archive | CF-11 |
| T18 | Offline sync: expo-sqlite + Drizzle with `pending_sync` table; last-write-wins on reconnect; conflict surface in Sanctum captures server-side competing value | Basepoint §13 |
| T19 | Transcript editing: GM can edit segment text during pipeline review; `sources.raw_excerpt` stays frozen; source view shows citation-drift indicator when live transcript differs | CF-20 |
| T20 | Re-embedding cadence for edited transcripts: pipeline-close batch (post-MVP-launch edits debounced 30s) | CF-20 |
| T21 | Non-English handling: works (semantic arm carries weight), BM25 stays English; per-saga config deferred to V1 | Memory Spec §13 |
| T22 | Notifications: email (Resend) + mobile push (Expo); `pipeline_ready` and `pipeline_failed` default-on; preferences in saga/account settings | PRD `PSP-FR-9`, V0.1 §20 |
| T24 | Workspace / World / Saga hierarchy is the tenancy and continuity boundary; no separate Campaign table | Priority 3 |
| T25 | Post-session outputs default to Saga scope; World-canon promotion and era-specific versions are V1 | Priority 3 |
| T23 | Audio upload: direct client-to-Storage; Storage RLS gates access; no Edge Function proxy | New |

---

## 20. Trade-offs surfaced

The decisions above involve choices. The ones with real downsides:

### 20.1 LiteLLM on Fly vs. on Vercel Edge

**Chose Fly.** Pro: warm process, low latency, predictable cost, no 25s streaming cutoff. Con: one more service to deploy and monitor; we own LiteLLM uptime. If LiteLLM's container falls over, every AI call fails until Fly restarts it (which is automatic and fast, but is more failure surface than serverless).

Revisit if: we hit Fly billing surprises, or if Vercel Edge gets a meaningful streaming-duration extension and LiteLLM-compatible runtime.

### 20.2 Trigger-driven vs. cron-driven embedding queue

**Chose trigger-driven primary, cron watchdog.** Pro: meets the p95<60s SLO; reactive. Con: trigger + `pg_net` is more moving parts than a 30s cron poll. If `pg_net` is slow or the dispatcher Edge Function cold-starts, jobs delay.

A pure cron (every 30s, batch process all pending) is simpler. Rejected because the worst-case latency is 30s + processing time, which leaves no headroom against the 60s SLO. With a typical-case dispatch latency of ~2s on the trigger path, we have 58s of slack.

Revisit if: trigger dispatch latency exceeds 5s p95.

### 20.3 Single-call vs. chunked Whisper transcription

**Chose single-call assembly.** Pro: best transcription quality, cheapest per minute, simplest segment indexing. Con: memory pressure on 256MB Edge Functions for sessions >3 hours; need streaming fallback for those.

Chunked transcription would parallelize and reduce per-call memory, but quality drops at chunk boundaries and total cost rises. Streaming for the long-session edge case keeps single-call optimal for the common case.

Revisit if: a meaningful share of sessions are >3 hours and the streaming fallback adds operational cost.

### 20.4 Postgres BM25 vs. ParadeDB/pg_search

**Chose Postgres native (`tsvector` + `websearch_to_tsquery` + `ts_rank_cd`).** Pro: zero extra dependencies; ships with Supabase out of the box; Memory Spec §5.7 already calls out the upgrade path. Con: it's not real BM25 — it's term-frequency-weighted ranking, which scores documents differently on rare-term-heavy queries.

RRF (Memory Spec §5.4) mostly hides the difference. If retrieval quality plateaus and the lexical arm seems weak, we swap in `pg_search` (Memory Spec §5.7 names the upgrade explicitly — function signatures don't change).

Revisit if: eval harness (Memory Spec §9) shows BM25-arm recall pulling the hybrid result down.

### 20.5 `m=16` HNSW vs. higher values

**Chose `m=16`.** Pro: pgvector default; fast index build; low memory. Con: recall plateaus around 95-98% at our scale; very large sagas (V1+) may need `m=24-32`.

Higher `m` doubles index memory and slows build by 2-3×. At MVP scales (≤500 entities/saga, alpha cohort), the recall ceiling is comfortable. We log per-query recall metrics from the eval harness; if recall slides below 90% we revisit.

Revisit if: total embeddings per project exceed 1M (probably ~5K alpha users).

### 20.6 Dedicated JWT issuer vs. in-process minting

**Chose dedicated issuer.** Pro: single point of secret exposure; centralized audit; one function to lock down. Con: ~50ms round-trip per job for the JWT fetch.

In-process minting would save the round-trip but distribute the JWT secret to every job-handling Edge Function — each is a potential leak vector. The latency cost is invisible (embedding jobs dominate at 200–800ms; synthesis at 5–30s); the security win is concrete.

Revisit if: Supabase ships a first-class scoped-JWT API for service-role callers.

### 20.7 Last-write-wins with conflict surface vs. CRDT

**Chose last-write-wins with surfaced conflict log.** Pro: simple, well-understood, matches the single-device Stage assumption; the surfaced conflict log gives GM visibility without enabling concurrent editing. Con: cannot handle genuine multi-device concurrent editing; surfaced conflicts add a UI surface to maintain.

CRDT would solve concurrent editing but adds significant complexity. Basepoint §13 already excludes it. The conflict surface costs ~1 day to build, addresses the silent-data-loss concern, and is forward-compatible with V1 multi-device work.

Revisit if: conflict-on-flush rate exceeds 5% of offline sessions.

### 20.8 Transcript edits with citation drift vs. immutable transcripts

**Chose edits with frozen-citation drift indicator.** Pro: GMs can fix Whisper errors; citation integrity preserved; transparent UX. Con: extra column (`original_segments`), citation-drift compare logic, re-embedding cost on close.

Immutable transcripts would simplify the data model but leave GMs with no recourse for Whisper errors beyond deleting the whole transcript. The drift indicator pattern is a generally useful primitive — V1 mention-detection improvements and any future user-edited evidence will likely use it.

Revisit if: edit frequency exceeds 30% of sessions and re-embed cost becomes meaningful.

### 20.9 No per-saga BM25 language config in MVP

**Chose English-default, no per-saga override.** Pro: zero MVP work; works adequately for non-English semantic retrieval. Con: BM25 stems English; non-English users get weaker lexical results.

Per-saga `text search configuration` requires Postgres dictionary installs and per-saga query routing. Real cost to build, no real evidence yet that non-English users are a meaningful cohort. Punt to V1 with evidence.

Revisit if: alpha shows >20% non-English saga creation.

---

## 21. Open items handed forward

Items this spec doesn't resolve and where they go.

| Item | Owner |
|---|---|
| Concrete free-tier hard caps and alpha soft caps per quota tier | Resolved by [[25 - Pricing and Rate Limits]] |
| Per-task failure UX (loading states, retry affordances, error surfaces) | Stage UX Flow + Sanctum UX Flow (carry-forward item 16) |
| Email template visual design (React Email components, copy) | Notification templates work — Sanctum UX or design pass |
| Push notification copy and tap behaviors | Same as above |
| Lexical in-queue search backend | Resolved by [[24 - Approval Queue]]: direct `drafts` query, not `search_for_ui`. |
| Audio mini-player implementation in transcript source view (web only) | Stage UX Flow + this spec next revision. Likely a small `<audio>` element fed by signed URLs. |
| Bulk-archive rejection tag (`stale_bulk_archive`) | Resolved by [[20 - Entity and Canon Schema]] enum. |
| Transcript editor UI specifics (segment inline-edit surface, drift indicator placement) | Sanctum UX Flow |
| Web push notifications | V1; mobile push covers the MVP loop |

---

*End Tech Architecture Spec v1.2. Locked. Aligned with Basepoint v3.5, PRD v0.10, Schema v0.8, Memory Spec v0.9, Registry v1.0, Approval Queue Spec v0.5, Session Prep Flow v0.2, and Design System. Closes carry-forward items 3–11, 17–20. Engineering and Claude Code may build against this document. HNSW params and tier-to-model mapping will see post-alpha tuning passes once eval data lands.*




