# Packet E2 hosted provider and observability evidence

**Audit window:** 2026-07-22 through 2026-07-23
**Status:** complete for the synthetic staging gate
**Production authorization:** not granted

## Environment and delivery map

| Layer | E2 environment | Evidence |
|---|---|---|
| Database, Auth, private Storage, Edge Functions, Cron, Vault | Supabase `relic-staging` (`scagegrrilvrpuilthzz`) | Repository migrations replayed in order; hosted ledger ends at `20260723141043`; staging lint has no errors |
| Provider proxy | Fly app `relic-llm-dev`, pinned LiteLLM 1.93.0 | Temporary bounded E2 exception; explicit aliases, no implicit fallback |
| Provider project | Isolated OpenAI project | User-managed `$5` hard cap; E2 monetary stop `$1` |
| Web | Local production bundle bound to normal public Supabase configuration | Bundle scan found no provider keys, service-role keys, internal tokens, signing secrets, or private worker configuration |
| Observability | Supabase database-native event ledger, RPC summaries/alerts, Cron history, and function/proxy logs | Service-only fixed fields, 30-day event retention, no paid third-party account |

Production was not changed. The shared proxy exception expires with E2 and must not become normal staging traffic; create a separately isolated proxy/key before ongoing staging or production use.

## Provider aliases

| Alias | Resolved model | Contract |
|---|---|---|
| `relic-transcribe` | `whisper-1` | Timestamped `verbose_json` transcription |
| `relic-embed` | `text-embedding-3-small` | 1536 finite dimensions |
| `relic-fast` | `gpt-5.6-luna` | Explicit fast tier; no fallback |
| `relic-balanced` | `gpt-5.6-terra` | Light task `propose_thread_complication` |
| `relic-deep` | `gpt-5.6-sol` | Deep task `synthesize_session` |

Hosted workers require an explicit live mode, canonical alias, expected resolved model, timeout, and output/dimension bound. Missing or mismatched configuration fails visibly. Deterministic transcription, embedding, or AI mode is rejected when `RELIC_ENV` is `staging` or `production`.

## Server-only configuration

Supabase Edge secret storage contains the required custom names:

- `INTERNAL_TOKEN`
- `RELIC_JWT_SIGNING_SECRET`
- `LITELLM_PROXY_KEY`
- `RELIC_ENV`
- provider modes, aliases, resolved models, dimensions, timeouts, and output caps documented in `supabase/README.md`

Supabase Vault contains:

- `relic_edge_functions_base_url`
- `relic_internal_worker_token`

Fly secret storage contains:

- `OPENAI_API_KEY`
- `LITELLM_MASTER_KEY`

Values were never requested in chat, printed, documented, committed, placed in fixtures, or exposed to the browser. The ignored local bootstrap state holds only the staging internal/proxy credentials needed by the operator scripts and is ACL restricted. Scheduler bootstrap used an ACL-restricted OS-temporary SQL file and verified its deletion.

The current scoped-token issuer uses the isolated staging project's legacy HS256 verification secret. This is accepted only for short-lived synthetic E2 tokens. Production must use an imported asymmetric signing design or a separately reviewed service-only boundary; do not propagate the legacy secret.

## Deployed components

Active staging Edge Functions:

- `issue-scoped-jwt` v5
- `transcribe-session` v9
- `embed-row-dispatch` v8
- `hybrid-search` v6
- `ai-task-runner` v7

Current E2 database migrations:

- `20260722145051_hosted_observability_e2.sql`
- `20260722160000_hosted_security_hardening_e2.sql`
- `20260722173000_scoped_jwt_claim_compatibility_e2.sql`
- `20260723135948_e2_provider_dispatch_schedules.sql`
- `20260723140841_enable_pg_net_e2.sql`
- `20260723141043_fix_e2_dispatch_and_worker_alerts.sql`

One-minute Vault-authenticated schedules:

- `relic-dispatch-transcription`
- `relic-dispatch-embeddings`
- `relic-dispatch-ai-tasks`

The AI schedule selects one due `pending` or `retryable` run and sends its `run_id`; an empty queue creates no HTTP/provider call. Transcription and embedding dispatchers emit safe idle heartbeats. Latest hosted executions for all three schedules are `succeeded`, active queues are zero, and the operational alert result is `[]`.

The existing five-minute AI watchdog, daily provider-event pruning, and Stage finalizer remain active.

## Hosted smoke evidence

All fixtures were deliberately synthetic and non-sensitive.

### Transcription

- Uploaded a generated WAV to the authorized private Storage path.
- The hosted worker read scoped chunks through the short-lived Saga identity.
- `relic-transcribe` resolved to `whisper-1`.
- Timestamped segments validated and persisted.
- Duration metering occurred once; exact replay did not duplicate it.
- Session Review received the safe completed state.
- Canon and canon-audit writes were zero.
- Logs contained no audio, transcript, signed URL, provider body, or credential.

### Embedding and retrieval

- Record and query embeddings resolved through `relic-embed` to `text-embedding-3-small`.
- All 1536 returned values were finite and the stored model/dimension contract matched.
- The scoped worker persisted the replacement vector and metered it once.
- Exact retry reused completed work without another charge.
- Hosted query embedding reached hybrid retrieval.
- Lexical fallback remained independently available after controlled provider failure.
- Sibling-Saga, pending-draft, and unapproved-import records were excluded.
- Logs contained no source text, query text, or vector.
- Deterministic comparison remained green: Recall@5 1.00, MRR 0.96, isolation failures 0, lexical fallback 1.00, database p95 35.442 ms.

### Light and deep tasks

