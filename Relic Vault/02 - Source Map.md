---
status: active
authority: primary
scope: reference
read_after:
  - "[[00 - Start Here]]"
depends_on:
  - "[[00 - Start Here]]"
supersedes: []
last_audited: 2026-05-20
source_file: "Relic Vault/02 - Source Map.md"
---

# Source Map

## Active Coding Sources

| Note | Use for | Authority |
|---|---|---|
| [[11 - Product Basepoint]] | Product north star, scope, naming, exclusions | Primary |
| [[12 - MVP PRD]] | P0 requirements and acceptance framing | Primary |
| [[14 - Design System Source]] | UI tokens, typography, palette, component feel | Primary design |
| [[20 - Entity and Canon Schema]] | Data model, canon states, sources, drafts, audit, RLS sketch | Implementation |
| [[21 - Tech Architecture]] | Supabase, RLS, Edge Functions, jobs, sync, deployment, monitoring | Implementation |
| [[22 - Memory and Retrieval]] | Embeddings, retrieval, task profiles, context assembly | Implementation |
| [[23 - AI Task Registry]] | Standalone MVP AI task contracts, task routing, prompt versions, validation, and draft/canon behavior | Implementation |
| [[24 - Approval Queue]] | Approval UX, diff, source citation, canon commit behavior | Implementation |
| [[25 - Pricing and Rate Limits]] | Caps, metering, quota preflight, hard stops | Implementation |
| [[30 - Sanctum UX Flow]] | Sanctum IA, dashboard, Threads, Ask, Review, settings | UX |
| [[31 - Session Prep Flow]] | Session prep workspace and Ready for Stage handoff | UX |
| [[32 - Stage UX Flow]] | Live-session Stage behavior | UX |
| [[33 - First Run UX Flow]] | First-run, new saga, GM profile, Session 1 handoff | UX |
| [[34 - UI Implementation Spec]] | Routes, shells, components, build order | UI implementation |
| [[40 - MVP Implementation Planning Sequence]] | Codex implementation planning order and validation gates | Planning |
| [[44 - Repo Bootstrap and GitHub Setup Plan]] | Repository structure, GitHub setup, and bootstrap guardrails before foundation work | Planning |
| [[41 - Foundation Implementation Plan]] | Non-AI technical foundation planning | Planning |
| [[42 - UI Manual Flow Implementation Plan]] | Manual loop UI planning before AI wiring | Planning |
| [[43 - AI Runtime Implementation Plan]] | AI runtime planning after registry acceptance | Planning |

## Archive / Non-Coding Notes

These notes are retained as stubs or historical references. They are not active coding sources.

| Note | Status | Use for |
|---|---|
| [[10 - Project Overview for AI]] | Archive stub | Legacy router; use [[00 - Start Here]] instead |
| [[90 - Next Steps Before Coding]] | Archive stub | Closed checklist; final status lives in [[04 - Final Contradiction Pass]] |
| [[91 - Continuity Architecture Report]] | Archive stub | Continuity rationale; active decisions are absorbed into active specs |
| [[92 - Priority 3 Alignment Report]] | Archive stub | Prior alignment report; final audit lives in [[04 - Final Contradiction Pass]] |
| [[99 - Revisions Archive]] | Archive stub | Historical argued revisions only |

## Filename Normalization

The vault normalizes active references to the imported files that are actually present:

- Memory: [[22 - Memory and Retrieval]]
- Approval Queue: [[24 - Approval Queue]]
- Session Prep: [[31 - Session Prep Flow]]
- Stage UX: [[32 - Stage UX Flow]]
- Design System: [[13 - Design System]] and [[14 - Design System Source.html]]

Future references to absent v3.6/v0.11/v0.9/v1.3/v0.3 docs are intentionally normalized back to the active imported versions in this vault.


## Intentionally Missing Or Deferred Filename References

These names may appear in reference/archive notes but are not active coding sources:

- `relic-world-saga-hierarchy-update-v0_1.md` — superseded by [[91 - Continuity Architecture Report]].
- `relic-game-system-spec-v0_1.md`, `relic-imports-v1-spec-v0_1.md`, `relic-player-facing-v1-spec-v0_1.md`, `relic-visual-continuity-v1-spec-v0_1.md`, `relic-era-canon-v1-spec-v0_1.md` — V1 parking-lot drafts listed in [[05 - V1 Parking Lot]], not present as standalone notes.
- Earlier v0.1/v0.4/v0.6/v0.7 filenames in reference reports are historical pointers only.
