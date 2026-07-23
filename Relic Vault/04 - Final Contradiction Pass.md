---
status: active
authority: primary
scope: reference
read_after:
  - "[[00 - Start Here]]"
depends_on:
  - "[[02 - Source Map]]"
supersedes:
  - "[[90 - Next Steps Before Coding]]"
last_audited: 2026-07-23
source_file: "Relic Vault/04 - Final Contradiction Pass.md"
---

# Final Contradiction Pass

## Result

The vault pass normalized the imported active specs into `Relic Vault`, added Obsidian frontmatter/router blocks, fixed known stale naming and version references, and preserved `Sourced - Downloaded - 260518` as an untouched import snapshot.

## Prior Blocker Resolution

The AI registry source gap has been resolved in [[23 - AI Task Registry]] v1.0. The missing base task contracts were rewritten from active vault authority for `scaffold_saga`, `draft_entity_from_prompt`, `generate_session_prep`, `compose_prep_briefing`, `synthesize_session`, and related task/infrastructure labels. [[22 - Memory and Retrieval]] now explicitly maps registry tasks to retrieval profiles.

AI task surfaces still require implementation-plan review before coding, but the vault no longer depends on absent base registry material.

## Fixed In Vault Copies

- Schema `experience_level` warning removed; values locked as `new`, `returning`, `experienced`, `veteran`.
- `studio_grounding` normalized to `session_prep_grounding`.
- `studio_query` normalized to `prep_query`.
- `studio_tour_dismissed_at` normalized to `session_prep_intro_dismissed_at`.
- Active source references normalized to the files present in the bundle: Memory v0.9, Approval Queue v0.5, Session Prep v0.2, Stage UX v0.6.
- AI registry rewritten as standalone v1.0 and Memory updated to v0.9 profile mapping.
- Future-version references in newly added docs normalized back to the actual active imported source set.
- Design examples changed from Campaign wording to Saga wording.
- Stale footers updated for Schema, Tech Architecture, UI Implementation, Pricing, PRD, Sanctum, and Stage where found.

## Current UI Planning Addendum

