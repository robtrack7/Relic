---
status: complete
scope: session-log
date: 2026-08-05
---

# Phase G1 Private Image Attachments

Back to [[50 - Session Log Index]].

## Accomplished

- Added bounded private JPEG, PNG, and WebP attachments for active-Saga Characters, Places, Factions, Artifacts, Threads, and Notes.
- Added exact Storage registration, JWT-authenticated Edge validation, trusted static-format/dimension/hash persistence, duplicate rejection, 60-second private viewing, and object-first deletion.
- Added Library upload, status, metadata editing, recovery, private preview, delete, and explicit Loom-description handoff UI.
- Preserved the GM boundary: upload never invokes AI, embeds, drafts, audits, or writes canon; Loom receives only GM-authored text, safe format/dimensions, target provenance, and an explicit image-not-inspected disclosure.
- Replaced direct authenticated image reads with short-lived server-authorized signed views.
- Deployed the migration, `media-attachment`, and updated `guide-submit` to locked Supabase staging and passed the same six-case real runtime smoke locally and hosted with zero provider calls.

## Changed

- Active entity/canon and Phase G contracts, implementation plan, gap analysis, and RPC boundary catalog.
- Private-image schema/RPC/Storage policy migration, Edge validator/function, and Guide enrollment boundary.
- Library data/types/actions/editor UI and focused component/action tests.
- Reusable local/locked-hosted image smoke plus validator/runtime and pgTAP coverage.

## Verification

- Clean migration replay passed; local Supabase advisors report no warnings or errors.
- All 43 database files / 1,240 assertions pass.
- All 31 web files / 159 tests, TypeScript check, and production build pass.
- All 113 script/runtime tests and repository verification pass.
- Real local and hosted smoke: static JPEG/PNG/WebP accepted; malformed, oversized-dimension, and MIME-mismatch files rejected; short-lived view and delete lifecycle passed.
- OpenAI/provider calls: `0`; Phase G provider cost consumed by this slice: `$0`.

## Open follow-ups

1. Finish G1 by replacing hard-coded Stage rules examples with GM-authored reference Notes/pins.
2. Run G2's two real Luna-backed journeys, including the explicit image-description-to-Loom proposal path and GM approval.
3. Close the Supabase leaked-password console toggle and private web-host deployment before final hosted acceptance.
