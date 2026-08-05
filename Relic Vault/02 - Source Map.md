---
status: active
authority: primary
scope: reference
read_after:
  - "[[00 - Start Here]]"
depends_on:
  - "[[00 - Start Here]]"
supersedes: []
last_audited: 2026-08-05
source_file: "Relic Vault/02 - Source Map.md"
---

# Source Map

## Active Coding Sources

| Note | Use for | Authority |
|---|---|---|
| [[11 - Product Basepoint]] | Product north star, scope, naming, exclusions | Primary |
| [[12 - MVP PRD]] | P0 requirements and acceptance framing | Primary |
| [[13 - Design System]] | v0.4 web UI tokens, typography, palette, app shell, Loom carriage, component feel; wrapper for [[14 - Design System Source.html]] | Primary design |
| [[20 - Entity and Canon Schema]] | Data model, canon states, sources, drafts, audit, RLS sketch, hierarchy/Saga lifecycle and staged delete cascade, Stage evidence markers, exactly-once write receipts, conflict outcomes, manual Session evidence provenance, source-aware synthesis batch identity, draft-scoped citation context, C5 approval receipts/commit invariants, D3 optimistic Thread/objective projections, D4 scheduled/ordered/recoverable Prep contracts, E4 non-canon Prep request/evidence/review projections, E5 pre-Saga conversational workshop/evidence/private turn receipts/explicit commit boundary, E7 bounded Loom read snapshots, E8 source-bound proposal/relationship/Thread action snapshots, E10 lifecycle intent and bounded-plan state, and D5 immutable Import Inbox provenance/lifecycle | Implementation |
| [[21 - Tech Architecture]] | Supabase, RLS, Edge Functions, jobs, sync, hierarchy navigation/lifecycle RPCs, persistent Loom compatibility threads, typed action registry/ledger/receipt boundary, E7 cheapest-sufficient retrieval planner/direct-turn boundary, E8 zero-credit proposal and existing-writer execution boundary, E9 server-derived Session/Prep/post-session/Workshop workflow handoffs, E10 protected lifecycle handoff and sequential stop-on-conflict plan execution, Session Prep AI, and recoverable pre-Saga Loom runtime boundaries, reserved-prefix-safe scoped JWT signing, real Storage-before-database Saga cleanup, Stage packet/audio/write recovery, recoverable optimistic web Prep autosave, provider-backed transcription/retry, manual evidence intake, provider-independent Import Inbox transport/retention and deferred docx extraction boundary, atomic synthesis output persistence, citation context/drift reads, approval/read/edit/rebase/explicit workshop commit boundaries, hosted provider configuration, safe telemetry, and completed E2 synthetic staging delivery/scheduler/restart gate | Implementation |
| [[22 - Memory and Retrieval]] | Embedding eligibility/text/version identity, deterministic and hosted delivery, Loom/Prep/pre-Saga workshop immutable evidence snapshots, non-canon conversation context, exact/structured/lexical/hybrid planning with one-hop expansion and lexical fallback, task profiles, and context assembly | Implementation |
| [[23 - AI Task Registry]] | Standalone MVP AI task contracts, Loom provider-safe registered action manifests including E7 reads, E8 knowledge proposal/canon tools, E9 Session/Prep/post-session/Workshop workflow tools, and E10 protected lifecycle/bounded-plan contracts, Guide/Prep/E5 planning/full-scaffold/targeted-regeneration typed provenance and review contracts, task routing, prompt versions, validation, source-aware synthesis artifacts, and draft/canon behavior | Implementation |
| [[24 - Approval Queue]] | Approval UX, field diffs, source citation/context including eligible World evidence on Saga drafts, safe drift/conflict states, explicit one/selected/all-compatible actions, Loom proposal intake, and canon/audit commit behavior | Implementation |
| [[25 - Pricing and Rate Limits]] | Caps, metering, quota preflight, hard stops, and disclosed per-action/downstream-task cost behavior | Implementation |
| [[30 - Sanctum UX Flow]] | Sanctum IA, dashboard, shared inline/full Prep parity, D3 Thread/objective/Failed grouping and read-only evidence timeline, D5 paste/text/Markdown Import Inbox, The Loom conversation and typed action cards, post-session transcript review/retry/manual evidence and citation navigation, settings | UX |
| [[31 - Session Prep Flow]] | Recoverable autosaving Session prep workspace, cited ephemeral AI assists, explicit acceptance/review routing, Loom-dispatched E4 tasks with disclosed exact cost, scheduling, actions, ordered pins, and latest-write Ready for Stage handoff | UX |
| [[32 - Stage UX Flow]] | Live-session Stage behavior and latest-persisted Prep packet consumption | UX |
| [[33 - First Run UX Flow]] | First-run, new saga, GM profile, Session 1 handoff | UX |
| [[34 - UI Implementation Spec]] | Routes, shells, three-dropdown hierarchy switching, Saga lifecycle settings, components, build order | UI implementation |
| [[35 - Web Design Wireframe]] | Authenticated web app wireframe and first-pass design-system application | UI planning |
| [[40 - MVP Implementation Planning Sequence]] | Current MVP delivery router, small-packet order, double checkpoints, and release gates | Planning |
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
| [[56 - Backend Module 8 Background Job and Edge Runtime Plan]] | Completed runtime record plus E2 safe provider events, operational summary/alerts, Vault-authenticated schedules, retention, and restart evidence | Planning |
| [[57 - Backend Module 9 AI Task Router and Runtime Plan]] | Completed Registry runtime record plus E2 explicit aliases/models, bounded provider calls, hosted light/deep proof, guarded replay, and payload-free telemetry | Planning |
| [[58 - Backend Module 10 Notifications Export Operations Plan]] | Detailed implementation plan for notifications, exports, stale pipeline scans, cleanup workers, and operational loops | Planning |
| [[59 - Phase E Loom Operating Layer Plan]] | Revised Phase E work order for profile-correct Saga creation, conversational workshops, typed Loom actions, adaptive retrieval, workflow tools, destructive-action safeguards, cost controls, and the bounded hosted-smoke/Phase F gate | Planning |
| [[74 - Phase F Trust Data and Operations Plan]] | Delivered Phase F trust/control-plane contract and evidence for scoped settings, retention-aware Loom recovery, real user-owned exports, private notifications, and the Phase G gate | Planning |
| [[75 - Phase G Release Quality and Integrated MVP Plan]] | Active Phase G work order for trusted campaign/World PDF intake, bounded private image attachments, twin real-Loom full-stack journeys, release-quality/accessibility/performance gates, Luna cost controls, and responsive-web private-alpha acceptance | Planning |
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
| [[67 - Approval Queue Design Spec]] | Draft review, field diff/editor, source/provenance, conflict recovery, one/selected/all-compatible actions, and canon approval | Secondary design |
| [[68 - Ask Search Design Spec]] | Top-context search, command palette, and The Loom conversations/actions | Secondary design |
| [[69 - Settings Usage Design Spec]] | Saga/World/Workspace settings, usage, retention, export | Secondary design |
| [[70 - Mobile App Design Spec]] | Mobile adaptation of both Sanctum and Stage | Secondary design |
| [[71 - Component Inventory Design Spec]] | Shared component vocabulary and state coverage | Secondary design |
| [[72 - Navigation Design Spec]] | Top context bar, left rail, global create, separate Workspace/World/Saga dropdowns, and nav tree | Secondary design |
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
