---
status: partial
scope: session-log
date: 2026-08-05
---

# Phase G1 Trusted PDF Import

Back to [[50 - Session Log Index]].

## Accomplished

- Added private PDF registration/upload, trusted Edge extraction, immutable original/derived provenance, and explicit ready/rejected lifecycle behavior without automatic AI, embedding, draft, or canon effects.
- Added Import Inbox PDF upload, retry/recovery, provenance, and scanned-PDF/OCR-V1 messaging.
- Added service-only completion/failure writers, owner-scoped Storage policy, immutable ready-original protection, and exact authenticated/worker RPC audits.
- Deployed the migration and JWT-verified `extract-import-pdf` function to locked staging; the final bundle is 499.1 kB.
- Added a deterministic runtime smoke harness that obtains staging credentials only in process memory, creates isolated synthetic state, tests ten PDF cases including a true polyglot, and proves cleanup.

## Verification

- Clean migration replay and all 40 database test files / 1,181 pgTAP assertions pass.
- All 30 web test files / 155 tests, TypeScript, production build, 105 script/runtime tests, and repository verification pass.
- Local and hosted runtime matrices pass textual extraction plus exact rejection for empty, image-only, encrypted, active-content, embedded-file, over-page-limit, malformed, MIME-mismatched, and polyglot PDFs.
- Hosted cleanup reports zero synthetic users and Workspaces. OpenAI calls: `0`; Phase G provider cost consumed by this slice: `$0`.

## Open follow-ups

1. Add explicit selected-source `Draft with The Loom` enrollment through the existing conversational workshop/review contract.
2. Complete private image attachments and text-only Loom context, Library tag/status editing, and GM-authored Stage references.
3. Close G0's authenticated Supabase dashboard toggle and linked private web-host blockers before G2 hosted acceptance.
