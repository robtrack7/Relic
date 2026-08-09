---
status: active
authority: primary
scope: product
read_after:
  - "[[00 - Start Here]]"
last_audited: 2026-08-08
---

# Product Contract

## Product and user

Relic helps a Game Master create, organize, prepare, run, review, approve, and continue a Saga. The product is not a player wiki, VTT, rules adjudicator, autonomous storyteller, or generic chatbot.

The core loop is **Create → Organize → Prep → Run → Review → Approve → Continue**. A GM must be able to complete it manually when AI, network, or provider work is unavailable. The initial product client is responsive web; mobile browsers must retain the workflow, and native is deferred.

## Scope and surfaces

The Sanctum owns between-session work: first run, hierarchy selection, Library records, Notes, Threads, Session Prep, review, Approval Queue, settings, usage, imports, exports, and Loom access. The Stage owns the live Session packet, literal search, pinned content, captures/stubs, consent/recording, Mark Moment, dice, End, undo, and recovery.

Search is deterministic and separate from The Loom. The Loom is an always-available sidecar/sheet or fallback page, not a rail destination or a permanent chatbot column. It can answer, navigate, and prepare registered actions with sources, cost, effect, authority, confirmation, receipts, failure, retry, and manual fallback made visible.

## Product authority

The GM controls canon. AI, transcript output, extracted imports, and other source material remain non-canon until an approved write path completes. Reversible working-state changes still require the indicated confirmation. Canon-changing proposals are reviewed inline where allowed or routed through the Approval Queue; approval must validate sources, scope, versions, conflicts, and audit results. Archive is explicit and reversible. Hard delete is never a Loom executor.

Workspace owns subscription and usage. World owns shared setting canon. Saga owns play and Session data. World material may be used only when it is eligible and inspectable; sibling Sagas never inherit data by implication. Era/Timeframe is backend scaffolding, not MVP UI.

## MVP behavior

- First-run supports Start Blank, Bring Your Notes, and a recoverable Loom-guided Saga workshop. The workshop can create editable review material but only explicit commit creates the World/Saga/canon records.
- The Library supports Characters, Places, Factions, Artifacts, Threads, Notes, relationships, archive/restore, metadata, sources, and reviewed proposals. Thread timeline is read-only.
- Prep autosaves recoverably, uses cited non-canon AI output, preserves GM edits, and hands the latest valid packet to Stage only when explicitly marked Ready.
- Stage supports consent-aware audio capture, evidence-safe manual capture, short-window web recovery, idempotent lifecycle receipts, offline-safe behavior, and server-owned conflict handling. Background AI is forbidden during live/undo states.
- Post-session transcription, manual evidence, synthesis, citations, drift handling, and Approval Queue review produce pending material; no pipeline creates canon automatically.
- Import accepts text, Markdown, and safe textual PDFs. A GM explicitly selects ready current-Saga sources before a Loom turn; upload/extraction alone does not retrieve, embed, charge, draft, audit, or mutate canon. Private image attachments expose only GM-authored text and safe metadata to The Loom, never pixels or signed URLs.
- Usage/quota, private export, retention-aware settings, and content-safe notifications are part of the trust contract.

## Major exclusions

See [[05 - Deferred Decisions]]. In particular: player surfaces, autonomous AI, broad file/RAG ingestion, OCR/vision, image generation, system rules, writable graph/timeline tools, native client, BYOK/local models, and collaboration are not silent MVP scope.
