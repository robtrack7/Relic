---
status: complete
authority: support
scope: session-log
read_after:
  - "[[50 - Session Log Index]]"
depends_on:
  - "[[20 - Entity and Canon Schema]]"
  - "[[21 - Tech Architecture]]"
  - "[[30 - Sanctum UX Flow]]"
  - "[[34 - UI Implementation Spec]]"
supersedes: []
last_audited: 2026-07-21
source_file: "Relic Vault/Session Logs/2026-07-21 - Session Manual Evidence Intake.md"
---

# Session Manual Evidence Intake

## Accomplished

- Added pasted-notes and GM manual-summary inputs to scoped Session Review, with owner/session-keyed local drafts that survive refresh and failed saves.
- Added an authenticated `save_session_evidence` RPC that accepts ended Sessions only, uses a stable client source UUID for exact-retry idempotency, and stores immutable `sources` with Workspace/World/Saga/Session provenance.
- Returned saved manual evidence through `get_session_review` and ensured either manual input can create or recover a queued synthesis pipeline input without starting synthesis.
- Preserved the canon and charging boundaries: intake creates no notes, proposals, audit rows, AI runs, credit usage, or canon mutations.

## Changed

- [[20 - Entity and Canon Schema]], [[21 - Tech Architecture]], [[30 - Sanctum UX Flow]], [[34 - UI Implementation Spec]], [[02 - Source Map]], [[04 - Final Contradiction Pass]], root `PLAN.md`, and `docs/MVP_GAP_ANALYSIS.md`.
- Session Review actions, data types, local draft storage, component/CSS behavior, and focused/authenticated browser tests under `apps/web`.
- Migration `20260721080158_session_manual_evidence_intake.sql`, 27-check C1 pgTAP coverage, access-control catalog, and `supabase/security/rpc-boundary.md`.

## Verified

- Clean Supabase reset and migration replay passed; all 16 database files and 367 pgTAP checks passed. The focused C1/transcription/access run passed 55 checks.
- Web lint passed; all 18 web test files and 63 tests passed; the production build passed; script tests passed 9 tests.
- The authenticated C1 browser proof passed reload recovery, exact saved-source readback, independent pasted/summary survival, and zero note/draft/audit side effects. The existing A1–A3 authenticated loop also passed.
- Supabase database lint and advisors completed with only existing repository findings; the C1 functions introduced no new finding. Repository, whitespace, scoped wikilink, stale-term, and version-reference checks passed.

## Follow-ups

- Begin Packet C2: idempotent `synthesize_session` orchestration over all surviving transcript/manual inputs using the existing AI run, quota, validation, metering, retry, and provenance boundaries.
- Run the hosted LiteLLM transcription smoke when deployment secrets and authorization are available.
- Continue with C3 source-aware draft writing only after C2 proves zero canon writes and safe retries.