- Light: `propose_thread_complication` through `relic-balanced` → `gpt-5.6-terra`.
- Deep: `synthesize_session` through `relic-deep` → `gpt-5.6-sol`.
- Both passed input/output validation, scoped retrieval/source allowlists, provenance persistence, quota checks, idempotent usage, exact-retry replay, zero sibling-source matches, and zero canon writes.
- The explicit successful deep continuation completed in 4,626 ms with one provider attempt, no repair, one usage event, one draft batch, and replayed exact retry.
- A malformed light fixture exhausted exactly one allowed schema repair and failed terminally; correcting only the synthetic fixture recovered the same registered task.
- Persistence/retry and dead-letter paths preserved input and existing drafts, used safe categories, and recovered without overwriting newer results.

### Restart proof

The Fly proxy machine was restarted and the transcription/embedding workers were redeployed. The first post-redeploy probes correctly exposed an accidental `verify_jwt=true` regression as a pre-provider 401. Both functions were redeployed with the intended internal-token boundary, after which transcription and embedding passed from cold state.

## Failure, retry, and safety evidence

Controlled or injected paths covered invalid/missing alias, provider timeout/outage, rate limiting, malformed response, model mismatch, embedding dimension mismatch, quota denial, duplicate delivery, worker redelivery/restart, retry exhaustion, dead letter, guarded replay, and lexical/manual fallback.

Evidence:

- Retryable failures use bounded backoff; terminal failures do not loop.
- Completed/busy AI runs short-circuit before another provider call.
- Validated AI output is checkpointed before metering/persistence.
- Dead-letter replay cannot replace completed or newer output.
- Usage-event idempotency prevents duplicate metering.
- User-facing errors retain safe categories only.
- Input and existing drafts remained intact.
- Synthetic database/Storage/event/dead-letter residue was removed.

## Observability and privacy

The service-only event ledger captures fixed safe fields for worker/task type, run/pipeline/job/idempotency correlation, permitted scope IDs, alias/model, attempt, queue/provider/end-to-end latency, state, sizes, aggregate usage, retry path, and fallback path.

It never records prompts, transcripts, imports, sources, audio, responses, vectors, credentials, headers, cookies, JWTs, internal tokens, signed URLs, or raw private failures. Metadata is allowlisted and rejected sensitive keys create a safe regression signal.

Operational queries:

```sql
select public.get_provider_operations_summary_for_worker(60);
select public.get_provider_operational_alerts_for_worker();
```

Alerts cover sustained provider failure, dead-letter growth, stranded jobs, dimension/model mismatch, repeated quota denial, hosted deterministic mode, missing worker/scheduler execution when work exists, duplicate metering, and sensitive-field logging regression.

Final staging state:

- latest three provider dispatch Cron executions: `succeeded`
- active transcription/embedding/AI queues: `0 / 0 / 0`
- operational alerts: `[]`
- recent safe idle heartbeats: present for transcription and embedding
- prohibited sensitive-field indicator matches: `0`
- browser static-bundle sensitive matches: `0`
- repository secret-shaped matches: `0`
- temporary scheduler secret directories: `0`

No external observability account, retention purchase, or production data transfer was required.

## Verification

- Clean local database reset and full migration replay: pass.
- Full pgTAP: 28 files / 780 assertions: pass.
- Staging schema lint at error level: pass.
- Repository verification: pass.
- Script/runtime suite: 43 tests: pass.
- Web TypeScript lint: pass.
- Web tests: 27 files / 123 tests: pass.
- Production build: pass.
- E1 deterministic retrieval regression: pass.
- Hosted transcription, embedding, light, deep, exact retry/metering, controlled failure/recovery, safe logs, Cron/dead-letter inspection, tenant isolation, and zero-canon-write assertions: pass.

## Call-count incident and cost

The final conservative packet count is **41 inference attempts** against a user-authorized ceiling of **40**. The one-attempt overrun occurred after the intended restart proof had already passed: the repeat harness called a generic idle embedding dispatcher, which claimed a different queued synthetic embedding job and made one additional provider request.

This was not a duplicate exact-retry charge and did not touch private user data. All synthetic residue was cleaned. The generic idle dispatch was removed from repeat mode, and the runner is hard-disabled with `PREVIOUS_INFERENCE_ATTEMPTS=41`, `MAX_NEW_INFERENCE_ATTEMPTS=0`, and `PACKET_INFERENCE_LIMIT=40`. No further E2 provider request is authorized.

Total exposure remained below the E2 `$1` monetary stop and the OpenAI project `$5` hard cap. This is retained as a resolved call-guard incident and a required regression test, not hidden as normal variance.

## Rollback

1. Unschedule the three `relic-dispatch-*` jobs.
2. Roll the affected Edge Functions to their preceding versions.
3. Stop or roll back the Fly machine/release.
4. Rotate the staging internal/proxy/provider credentials if compromise is suspected.
5. Leave additive observability data/functions in place unless a reviewed forward-fix removes them.
6. Replay only work whose idempotency identity still matches and never overwrite newer output.
7. Confirm queues, Storage fixtures, usage events, drafts, dead letters, and canon effects are clean.

## Remaining production risks

- Create a distinct `relic-llm-staging` proxy/key before normal staging traffic.
- Replace the legacy HS256 issuer compatibility path before production.
- Return the temporary OpenAI key from broad E2 permissions to the narrowest supported request permissions, or rotate it.
- Production rollout remains a separate authorization and deployment decision.

E2 is complete for its synthetic staging acceptance gate. The immediate next packet is E3 Relic Guide; E3 may reuse these shared delivery contracts but must not weaken source allowlists, quota/metering, idempotency, safe telemetry, or the explicit GM approval boundary.