- [[40 - MVP Implementation Planning Sequence]] now routes current work through the root `PLAN.md` small-packet delivery plan and `docs/MVP_GAP_ANALYSIS.md` evidence ledger. Each packet requires focused/recovery tests plus an integrated workflow checkpoint; each phase requires a clean migration replay and full milestone regression before the next lane opens.
- [[35 - Web Design Wireframe]] records the authenticated web-app design structure for the first design-system implementation pass.
- The refined Claude Design package `Relic Design System (web) v0.4` was imported into [[14 - Design System Source.html]] on 2026-06-02. [[13 - Design System]] and active UX specs remain canonical.
- v0.4 names Verdigris `#2F6B6E` as the active/synced/success token. Older active notes may have used Sage for this role; current design and implementation should use Verdigris terminology.
- The web shell resolves Search/Relic Guide tension by keeping Search in the top context bar and Relic Guide as an always-available sidecar/sheet, not a primary rail item.
- The first implementation pass is scoped to tokens, local fonts/assets, shared primitives, The Sanctum shell, Prepare workflow, and the web Stage surface. It does not wire provider calls, autonomous AI behavior, live Stage captions, or deferred V1 surfaces.
- [[66 - Stage Design Spec]] now records the 2026-07-20 web implementation decision: the standalone Claude Design wireframe controls concrete Stage layout, while [[32 - Stage UX Flow]] continues to own lifecycle, offline, recording, and Mark Moment requirements. The five-action wireframe rail does not silently retire those upstream obligations.
- The July 2026 Stage evidence patch keeps that rail unchanged by placing Mark Moment inside Note, persists 30-second web chunks in IndexedDB before direct Storage upload, and makes undo expiry plus complete-audio transcription eligibility server-owned and idempotent.
- The July 2026 Stage non-audio recovery patch adds a separate short-window web intent queue for Quick Capture, Quick Stub, Mark Moment, End Session, and Undo. FIFO replay plus stable GM-scoped idempotency receipts prevents a lifecycle transition from passing earlier evidence and does not change the manual-GM canon paths or imply that the later full packet cache is complete.
- The July 2026 B2 patch completes that bounded web cache: an owner-keyed Ready/live packet plus current-Saga/eligible-World literal index survives an offline route reload, while Start, consent, and Go Live join the FIFO receipt boundary. Lifecycle/consent mismatches are immutable surfaced conflicts and never silently overwrite the server. This is short-window web recovery, not an installable cold-boot shell or the planned native multi-session store.
- The July 2026 post-session patch delivers the provider-backed transcription worker plus scoped transcript read/edit/retry recovery. Deterministic local provider mode is not a substitute for a deployed LiteLLM smoke test, and transcript/synthesis evidence never becomes canon without the existing explicit approval path.
- The July 2026 C1 patch makes pasted notes and GM manual summaries independent, immutable Session evidence sources. Local draft recovery and stable client source IDs protect failed/repeated saves; intake does not invoke synthesis, meter credits, create proposals, or cross the explicit GM canon boundary.
- The July 2026 C3 patch converts only validated `synthesize_session` output into one atomic pending batch. Summary, entity, Thread, and next-prep drafts retain exact-Session citations plus run/pipeline/task/prompt/model/provider provenance; retry, source rejection, and partial failure cannot create duplicate or partial drafts, and the writer never creates canon, audit rows, embeddings, or a canonical summary note.
- The July 2026 C4 patch makes those citations inspectable through an exact draft-scoped browser read, with frozen/current/deleted transcript drift, authorized Session segment anchors, untimestamped manual evidence, and non-leaking failure states. The raw source-ID helper is internal-only. Signed audio remains deferred until private Storage can be exposed through a retention-aware scoped signing contract.
- The July 2026 C5 patch completes the Approval Queue trust boundary: field-level diffs replace raw payload review; one, selected, and prominent all-compatible approval remain explicit GM actions; archive requires separate confirmation; merge creates a separately approvable source-linked update; and target locks, version/source checks, private receipts, and same-Saga validation prevent silent overwrite or duplicate canon/audit. This decision supersedes older active language that discouraged prominent Approve All.
- The July 2026 D1 patch resolves the open hierarchy-switcher treatment as three separate Workspace, World, and Saga dropdowns. Authorized landing targets prevent sibling leakage; live/ending Sessions block context changes; exact-name Saga deletion soft-hides first, removes real Storage objects, then hard-deletes database rows. Older deterministic-count cleanup and database-first cascade wording is superseded.
- The July 2026 D2 patch completes the six-type Library lifecycle. Ordinary edits visibly autosave; source/provenance, relationships, Note attachments, suggested mentions, and accepted backlinks remain scoped to the active hierarchy; mention/link acceptance stays GM-driven. Permanent deletion is limited to archived, unreferenced records behind checkbox plus exact-name confirmation. Sources and audit history remain as tombstones, while derived embeddings are removed.
- The July 2026 D3 patch makes Failed a separate Thread group rather than folding it into Resolved, and replaces the older synthetic-approved-draft wording for GM-direct resolution with the established scoped manual source/audit path. Objective transitions are optimistically versioned and audited; the timeline is a read-only projection from Thread/objective, Session active/pin, source, and canon-audit evidence, never a second editable history store.
- The July 2026 D4 patch resolves explicit-save-only and started-state Prep ambiguity. Home and full Prepare share visible recoverable autosave; only planned/ready Sessions are editable; Ready flushes the latest successful version before Stage reads it. Ordered archived/missing pins degrade safely, same-Saga validation blocks substitution, and manual Prep performs zero provider calls and zero automatic canon writes.
- The July 2026 D5 patch replaces the Import Inbox placeholder with provider-independent paste and strict UTF-8 text/Markdown intake. Imports remain immutable raw sources in ready/archived review states, are excluded from retrieval/embeddings/AI/proposals/canon, and preserve local input through interruption. Older wording that lists docx/PDF as shipping with the inbox is superseded: PDF remains out of MVP and `.docx` remains deferred until the trusted extraction/rejection matrix is deterministic.
- The July 2026 E2 completion supersedes older Tech Architecture/Memory language that allowed raw prompts, responses, or search queries in LiteLLM/PostHog logs. Provider telemetry is fixed-field and service-only, and hosted deterministic mode or implicit model fallback fails closed. The authorized `relic-staging` database/functions, server-only/Vault configuration, schedules, and bounded five-alias `relic-llm-dev` exception passed synthetic transcription, embedding, light/deep task, retry/recovery, restart, metering, tenant-isolation, and zero-canon-write proof. This is shared staging delivery evidence, not authorization for production or normal reuse of the development proxy.

## Current Backend Planning Addendum

