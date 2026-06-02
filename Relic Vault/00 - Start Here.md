---
status: active
authority: primary
scope: reference
read_after: []
depends_on: []
supersedes:
  - "[[10 - Project Overview for AI]]"
last_audited: 2026-05-20
source_file: "Relic Vault/00 - Start Here.md"
---

# 00 - Start Here

This is the mandatory first note for Relic MVP coding work. Treat `Relic Vault` as the canonical edited bundle. Treat `Sourced - Downloaded - 260518` as the untouched import snapshot.

## Coding-Readiness Status

**Status: conditionally ready for implementation planning.** The AI Task Registry source gap has been closed in [[23 - AI Task Registry]] v1.0 by rewriting the missing base task contracts from the active vault authority. AI task surfaces may enter implementation planning after registry review acceptance, but canon mutation rules remain unchanged: AI never writes canon without explicit GM approval or a documented GM-direct synthetic approval path.

All active source documents needed for the vault pass are present and linked.

## Authority Order

1. [[00 - Start Here]]
2. [[11 - Product Basepoint]]
3. [[12 - MVP PRD]]
4. [[13 - Design System]]
5. Implementation contracts: [[20 - Entity and Canon Schema]], [[21 - Tech Architecture]], [[22 - Memory and Retrieval]], [[23 - AI Task Registry]], [[24 - Approval Queue]], [[25 - Pricing and Rate Limits]]
6. UX and UI specs: [[30 - Sanctum UX Flow]], [[31 - Session Prep Flow]], [[32 - Stage UX Flow]], [[33 - First Run UX Flow]], [[34 - UI Implementation Spec]]
7. Reference and audit notes: [[90 - Next Steps Before Coding]], [[91 - Continuity Architecture Report]], [[92 - Priority 3 Alignment Report]], [[99 - Revisions Archive]]

## Coding Bundle Read Path

- Product/scope work: read [[11 - Product Basepoint]], [[12 - MVP PRD]], then [[03 - Glossary]].
- Backend/schema work: read [[20 - Entity and Canon Schema]], [[21 - Tech Architecture]], [[25 - Pricing and Rate Limits]], then the relevant UX note.
- AI/retrieval work: read [[22 - Memory and Retrieval]], [[23 - AI Task Registry]], [[24 - Approval Queue]], and [[25 - Pricing and Rate Limits]] before planning task routing or AI surfaces.
- UX/UI work: read [[13 - Design System]], [[30 - Sanctum UX Flow]], [[31 - Session Prep Flow]], [[32 - Stage UX Flow]], [[33 - First Run UX Flow]], and [[34 - UI Implementation Spec]].
- Screen-level design work: read [[60 - Design Spec Overview]], [[72 - Navigation Design Spec]], then the relevant screen spec and [[71 - Component Inventory Design Spec]] after the owning UX/UI sources.
- Historical/context work: use archive stubs only to locate original imported files; do not build from archived notes.

## Read This Before Coding

- Relic is Game Master software in MVP status usings Create -> Organize -> Prep -> Run -> Review -> Approve -> Continue workflow
- User-facing surfaces are The Sanctum and The Stage.
- The Sanctum is the literary, modern, relaxing side of Relic for between-session creation, prep, review, and canon work.
- The Stage is the clean, focused side of Relic for live-session use.
- Sanctum and Stage are both available on web and mobile; they are two sides of the same product, not a platform split.
- Build order is web app first, then mobile app after the web implementation proves the full loop.
- Session prep is a workflow inside The Sanctum, not a third top-level mode.
- Saga creation replaces old user-facing creation-mode wording. Internal names like `workshop_sessions`, `workshop_input`, `workshop_path`, and `workshop_state` remain valid schema identifiers.
- Workspace owns billing, usage, and future collaboration. World owns shared setting canon. Saga owns active play and session data.
- Era/Timeframe is V1-ready backend scaffolding only in MVP.
- AI is GM-invoked except visible read-only prep briefing behavior. AI never mutates canon without explicit GM approval.
- Canon writes use direct GM action or the approval write path.
- Thread Timeline is MVP read-only. Full graph/constellation and writable timeline editors are V1.

## Vault Operating Rules

- Start here, then follow the authority order.
- Prefer linked notes over long pasted context.
- Keep specs focused. Future specs should target 1,500-3,500 words and split above roughly 5,000 words unless a single contract must stay intact.
- Add new implementation decisions to the owning active spec first, then update [[02 - Source Map]] and [[04 - Final Contradiction Pass]].
- Do not build directly from archive/reference notes.
- Keep duplicated current-truth language out of archived routers. Use this note plus [[03 - Glossary]] instead.

## Support Notes

- [[02 - Source Map]]
- [[03 - Glossary]]
- [[04 - Final Contradiction Pass]]
- [[05 - V1 Parking Lot]]
- [[40 - MVP Implementation Planning Sequence]]
- [[45 - Security Findings Register]]
- [[46 - Backend Audit and Module Plan]]
- [[47 - Backend Module 0 Baseline Plan]]
- [[48 - Backend Module 1 Access Control Plan]]
- [[49 - Backend Module 2 Canon Write Path Plan]]
- [[50 - Session Log Index]]
- [[51 - Backend Module 3 Approval Queue Plan]]
- [[52 - Backend Module 4 Retrieval and Embeddings Plan]]
- [[53 - Backend Module 5 Session Prep and Stage Data Plan]]
- [[54 - Backend Module 6 Usage Quota and Metering Plan]]
- [[55 - Backend Module 7 Storage Audio Transcription Cleanup Plan]]
- [[56 - Backend Module 8 Background Job and Edge Runtime Plan]]
- [[57 - Backend Module 9 AI Task Router and Runtime Plan]]
- [[58 - Backend Module 10 Notifications Export Operations Plan]]
- [[60 - Design Spec Overview]]
- [[72 - Navigation Design Spec]]
