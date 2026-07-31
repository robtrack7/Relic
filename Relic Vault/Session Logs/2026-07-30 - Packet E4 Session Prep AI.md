---
status: complete
authority: support
scope: operations
read_after:
  - "[[00 - Start Here]]"
depends_on:
  - "[[31 - Session Prep Flow]]"
  - "[[23 - AI Task Registry]]"
  - "[[22 - Memory and Retrieval]]"
  - "[[24 - Approval Queue]]"
supersedes: []
last_audited: 2026-07-30
source_file: "Relic Vault/Session Logs/2026-07-30 - Packet E4 Session Prep AI.md"
---

# Packet E4 — Session Prep AI

## Accomplished

- Added one recoverable GM/Session-scoped Prep AI request, immutable evidence, job, result, and review-state boundary over the E2 task runner.
- Implemented canon briefing, session suggestions, scene beats, complications, NPC candidates, and Quick Stub proposals with deterministic fixtures and strict per-task citation validation.
- Restricted retrieval to current-Saga canon plus eligible World canon. Sibling Sagas, unapproved imports, drafts, unsupported sources, archived/deleted records, and retrieved prompt instructions remain ineligible or inert.
- Reused the E3 source disclosure and `no_answer` treatment. Every usable result is cited; insufficient evidence produces no proposal.
- Kept generation output outside Session Prep, pins, Threads, entities, drafts, and canon. Exact retry reuses the frozen evidence, provider checkpoint, run, and meter identity.
- Applied accepted Prep text only through the live D4 editor and optimistic autosave. Stale saves preserve GM edits and leave the result pending.
- Routed a confirmed NPC candidate through its separately preflighted entity-draft task and a confirmed Quick Stub proposal into one pending C5 update draft. Neither path changes canon before Approval Queue commit.

## Task-by-task evidence

| Task | Tier | Proven result and acceptance boundary |
|---|---|---|
| `compose_prep_briefing` | standard / 3 | Cited briefing or explicit insufficiency; recoverable read-only result, no Session write. |
| `generate_session_prep` | heavy / 10 | Cited editable suggestions; accepted text enters only through D4 autosave. |
| `propose_scene_beats` | light / 1 | Exactly three cited beats; edit/accept, reject, and dismiss remain explicit. |
| `propose_thread_complication` | light / 1 | One-to-three cited complications; current-Saga Thread target is server-derived and validated. |
| `propose_npc_for_scene` | light / 1 | One-to-three cited candidates; separate confirmation/preflight can create only a pending entity draft. |
| `propose_quick_stub_fleshing` | light / 1 | Cited proposal against a same-Saga stub; explicit confirmation creates one pending C5 update draft while the stub remains unchanged. |

## Files and specifications

- Runtime/schema: `supabase/migrations/20260731063451_packet_e4_session_prep_ai.sql`, `supabase/functions/prep-ai-submit/index.ts`, shared AI contracts/provider/schemas, runner, hybrid retrieval, function configuration, pgTAP, and deterministic script tests.
- Web: Session Prep actions/data/types, shared editor integration, `SessionPrepAiPanel`, reusable `SourceContextDisclosure`, E3 reuse, responsive styles, component tests, authenticated flow, and restart tests.
- Canon: [[20 - Entity and Canon Schema]], [[21 - Tech Architecture]], [[22 - Memory and Retrieval]], [[23 - AI Task Registry]], [[24 - Approval Queue]], [[25 - Pricing and Rate Limits]], [[31 - Session Prep Flow]], [[02 - Source Map]], and [[04 - Final Contradiction Pass]].
- Planning/evidence: root `PLAN.md` and `docs/MVP_GAP_ANALYSIS.md`.

## Verification

- Checkpoint A: 4 deterministic E4 schema tests and 35 focused E4 pgTAP assertions passed, including insufficiency, citation allowlists, prompt injection, duplicate submission, exact retry, scope/source exclusion, stale acceptance, Quick Stub review, zero automatic writes, and safe/idempotent metering.
- Full database: clean `supabase db reset`; 30 pgTAP files / 845 assertions passed.
- Database lint reports no E4 findings; the remaining approval-field, embedding-normalization, quota, transcription-enqueue, and transcript-edit warnings predate this packet.
- Web: TypeScript lint passed; 29 files / 138 tests passed; production build passed.
- Script/runtime: 76 tests passed; repository verification returned `RELIC_REPO_VERIFY_OK`.
- Retrieval fixture: 30 queries, recall@5 1.0, MRR 0.96, zero isolation failures, lexical fallback success, database p95 17.097 ms.
- Authenticated browser: a populated future Session generated every E4 task, inspected cited sources, edited/accepted Prep once, rejected/dismissed output, explicitly created Quick Stub and NPC pending drafts, hit quota failure, continued manual editing, refreshed, and recovered after a fresh app-server start.
- Responsive/accessibility: 1440×900, 1024×768, 768×1024, and 390×844 passed keyboard operation, source disclosure focus return, long-content/status handling, persistence, and no-horizontal-overflow checks.
- The deterministic Edge helper used an isolated temporary environment with live provider credentials omitted. Its temporary environment file was removed after shutdown.

## Hosted environment gate

No E4 hosted provider call was made. E2/E3 authorization was not reused. Before any future paid E4 attempt, present and receive explicit approval for the target environment, exact alias/model mapping, synthetic fixture and identifiers, maximum attempt count, dollar ceiling, command, cleanup, and rollback/restoration steps. Until then, E4 hosted evidence remains intentionally gated; local deterministic, database, and authenticated browser acceptance is complete.

## Remaining risks and E5 dependencies

- E4 has no newly authorized paid-hosted task-family smoke; production alias/key narrowing and asymmetric scoped signing remain later promotion concerns.
- CI still needs one combined manual-loop fixture; current evidence is packet-specific but deterministic.
- E5 should reuse E4’s server-owned task intent, immutable evidence, strict citations, exact retry, quota/manual fallback, and explicit review/commit patterns without enrolling D5 imports automatically.

Immediate next packet: [[33 - First Run UX Flow]] / Packet E5 — AI-assisted Saga creation.

Back to [[50 - Session Log Index]].