- [[46 - Backend Audit and Module Plan]] records the 2026-06-01 backend readiness audit and the module work order before additional UI expansion.
- [[48 - Backend Module 1 Access Control Plan]] records the access-control/RLS/RPC boundary implementation plan that must pass before product backend behavior expands.
- [[49 - Backend Module 2 Canon Write Path Plan]] records the manual canon write provenance/audit implementation plan that must pass before Approval Queue commits are expanded.
- [[51 - Backend Module 3 Approval Queue Plan]] records the Approval Queue commit implementation plan that turns draft approval into canon mutation.
- [[52 - Backend Module 4 Retrieval and Embeddings Plan]] records the retrieval, embedding queue, worker contract, and RRF implementation plan that must pass before AI runtime depends on memory.
- [[53 - Backend Module 5 Session Prep and Stage Data Plan]] records the Session Prep and Stage data implementation plan that must pass before rough UI flow testing.
- [[54 - Backend Module 6 Usage Quota and Metering Plan]] records the usage, quota, rollup, and metering implementation plan that must pass before paid/provider-backed actions are wired.
- [[55 - Backend Module 7 Storage Audio Transcription Cleanup Plan]] records the completed Storage, audio chunk, transcription, transcript-edit, retention, and cleanup database contracts needed for rough UI recording/upload testing.
- [[56 - Backend Module 8 Background Job and Edge Runtime Plan]] records the completed background job runtime, scoped JWT, retry, dead-letter, and Edge Function scaffolding implementation needed before provider-backed async work is enabled.
- The July 2026 E1 delivery pass names the custom signing secret `RELIC_JWT_SIGNING_SECRET`; `SUPABASE_JWT_SECRET` is invalid for local or hosted configuration because Supabase reserves the `SUPABASE_` prefix. The issuer remains the only function that reads the secret, and workers still re-enter Postgres with short-lived GM-scoped identity. E2 limits the current HS256 implementation to synthetic staging compatibility; the production target is the same dedicated issuer with an imported asymmetric signing key, or a separately reviewed service-only RPC design.
- [[57 - Backend Module 9 AI Task Router and Runtime Plan]] records the completed AI task router/runtime implementation for Registry v1.0 task contracts, validation, quota, retrieval, output writers, provider adapter boundary, and run logging.
- [[58 - Backend Module 10 Notifications Export Operations Plan]] records the completed notifications, export generation, stale pipeline scan, cleanup worker, and operational loop implementation.
- The current backend has foundation schema/RLS/RPC scaffolding plus completed backend modules for access boundaries, canon provenance, Approval Queue commits, E1 deterministic/hosted embedding delivery and hybrid retrieval, manual Session Prep/Stage data, usage/quota metering, Storage/audio/transcript contracts, shared job/Edge runtime, AI task runtime, notifications, exports, stale review scanning, and cleanup finalization. E2 additionally proves the shared hosted transcription, embedding, light/deep AI, scheduling, observability, retry/replay, metering, and isolation boundaries in synthetic staging. E3–E5 still own product workflows; notification/export providers and production promotion remain separate gates.
- The existing web app may now be expanded into a rough UI smoke-test harness for the full backend-backed MVP loop, including AI preflight/manual fallback states, run status, output review, notification preferences, export request/status/download, stale warnings, and job state displays.

## Consolidation And Cull Pass

- [[10 - Project Overview for AI]], [[90 - Next Steps Before Coding]], [[91 - Continuity Architecture Report]], [[92 - Priority 3 Alignment Report]], and [[99 - Revisions Archive]] were replaced with archive stubs.
- Duplicate router, current-truth, source-map, and completed-closeout content now points back to [[00 - Start Here]], [[02 - Source Map]], and [[03 - Glossary]].
- Active long specs remain separate notes to preserve citations and backlinks before coding.
- Archive stubs preserve original source-file pointers into `Sourced - Downloaded - 260518`.

## Retained Legacy/Internal Terms

- `workshop_sessions`, `workshop_input`, `workshop_path`, and `workshop_state` remain as internal schema names.
- Historical/reference notes may retain retired vocabulary as rationale; do not build from archive/reference notes.
- `LM Studio` may appear only as a V1 local-model product reference, not as Relic surface language.

## Final Checklist Status

| Check                             | Status                                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| Active source set present         | Present                                                                                 |
| Obsidian start note               | Complete                                                                                |
| Source map                        | Complete                                                                                |
| Repo bootstrap plan               | Added as [[44 - Repo Bootstrap and GitHub Setup Plan]] before foundation implementation |
| Glossary/backlinks                | Complete                                                                                |
| Archive stub cull                 | Complete                                                                                |
| Known schema confirmation warning | Fixed in vault copy                                                                     |
| Session prep naming               | Normalized in vault copy                                                                |
| Design-system filename            | Sorted as [[13 - Design System]] with HTML source at [[14 - Design System Source.html]] |
| AI registry standalone            | Complete: base contracts supplied in [[23 - AI Task Registry]] v1.0                     |
| Coding readiness                  | Conditionally ready for implementation planning after registry review acceptance         |
