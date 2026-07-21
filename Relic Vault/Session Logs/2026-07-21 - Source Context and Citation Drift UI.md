---
status: complete
authority: support
scope: session-log
read_after:
  - "[[50 - Session Log Index]]"
depends_on:
  - "[[20 - Entity and Canon Schema]]"
  - "[[21 - Tech Architecture]]"
  - "[[24 - Approval Queue]]"
  - "[[30 - Sanctum UX Flow]]"
  - "[[34 - UI Implementation Spec]]"
  - "[[67 - Approval Queue Design Spec]]"
supersedes: []
last_audited: 2026-07-21
source_file: "Relic Vault/Session Logs/2026-07-21 - Source Context and Citation Drift UI.md"
---

# Source Context and Citation Drift UI

## Accomplished

- Made every C3 synthesis draft citation inspectable from Session Review and the Approval Queue through a keyboard-operable inline source disclosure.
- Added one draft-scoped authenticated read boundary that rechecks Workspace, World, Saga, draft, source, Session, transcript, and segment relationships server-side. The lower-level arbitrary source-ID helper is now internal-only.
- Rendered transcript timestamps, frozen cited excerpts, current segment text, and exact/edited/deleted drift. Added stable authorized links to the cited Session Review segment.
- Rendered pasted-note and GM-summary evidence without fabricated timestamps. Missing, broken, deleted, permission-denied, and unsupported sources collapse to safe non-identifying UI states.
- Kept the slice read-only: no draft editing, proposal approval, conflict/diff behavior, canon writes, audit writes, or C5 actions were added.

## Changed

- Migration `20260721154044_source_context_citations.sql`, focused C4 pgTAP/access/storage tests, browser-safe RPC boundary documentation, and draft citation data loading.
- `DraftCitationList`, Session Review transcript anchors, Approval Queue source disclosures, responsive shell/source-context CSS, component tests, and an authenticated C3-shaped draft-citation browser fixture.
- Root `PLAN.md`, `docs/MVP_GAP_ANALYSIS.md`, [[20 - Entity and Canon Schema]], [[21 - Tech Architecture]], [[24 - Approval Queue]], [[30 - Sanctum UX Flow]], [[34 - UI Implementation Spec]], [[55 - Backend Module 7 Storage Audio Transcription Cleanup Plan]], [[67 - Approval Queue Design Spec]], [[02 - Source Map]], and [[04 - Final Contradiction Pass]].

## Verified

- Checkpoint A: the UI test failed before the citation component existed and the database test failed before the scoped RPC existed. The completed component suite passed 5 focused tests; the C4 pgTAP file passed 23 assertions covering exact, edited, deleted, manual, broken, missing, unsupported, sibling-Saga, and other-Workspace cases.
- Checkpoint B: an authenticated browser fixture inserted a C3-shaped synthesis batch, opened citations from Session Review and Approval Queue by keyboard, compared frozen and edited transcript text, followed the exact segment anchor, rendered untimestamped manual evidence, and passed at 1440×900, 1024×768, 768×1024, and 390×844 without horizontal overflow.
- Full web lint passed; all 19 web test files / 68 tests passed; the production build passed; 14 script tests passed; repository verification passed after the C4 fixture was aligned with repository source guards.
- A clean migration replay passed. All 18 database files / 434 assertions passed. Database lint/advisors reported only existing findings outside the C4 functions.
- The complete authenticated Playwright suite passed serially with 5 tests passed and the external Stage-responsive fixture intentionally skipped. Its earlier concurrent run had one Stage setup timeout; the same Stage test passed in isolation and in the serial full suite.

## Remaining Risks and Follow-ups

- Signed audio playback/context is deferred. The audio bucket is private and browser downloads currently have no short-lived, retention-aware, fully scoped signing boundary; C4 did not widen Storage policy or expose object paths.
- Packet C5 is the immediate next packet: field diff, editing, conflict handling, approve/reject/merge/archive, and canon/audit commits remain deliberately untouched.
- Hosted LiteLLM/provider smoke, transcript re-embedding completion, and the repository's pre-existing database advisor findings remain open beyond C4.
