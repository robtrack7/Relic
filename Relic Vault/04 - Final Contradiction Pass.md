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
last_audited: 2026-05-20
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
