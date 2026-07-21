---
status: active
authority: primary
scope: reference
read_after:
  - "[[00 - Start Here]]"
depends_on:
  - "[[00 - Start Here]]"
supersedes: []
last_audited: 2026-07-20
source_file: "Relic Vault/02 - Source Map.md"
---

# Source Map

## Active Coding Sources

| Note | Use for | Authority |
|---|---|---|
| [[11 - Product Basepoint]] | Product north star, scope, naming, exclusions | Primary |
| [[12 - MVP PRD]] | P0 requirements and acceptance framing | Primary |
| [[13 - Design System]] | v0.4 web UI tokens, typography, palette, app shell, Loom carriage, component feel; wrapper for [[14 - Design System Source.html]] | Primary design |
| [[20 - Entity and Canon Schema]] | Data model, canon states, sources, drafts, audit, RLS sketch, Stage audio-completion markers | Implementation |
| [[21 - Tech Architecture]] | Supabase, RLS, Edge Functions, jobs, sync, Stage evidence recovery, provider-backed transcription/retry, deployment, monitoring | Implementation |
| [[22 - Memory and Retrieval]] | Embeddings, retrieval, task profiles, context assembly | Implementation |
| [[23 - AI Task Registry]] | Standalone MVP AI task contracts, task routing, prompt versions, validation, and draft/canon behavior | Implementation |
| [[24 - Approval Queue]] | Approval UX, diff, source citation, canon commit behavior | Implementation |
| [[25 - Pricing and Rate Limits]] | Caps, metering, quota preflight, hard stops | Implementation |
| [[30 - Sanctum UX Flow]] | Sanctum IA, dashboard, Threads, Relic Guide, post-session transcript review/retry, settings | UX |
| [[31 - Session Prep Flow]] | Session prep workspace and Ready for Stage handoff | UX |
| [[32 - Stage UX Flow]] | Live-session Stage behavior | UX |
| [[33 - First Run UX Flow]] | First-run, new saga, GM profile, Session 1 handoff | UX |
| [[34 - UI Implementation Spec]] | Routes, shells, components, build order | UI implementation |
| [[35 - Web Design Wireframe]] | Authenticated web app wireframe and first-pass design-system application | UI planning |
| [[40 - MVP Implementation Planning Sequence]] | Codex implementation planning order and validation gates | Planning |
| [[44 - Repo Bootstrap and GitHub Setup Plan]] | Repository structure, GitHub setup, and bootstrap guardrails before foundation work | Planning |
| [[41 - Foundation Implementation Plan]] | Non-AI technical foundation planning | Planning |
| [[42 - UI Manual Flow Implementation Plan]] | Manual loop UI planning before AI wiring | Planning |
| [[43 - AI Runtime Implementation Plan]] | AI runtime planning after registry acceptance | Planning |
| [[45 - Security Findings Register]] | Security findings, status, mitigation, and verification tracking | Security |
| [[46 - Backend Audit and Module Plan]] | Current backend readiness audit and backend module work order | Planning |
| [[47 - Backend Module 0 Baseline Plan]] | Detailed implementation plan for repeatable backend baseline verification | Planning |
| [[48 - Backend Module 1 Access Control Plan]] | Detailed implementation plan for backend access control, RLS, grants, and RPC boundary hardening | Planning |
| [[49 - Backend Module 2 Canon Write Path Plan]] | Detailed implementation plan for manual canon write provenance, source rows, audit rows, and conflict checks | Planning |
| [[51 - Backend Module 3 Approval Queue Plan]] | Detailed implementation plan for Approval Queue draft commit, rejection, merge, archive, and audit behavior | Planning |
| [[52 - Backend Module 4 Retrieval and Embeddings Plan]] | Detailed implementation plan for search, retrieval, embedding jobs, chunking, RRF, and retrieval eval fixtures | Planning |
| [[53 - Backend Module 5 Session Prep and Stage Data Plan]] | Detailed implementation plan for Session Prep, Stage lifecycle, quick captures, consent, dice, and packet read models | Planning |
| [[54 - Backend Module 6 Usage Quota and Metering Plan]] | Detailed implementation plan for quota preflight, usage event charging, monthly rollups, overrides, and usage summaries | Planning |
| [[55 - Backend Module 7 Storage Audio Transcription Cleanup Plan]] | Detailed implementation plan for Storage RLS, audio chunks, transcription jobs, transcript edits, retention, and cleanup jobs | Planning |
| [[56 - Backend Module 8 Background Job and Edge Runtime Plan]] | Detailed implementation plan for async job claiming, retries, dead letters, scoped JWTs, and Edge Function runtime scaffolding | Planning |
| [[57 - Backend Module 9 AI Task Router and Runtime Plan]] | Completed implementation record for Registry v1.0 AI task routing, validation, quota, retrieval, output writers, provider adapter boundary, and run logging | Planning |
| [[58 - Backend Module 10 Notifications Export Operations Plan]] | Detailed implementation plan for notifications, exports, stale pipeline scans, cleanup workers, and operational loops | Planning |
| [[50 - Session Log Index]] | Session closeout trail and implementation continuity logs | Operations |

## Design Specification Sources

These notes translate the active product, UX, and UI sources into compact screen-level design briefs. They are secondary to the owning source specs above and should be used with [[13 - Design System]] and [[34 - UI Implementation Spec]].

| Note | Use for | Authority |
|---|---|---|
| [[60 - Design Spec Overview]] | Entry point, design-spec map, preserved product decisions, review checklist | Secondary design |
| [[61 - Sanctum Dashboard Design Spec]] | Active Saga cockpit, dashboard states, quick create, recent canon, prep/review entry | Secondary design |
| [[62 - New Saga Design Spec]] | New saga entry, World/Saga choice, GM profile, help-level cards | Secondary design |
| [[63 - Saga Scaffold Review Design Spec]] | Creation-time AI draft review, source inspection, commit-to-canon moment | Secondary design |
| [[64 - Unified Library Detail Design Spec]] | Entity, Thread, Session, note library/detail patterns | Secondary design |
| [[65 - Session Prep Design Spec]] | Prep workspace inside The Sanctum and Ready for Stage handoff | Secondary design |
| [[66 - Stage Design Spec]] | Clean, focused live-session Stage across web and mobile; current web wireframe implementation decision and adapter boundaries | Secondary design |
| [[67 - Approval Queue Design Spec]] | Draft review, diff, source/provenance, canon approval | Secondary design |
| [[68 - Ask Search Design Spec]] | Top-context search, command palette, Relic Guide Q&A/actions | Secondary design |
| [[69 - Settings Usage Design Spec]] | Saga/World/Workspace settings, usage, retention, export | Secondary design |
| [[70 - Mobile App Design Spec]] | Mobile adaptation of both Sanctum and Stage | Secondary design |
| [[71 - Component Inventory Design Spec]] | Shared component vocabulary and state coverage | Secondary design |
| [[72 - Navigation Design Spec]] | Top context bar, left rail, global create, switcher, and nav tree | Secondary design |
| [[73 - Figma UI Import Readiness]] | Figma-to-React handoff contract, route mapping, backend wiring checklist | Secondary design |

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
