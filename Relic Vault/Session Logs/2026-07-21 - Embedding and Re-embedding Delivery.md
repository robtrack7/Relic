---
date: 2026-07-21
packet: E1
status: complete
---

# Embedding and Re-embedding Delivery

Linked from [[50 - Session Log Index]]. The delivery contract is owned by [[22 - Memory and Retrieval]] and its server/runtime boundary by [[21 - Tech Architecture]] and [[56 - Backend Module 8 Background Job and Edge Runtime Plan]].

## Architecture and lifecycle decisions

- Retrieval-visible owners are eligible current characters, places, factions, artifacts, Threads, Sessions, lore notes, post-session Quick Captures, and transcript windows. Pending/rejected drafts, unapproved AI output, raw Import Inbox sources, hidden transcript evidence, archived/deleted records, sibling Sagas, and other tenants stay excluded in SQL and worker scope validation.
- Production embedding delivery uses the server-only LiteLLM alias `relic-embed`, resolved to `openai/text-embedding-3-small`, at 1536 dimensions. The existing `vector(1536)` schema was compatible, so no parallel-dimension migration or Decision Stop 1 was required.
- Deterministic development/test mode uses the same normalization, claim, validation, persistence, retrieval, and completion boundaries; it is rejected in production and creates no billable usage.
- Job identity includes owner scope/type/ID, purpose, normalized input hash, source version, alias, resolved model, dimensions, and model version. Replacement is persisted before the current pointer flips; exact retry/replay is idempotent, older work cannot overwrite newer work, and prior usable embeddings survive replacement failure.
- Transcript edits preserve segment timestamps and frozen C4 citation excerpts. Changed windows supersede obsolete work; soft-hide removes semantic eligibility; restore re-enables it; embedding work never changes transcript provenance or canon.
- Hybrid ranking uses lexical and semantic candidate pools of 50 with reciprocal-rank fusion at `k=60`, then stable scope/source/recency/ID ordering. The original lexical RPC remains independently callable and is the fallback for query-provider, vector, missing, or stale-embedding failure.
- Initial quality thresholds were approved as provisional warning-only gates: Recall@5 ≥0.80, MRR ≥0.65, zero isolation failures, lexical fallback success 1.00, deterministic provider p95 ≤20 ms, and database p95 ≤150 ms. E2 production telemetry may refine them.

## Changed implementation

- Migration: `supabase/migrations/20260721235437_embedding_delivery_e1.sql` adds the content-versioned queue/persistence lifecycle, safe states and replay, service-role scope validation, transcript re-embedding, idempotent usage, and scoped hybrid retrieval.
- Edge/runtime: `_shared/embedding-provider.ts`, `_shared/embedding-worker.ts`, `embed-row-dispatch`, `transcript-edit-reembed`, `hybrid-search`, and the shared worker/JWT boundary.
- Local operations: `scripts/serve-functions-local.mjs`, `scripts/smoke-embedding-hosted.mjs`, `infra/litellm/`, `.env.example`, `.gitignore`, `package.json`, and `supabase/README.md`.
- Application/retrieval: `apps/web/lib/data.ts` selects the server-only hybrid route and preserves lexical fallback; `apps/web/tests/search-hybrid-fallback.test.ts` covers safe fallback behavior.
- Tests/evaluation: `supabase/tests/embedding_delivery_e1.sql` plus focused access/job/retrieval updates, `scripts/embedding-provider.test.mjs`, `scripts/edge-runtime-source.test.mjs`, and `scripts/evaluate-retrieval-e1.mjs`.
- Canon/planning: `PLAN.md`, `docs/MVP_GAP_ANALYSIS.md`, [[02 - Source Map]], [[04 - Final Contradiction Pass]], [[21 - Tech Architecture]], [[22 - Memory and Retrieval]], [[40 - MVP Implementation Planning Sequence]], and [[56 - Backend Module 8 Background Job and Edge Runtime Plan]].

## Deterministic evaluation

- Corpus: 30 queries over 42 entity/session records, 20 lore notes, 50 Quick Captures, and 3 transcripts; 11 current and 1 explicitly stale embedding. It includes aliases/paraphrases, World context, sibling-Saga and other-tenant lookalikes, lexical distractors, hidden/archived/stale/pending/raw-import exclusions, and transcript edit/re-embedding cases.
- Results: Recall@5 `1.00`; MRR `0.96`; relevant-rank p50 `1`, p95 `2`; isolation failures `0`; lexical-fallback success `1.00`.
- Final local latency: deterministic provider p50 `0.093 ms`, p95 `0.377 ms`; database p50 `21.120 ms`, p95 `26.092 ms`. These are local deterministic measurements, not production claims.
- Known weak queries: “medical guardian at the drowned entrance” and “uprising intended to remove the monarch” ranked the relevant result second. No E1 over-tuning was applied.

## Verification evidence

- `supabase db reset`: clean migration replay passed through the E1 migration.
- `supabase test db`: 25 files / 709 assertions passed, including exact retry, concurrent duplicate, changed content, stale completion, tenant/Saga substitution, missing/deleted/ineligible owners, model/dimension mismatch, prior-vector preservation, zero canon writes, transcript edit/hide/restore, dead-letter/replay, quota, metering, and hybrid/fallback cases.
- `npm run test:scripts`: 27 tests passed, including deterministic/provider faults, production-mode protection, server-only secrets, worker boundaries, and local scoped-JWT wrapper behavior.
- `npm run eval:retrieval:e1`: deterministic corpus and provisional thresholds passed.
- `npx pnpm@10.11.0 --filter @relic/web lint`: passed.
- `npx pnpm@10.11.0 --filter @relic/web test`: 27 files / 123 tests passed.
- `npx pnpm@10.11.0 --filter @relic/web build`: production build passed.
- `npm run verify`: `RELIC_REPO_VERIFY_OK`; repository secret/source scan passed.
- Actual local Edge preflight returned a scoped JWT and reached the protected LiteLLM health/model boundary. The temporary secret environment file was outside the repository, mode-restricted, contained no logged value, and was removed; no temporary Edge runtime container remains.

## Authorized hosted smoke

- Authorization: one two-call smoke in local development after the scoped-JWT fix.
- Action: `node --env-file=supabase/.env.local scripts/smoke-embedding-hosted.mjs --execute` against Fly app `relic-llm-dev`.
- Fixture: one minimal synthetic, non-sensitive retrieval record/query identified only by the harness fixture ID.
- External calls: exactly two successful `POST /v1/embeddings` calls—one record embedding and one query embedding. Fly logs showed two HTTP 200 responses and no fixture text, transcript/import text, prompt, secret, or raw vector.
- Persisted evidence before cleanup: job `complete`; provider `litellm`; dimensions `1536`; current embedding `true`; one usage event; stable internal request identity present; retrieval mode `hybrid`; one result; zero canon writes. LiteLLM did not expose a provider request header, so that optional field remained null. The adapter now normalizes an echoed public alias to the configured resolved model provenance.
- Cleanup: the smoke harness removed its fixture. No further hosted calls were made.

## E2 dependencies and follow-up

Packet E2 is next. It must promote the proven server-only boundary to staging/production configuration, add safe queue/fallback/provider latency observability, and smoke hosted transcription plus one light/deep AI task. It must not broaden World-versus-Saga visibility, enroll raw imports, expose secrets/content/vectors in telemetry, or start Relic Guide, Prep AI, or Saga-creation product work before its gates are green.
