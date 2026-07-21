---
status: complete
authority: support
scope: session-log
read_after:
  - "[[50 - Session Log Index]]"
depends_on:
  - "[[20 - Entity and Canon Schema]]"
  - "[[21 - Tech Architecture]]"
  - "[[23 - AI Task Registry]]"
  - "[[24 - Approval Queue]]"
supersedes: []
last_audited: 2026-07-21
source_file: "Relic Vault/Session Logs/2026-07-21 - Source-Aware Synthesis Output Writer.md"
---

# Source-Aware Synthesis Output Writer

## Accomplished

- Added strict Edge and database validation for the complete `synthesize_session` artifact shape, including Saga-only entity changes, source UUIDs, confidence reasons, update concurrency fields, loose Threads, next-prep implications, and stub evidence flags.
- Added one atomic AI draft-batch ledger and pending summary, entity, Thread, and next-session prep draft writer. Every draft preserves batch, AI run, pipeline, evidence Session, task, prompt, resolved model/provider, confidence, and source provenance.
- Locked citations to the immutable orchestration allowlist and existing `sources` rows from the exact Workspace, World, Saga, and Session. Missing, hallucinated, cross-session, sibling-Saga, cross-tenant, and allowlist-expansion attempts fail closed.
- Made exact output redelivery return the existing complete batch; changed duplicate delivery and incomplete-batch recovery fail safely. A forced failure during the second draft insert proved the batch, prior drafts, citations, and pipeline transition roll back together.
- Preserved the approval boundary: synthesis writes only pending drafts and `draft_sources`. It creates no note/entity/Thread/session canon, `canon_audit`, embedding, or canonical summary note.

## Changed

- [[20 - Entity and Canon Schema]], [[21 - Tech Architecture]], [[23 - AI Task Registry]], [[02 - Source Map]], [[04 - Final Contradiction Pass]], root `PLAN.md`, and `docs/MVP_GAP_ANALYSIS.md`.
- Migration `20260721143214_source_aware_output_writer.sql`, deterministic fixture `synthesize_session_output.json`, focused C3 pgTAP coverage, the existing AI runtime pgTAP fixture, and `supabase/security/rpc-boundary.md`.
- AI provider/task-runner contracts now preserve the provider and resolved model from the final accepted response, including a repair response.
- Script coverage validates the deterministic synthesis schema and worker/provider provenance wiring.

## Verified

- Checkpoint A: five focused synthesis-schema tests and six Edge runtime/source checks passed; the C3 database file passed all 44 assertions, and the combined AI runtime/C3 run passed 77 assertions.
- Checkpoint B: the deterministic fixture passed through the service-role `record_ai_task_output_for_worker` boundary and created exactly one four-draft batch with five scoped citations; exact retry and every recovery/isolation/canon-negative assertion passed.
- `npm run backend:baseline:reset` passed repository verification, 14 script tests, all 18 web test files / 63 tests, a clean migration replay, and all 17 database files / 411 pgTAP assertions.
- Web TypeScript lint and the production build passed. The local Edge runtime served the updated `ai-task-runner` successfully under Deno 2.1 compatibility.
- Supabase database lint and advisors completed with only existing repository findings; the C3 migration introduced no new warning. Markdown whitespace and scoped wikilink checks passed; targeted stale-term/version-reference scans found only canonical negative wording and current or explicitly historical version references.

## Remaining Risks and Follow-ups

- Packet C4 is next: render exact source context, timestamp navigation, frozen/current transcript comparison, and citation-drift/broken-source states for the new draft citations.
- Packet C5 must teach Approval Queue's commit/edit path how to apply the new next-session prep implication payload; C3 deliberately stops at a pending Session draft.
- Hosted LiteLLM/provider smoke testing and production observability remain environment-gated; deterministic provider/runtime evidence does not replace that deployment gate.
