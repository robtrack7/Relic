---
status: active
authority: primary
scope: reference
read_after:
  - "[[00 - Start Here]]"
depends_on:
  - "[[02 - Source Map]]"
supersedes:
  - "[[90 - Next Steps Before Coding]]"
last_audited: 2026-06-01
source_file: "Relic Vault/04 - Final Contradiction Pass.md"
---

# Final Contradiction Pass

## Result

The vault pass normalized the imported active specs into `Relic Vault`, added Obsidian frontmatter/router blocks, fixed known stale naming and version references, and preserved `Sourced - Downloaded - 260518` as an untouched import snapshot.

## Prior Blocker Resolution

The AI registry source gap has been resolved in [[23 - AI Task Registry]] v1.0. The missing base task contracts were rewritten from active vault authority for `scaffold_saga`, `draft_entity_from_prompt`, `generate_session_prep`, `compose_prep_briefing`, `synthesize_session`, and related task/infrastructure labels. [[22 - Memory and Retrieval]] now explicitly maps registry tasks to retrieval profiles.

AI task surfaces still require implementation-plan review before coding, but the vault no longer depends on absent base registry material.

## Fixed In Vault Copies

- Schema `experience_level` warning removed; values locked as `new`, `returning`, `experienced`, `veteran`.
- `studio_grounding` normalized to `session_prep_grounding`.
- `studio_query` normalized to `prep_query`.
- `studio_tour_dismissed_at` normalized to `session_prep_intro_dismissed_at`.
- Active source references normalized to the files present in the bundle: Memory v0.9, Approval Queue v0.5, Session Prep v0.2, Stage UX v0.6.
- AI registry rewritten as standalone v1.0 and Memory updated to v0.9 profile mapping.
- Future-version references in newly added docs normalized back to the actual active imported source set.
- Design examples changed from Campaign wording to Saga wording.
- Stale footers updated for Schema, Tech Architecture, UI Implementation, Pricing, PRD, Sanctum, and Stage where found.

## Current UI Planning Addendum

- [[35 - Web Design Wireframe]] records the authenticated web-app design structure for the first design-system implementation pass.
- The refined Claude Design package `Relic Design System (web) v0.4` was imported into [[14 - Design System Source.html]] on 2026-06-02. [[13 - Design System]] and active UX specs remain canonical.
- v0.4 names Verdigris `#2F6B6E` as the active/synced/success token. Older active notes may have used Sage for this role; current design and implementation should use Verdigris terminology.
- The web shell resolves Search/Relic Guide tension by keeping Search in the top context bar and Relic Guide as an always-available sidecar/sheet, not a primary rail item.
- The first implementation pass is scoped to tokens, local fonts/assets, shared primitives, The Sanctum shell, Prepare workflow, and the web Stage surface. It does not wire provider calls, autonomous AI behavior, live Stage captions, or deferred V1 surfaces.

## Current Backend Planning Addendum

- [[46 - Backend Audit and Module Plan]] records the 2026-06-01 backend readiness audit and the module work order before additional UI expansion.
- [[48 - Backend Module 1 Access Control Plan]] records the access-control/RLS/RPC boundary implementation plan that must pass before product backend behavior expands.
- [[49 - Backend Module 2 Canon Write Path Plan]] records the manual canon write provenance/audit implementation plan that must pass before Approval Queue commits are expanded.
- [[51 - Backend Module 3 Approval Queue Plan]] records the Approval Queue commit implementation plan that turns draft approval into canon mutation.
- [[52 - Backend Module 4 Retrieval and Embeddings Plan]] records the retrieval, embedding queue, worker contract, and RRF implementation plan that must pass before AI runtime depends on memory.
- [[53 - Backend Module 5 Session Prep and Stage Data Plan]] records the Session Prep and Stage data implementation plan that must pass before rough UI flow testing.
- [[54 - Backend Module 6 Usage Quota and Metering Plan]] records the usage, quota, rollup, and metering implementation plan that must pass before paid/provider-backed actions are wired.
- [[55 - Backend Module 7 Storage Audio Transcription Cleanup Plan]] records the completed Storage, audio chunk, transcription, transcript-edit, retention, and cleanup database contracts needed for rough UI recording/upload testing.
- [[56 - Backend Module 8 Background Job and Edge Runtime Plan]] records the completed background job runtime, scoped JWT, retry, dead-letter, and Edge Function scaffolding implementation needed before provider-backed async work is enabled.
- [[57 - Backend Module 9 AI Task Router and Runtime Plan]] records the completed AI task router/runtime implementation for Registry v1.0 task contracts, validation, quota, retrieval, output writers, provider adapter boundary, and run logging.
- [[58 - Backend Module 10 Notifications Export Operations Plan]] records the completed notifications, export generation, stale pipeline scan, cleanup worker, and operational loop implementation.
- The current backend has foundation schema/RLS/RPC scaffolding plus completed backend modules for access boundaries, canon provenance, Approval Queue commits, retrieval/embedding contracts, manual Session Prep/Stage data, usage/quota metering, Storage/audio/transcript database contracts, shared job/Edge runtime scaffolding, AI task runtime contracts, notifications, exports, stale review scanning, and cleanup finalization. Actual provider credentials/models and production delivery adapters remain environment-gated.
- The existing web app may now be expanded into a rough UI smoke-test harness for the full backend-backed MVP loop, including AI preflight/manual fallback states, run status, output review, notification preferences, export request/status/download, stale warnings, and job state displays.

## Consolidation And Cull Pass

- [[10 - Project Overview for AI]], [[90 - Next Steps Before Coding]], [[91 - Continuity Architecture Report]], [[92 - Priority 3 Alignment Report]], and [[99 - Revisions Archive]] were replaced with archive stubs.
- Duplicate router, current-truth, source-map, and completed-closeout content now points back to [[00 - Start Here]], [[02 - Source Map]], and [[03 - Glossary]].
- Active long specs remain separate notes to preserve citations and backlinks before coding.
- Archive stubs preserve original source-file pointers into `Sourced - Downloaded - 260518`.

## Retained Legacy/Internal Terms

- `workshop_sessions`, `workshop_input`, `workshop_path`, and `workshop_state` remain as internal schema names.
- Historical/reference notes may retain retired vocabulary as rationale; do not build from archive/reference notes.
- `LM Studio` may appear only as a V1 local-model product reference, not as Relic surface language.

## Final Checklist Status

| Check                             | Status                                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| Active source set present         | Present                                                                                 |
| Obsidian start note               | Complete                                                                                |
| Source map                        | Complete                                                                                |
| Repo bootstrap plan               | Added as [[44 - Repo Bootstrap and GitHub Setup Plan]] before foundation implementation |
| Glossary/backlinks                | Complete                                                                                |
| Archive stub cull                 | Complete                                                                                |
| Known schema confirmation warning | Fixed in vault copy                                                                     |
| Session prep naming               | Normalized in vault copy                                                                |
| Design-system filename            | Sorted as [[13 - Design System]] with HTML source at [[14 - Design System Source.html]] |
| AI registry standalone            | Complete: base contracts supplied in [[23 - AI Task Registry]] v1.0                     |
| Coding readiness                  | Conditionally ready for implementation planning after registry review acceptance         |
