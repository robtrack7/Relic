---
date: 2026-07-21
packet: D5
status: partially-complete
---

# Import Inbox and Milestone D Closeout

Linked from [[50 - Session Log Index]]. Canon and implementation boundaries were reconciled through [[20 - Entity and Canon Schema]], [[21 - Tech Architecture]], [[25 - Pricing and Rate Limits]], [[30 - Sanctum UX Flow]], [[34 - UI Implementation Spec]], [[40 - MVP Implementation Planning Sequence]], and [[42 - UI Manual Flow Implementation Plan]].

## Accomplished

- Added a Saga-scoped Import Inbox for pasted text and strict UTF-8 `.txt`, `.md`, and `.markdown` files.
- Added immutable source provenance for Workspace, World, Saga, uploader, original filename, MIME, byte size, ingestion method, content hash, and timestamps.
- Added stable-key exact retry, changed-payload rejection, exact-content deduplication, ready/archive review transitions, quota-safe manual fallback, and owner/scope local draft recovery.
- Kept imported material raw and review-only: ingestion creates no canon, notes, entities, Threads, Prep content, drafts, Approval Queue proposals, embeddings, embedding jobs, AI runs, provider calls, or usage charges.
- Added strict filename, extension, MIME, UTF-8, empty, malformed-control, and size validation plus sibling-Saga denial and direct-RPC boundary coverage.
- Closed the Milestone D browser gate with the authenticated manual spine, deterministic Approval Queue trust flow, and fresh-server D4/D5/Approval Queue persistence checks.

## Changed surfaces

- Database: D5 migration, scoped import RPCs, provenance trigger, grants, RPC boundary catalog, pgTAP coverage, and access-control catalog.
- Web: Import Inbox route, shell navigation, paste/file/review/archive UI, byte-stable server action transport, local recovery, styling, unit/component/action/route tests, and authenticated browser coverage.
- Planning and canon: `PLAN.md`, `docs/MVP_GAP_ANALYSIS.md`, active source/provenance, architecture, quota, UX, implementation, source-map, contradiction, and packet-routing notes.

## Verification evidence

- Clean local database reset and migration replay: passed.
- Full pgTAP: 24 files, 667 assertions, passed.
- Database lint: no D5 warning; only existing pgTAP-extension analyzer noise plus reserved/unused/shadowed warnings in pre-D5 quota, transcription, and transcript-segment functions remain.
- Web: 26 files and 120 tests passed; TypeScript lint and Next.js production build passed.
- Scripts: 17 tests passed; repository verification returned `RELIC_REPO_VERIFY_OK`.
- Authenticated browser: signup/Create → Import review → Organize → Prep → Stage passed; D5 failure/retry, exact-source review, rejection, archive, zero-downstream effects, sibling isolation, keyboard-accessible controls, and no overflow passed at 1440×900, 1024×768, 768×1024, and 390×844.
- Review/Approve/Continue: the deterministic C5 source-aware approval flow passed. Separate fresh application-server runs preserved unresolved approval state, D4 Prep state, and D5 ready/archived states.

## Deferred `.docx` boundary

`.docx` remains safely rejected and D5 is partially complete by format. It must not ship until a trusted non-browser extractor deterministically rejects encrypted, macro-enabled, malformed, excessively nested, zip-bomb-like, oversized, and MIME-mismatched documents; preserves the original when retention permits; writes extracted text as a linked derived source; records extraction version and a safe failure code; and passes the complete fixture matrix. MVP does not require formatting-perfect conversion.

## Follow-up

Packet E1 is next. Embedding and re-embedding delivery must keep Import Inbox sources excluded unless a later explicit GM enrollment contract is approved. Broader retention controls, real export, hosted providers, and notification delivery remain later work.
