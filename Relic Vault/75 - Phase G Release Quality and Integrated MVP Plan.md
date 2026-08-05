---
status: active
authority: secondary
scope: implementation
read_after:
  - "[[00 - Start Here]]"
depends_on:
  - "[[11 - Product Basepoint]]"
  - "[[12 - MVP PRD]]"
  - "[[20 - Entity and Canon Schema]]"
  - "[[21 - Tech Architecture]]"
  - "[[22 - Memory and Retrieval]]"
  - "[[23 - AI Task Registry]]"
  - "[[24 - Approval Queue]]"
  - "[[25 - Pricing and Rate Limits]]"
  - "[[34 - UI Implementation Spec]]"
  - "[[74 - Phase F Trust Data and Operations Plan]]"
supersedes: []
last_audited: 2026-08-05
source_file: "Relic Vault/75 - Phase G Release Quality and Integrated MVP Plan.md"
---

> [!info] How to use this plan
> Owns: the final MVP integration, release-quality, hosted-smoke, and responsive-web alpha gate after Phase F.
> Does not own: product canon already locked by the active product, schema, architecture, memory, task-registry, approval, pricing, or UX notes.
> Implementation-critical note: Phase G may close gaps and prove the complete loop, but it may not weaken the GM-approval boundary or turn deferred V1 systems into implicit MVP features.

# Phase G — Release Quality and Integrated MVP Plan

## 1. Outcome

Phase G proves one coherent Relic MVP rather than a collection of packet demonstrations. A GM must be able to bring an existing campaign or World into Relic, or build one conversationally with The Loom; organize it into usable records, relationships, tags, Threads, objectives, Sessions, and Prep; run the Session on The Stage with recording, transcription, literal search, captures, dice, and GM-authored references; then review the evidence, synthesize proposed changes, explicitly approve canon, and retrieve the resulting state in the next Loom turn and Prep cycle.

The release target is a responsive web private alpha. Native Expo remains the first post-alpha platform packet. Phase G must preserve the shared contracts, offline/recovery behavior, and responsive layout required for a later native client.

## 2. Locked Phase G decisions

1. **Real Loom acceptance.** Deterministic fixtures remain mandatory for fast repeatability, failure injection, and CI, but they do not substitute for the G2 acceptance journey. Both creation paths must include real provider-backed Loom calls.
2. **Temporary model mapping.** The stable logical aliases `relic-fast`, `relic-balanced`, and `relic-deep` remain intact. In the isolated Phase G staging configuration, all three resolve to `openai/gpt-5.6-luna`. Every provider event records the logical alias and resolved model. This is a test configuration, not a permanent router simplification.
3. **Cost stop.** The cumulative Phase G OpenAI provider-cost ceiling is **$4 USD**. The hosted harness has both a conservative preflight estimate and an after-call ledger. It must stop before a request whose maximum estimated cost could cross the remaining allowance. A failed or ambiguous accounting read stops the run.
4. **PDF campaign/World intake is MVP.** PDF joins paste, plain text, and Markdown as supported import material. The extractor boundary is reusable for later rulebook ingestion, but a campaign/World PDF does not become a rulebook corpus and does not enable rules-grounding behavior.
5. **Image understanding and generation are V1.** MVP accepts bounded private image attachments and GM-authored descriptions. It does not send image pixels to a model, run OCR or computer vision, generate images, or infer atmosphere/content from the pixels.
6. **Rules boundary.** MVP keeps basic dice and GM-authored reference Notes/pins. It removes product-owned D&D examples or implied system automation. Full rulebook RAG, mechanics extraction, character-sheet automation, and system-specific adjudication remain V1.
7. **GM authority.** The Loom receives broad, typed creation and organization tools, but the user remains in the driver's seat. Reads may be immediate; reversible working-state changes require visible confirmation; canon requires inline approval or the Approval Queue; archive and hard delete keep their stronger safeguards.
8. **Hosting gate.** A Vercel staging deployment is required for release-candidate acceptance. Live Resend delivery may remain a documented external-configuration blocker for private alpha if deterministic delivery, preference, retry, and safe-content behavior remain proven.

## 3. Import, attachment, and retrieval boundaries

### 3.1 PDF source contract

PDF ingestion is a service-owned extraction workflow, never a browser parser and never a provider task.

- The browser checks an initial file-size/type allowlist, uploads to a private `imports` bucket, and creates an idempotent import request. The server distrusts all browser metadata.
- Objects use a canonical Workspace/World/Saga prefix. Database rows and Storage objects are both protected by owner-scoped RLS/policies; signed access is short-lived and server-authorized.
- The extractor verifies PDF magic bytes and permitted MIME, enforces file-size, page-count, decompressed-object, extracted-character, and processing-time ceilings, and rejects encrypted/password-protected, malformed, active-content, embedded-file, MIME-mismatched, polyglot, and resource-exhaustion fixtures.
- An image-only or scanned PDF returns `no_extractable_text`. OCR is V1. Rejection is a safe, stable user-facing state with retry/replace guidance and no partial source enrollment.
- The original private object is retained under the applicable retention contract. Extracted UTF-8 text is an immutable, versioned derived source linked to original object hash, byte size, page count, extractor name/version, and extraction timestamp. Derived text never replaces the original.
- Upload and extraction create no entity, Thread, Note, draft, AI run, embedding, usage charge, audit row, or canon mutation. The source begins in `ready_for_review` only after extraction succeeds.
- The GM explicitly selects one to eight ready sources and chooses `Draft with The Loom`. Because Import Inbox belongs to an existing Saga, the server freezes those selected versions into a new Saga-scoped Loom turn and reuses the E6–E10 typed action/confirmation path; it does not invoke the E5 new-Saga scaffold commit or create a duplicate Saga. Imported text is available only to that turn and its reviewed follow-up actions. Commit remains explicit.

The same extraction interface may later feed a separately authorized `rulebook_grounding` corpus. That V1 path requires distinct corpus membership, licensing/retention decisions, chunk policy, retrieval profile, and GM controls; generic imports are never silently treated as rulebooks.

### 3.2 Private photo attachment contract

MVP accepts JPEG, PNG, or WebP objects within explicit byte and pixel-dimension ceilings. It rejects SVG, animated formats, malformed files, MIME/magic mismatch, and active/polyglot content. Objects live in a private `attachments` bucket under the hierarchy prefix.

An attachment can be linked to a Character, Place, Faction, Artifact, Thread, or Note. It carries a GM-authored title, alt text, and optional atmosphere/creative description. The Loom may receive only that text, safe file-type/dimension metadata, attachment identity, and owning-record provenance. It never receives the binary object or a signed URL.

The GM may ask The Loom to use the description to propose an atmosphere Note, a Thread, a Thread marked/tagged as a quest, or related record changes. Those proposals use the normal typed action, source, review, and canon paths. Relic must say that it is using the GM's description rather than claiming to have seen the image.

### 3.3 Retrieval enrollment

Raw imports, original PDFs, private image objects, captions, workshop conversation, and pending drafts are excluded from ordinary vector retrieval by default. Explicit import enrollment freezes selected derived-text versions as workshop evidence. Only eligible committed canon, approved summaries, lore, and existing approved evidence enter the normal embedding queue. Retrieval continues to prefer exact/structured/lexical reads before semantic vector search and excludes sibling Sagas.

## 4. Ordered implementation packets

### G0 — Hosted foundation and prerequisite closeout

- Deploy the complete ordered local migration set to the isolated `relic-staging` project, including the Phase F migrations and search-path hardening.
- Re-run schema/data/storage authorization checks, reconcile every exposed function against the authenticated RPC allowlist, and remove grants from any function that is not intentionally browser-callable.
- Enable hosted leaked-password protection if available for the staging Auth plan; otherwise record the exact provider-console blocker.
- Triage performance-advisor findings that can affect the end-to-end fixture, especially foreign keys and query paths used by import, retrieval, Session, Review, and cleanup. Do not churn low-value unused-index warnings without measured evidence.
- Establish a private Vercel staging deployment with non-secret build configuration. Keep provider, Supabase service-role, signing, and notification credentials server-only.
- Create bounded test fixtures: text, Markdown, valid textual PDF, empty/image-only PDF, encrypted PDF, malformed PDF, oversized/page-bomb PDF, MIME mismatch, safe JPEG/PNG/WebP, malformed image, and oversized-dimension image.

**Gate:** hosted schema equals repository schema; privilege/advisor review is recorded; staging deploy is reachable; fixtures are deterministic; no provider call is required.

**2026-08-05 checkpoint:** the hosted schema, exact callable-surface audit, measured advisor hardening, and deterministic 19-file fixture matrix are complete with 1,151 database assertions passing. G0 remains open on two external-console items: the Supabase dashboard session required to enable leaked-password protection, and an authenticated/linked private web host required to publish staging. Local G1 work may continue, but G2 hosted acceptance cannot begin until both are closed. See `docs/PHASE_G0_HOSTED_READINESS.md`.

### G1 — Import, attachment, rules, and manual creation closure

- Extend Import Inbox state, schema, Storage policy, extractor worker, and UI for PDF upload/extraction/rejection/retry/recovery.
- Add explicit import selection and `Draft with The Loom`, reusing the Saga Loom conversation plus typed E6–E10 review/commit contracts rather than creating an automatic import-to-canon pipeline or misusing the E5 new-Saga scaffold.
- Complete visible manual and Loom-assisted tag/status editing needed by the integration fixture.
- Add private image attachment upload, caption/alt/description editing, record linking, safe viewing, deletion/retention behavior, and text-only Loom context.
- Replace hard-coded game-system rules content on The Stage with GM-authored reference Notes/pins. Preserve basic dice and label it as a convenience tool, not a rules adjudicator.
- Add loading, empty, denied, offline, malformed, quota, extraction-failure, and retry states for every new surface.

**Gate:** adversarial PDF/image fixtures fail safely; valid sources and attachments survive refresh/restart; no upload automatically calls AI, embeds, or writes canon; a selected import and a caption can enter the ordinary Loom review flow.

**2026-08-05 PDF checkpoint:** the trusted PDF slice is complete locally and on locked Supabase staging. The browser registers and uploads only to private Storage; the JWT-verified Edge extractor distrusts metadata, records immutable original/derived hashes and extractor provenance, and moves successful text only to `ready_for_review`. Ten synthetic cases pass against both local and hosted runtime: textual success plus safe rejection of empty, image-only, encrypted, active-content, embedded-file, over-page-limit, malformed, MIME-mismatched, and valid-PDF-plus-appended-image polyglot input. The final deployed bundle is 499.1 kB, all 1,181 database assertions and 155 web tests pass, and the slice made zero provider calls. G1 remains open for explicit selected-source Loom enrollment, private image attachments, tag/status editing, and GM-authored Stage references.

**2026-08-05 enrollment checkpoint:** explicit selected-source Loom enrollment is complete and deployed. One to eight ready current-Saga imports are frozen by immutable content hash into a new Loom turn; ordinary retrieval still excludes raw imports, retries bind the exact selected set, sibling or non-ready sources fail closed, and enrollment itself creates no draft, canon, audit, embedding, or usage event. The UI names the provider boundary before dispatch and routes into the normal action-by-action Loom review. Clean replay plus 1,198 database assertions, 156 web tests, and 105 runtime tests pass with zero provider calls. G1 now continues with private image attachments, tag/status editing, and GM-authored Stage references.

### G2 — Twin real-Loom integrated journeys

Run two clean, independently owned staging fixtures that converge on the same release spine.

**Journey A — bring an existing World/campaign:**

1. Create or select a World and start a Saga through `Bring your notes`.
2. Import a mixed text/Markdown/PDF source set. Inspect provenance and explicitly select sources for The Loom.
3. Use real Luna-backed Loom turns to clarify missing information and propose the scaffold.
4. Review/edit/commit the Saga, then create or update Characters, Places, Factions, Artifacts, Notes, relationships, tags/status, Threads, objectives, and Session 1 through typed Loom actions and normal confirmations.
5. Upload a private image with an atmosphere description. Ask The Loom to draft a related atmosphere Note and quest-like Thread from the description; verify pixels are not transmitted and output remains pending until approved.

**Journey B — conversational creation:**

1. Start `Build with AI` from a short premise.
2. Complete the bounded Loom interview using real Luna-backed calls and draft the full scaffold.
3. Review/edit/commit, then use the Loom to fill deliberate fixture gaps through the same typed actions and approval paths.

**Shared continuation for both journeys:**

1. Retrieve the new state through exact, structured, lexical, and semantic Loom questions and verify hierarchy, source attribution, alias/model trace, and sibling-Saga isolation.
2. Create and prepare a Session; generate/review a cited Prep briefing; order agenda and pins; mark Ready for Stage.
3. Open The Stage, verify cached/offline packet behavior, start the Session, record consent, capture real audio, create notes/stubs and a marked moment, use basic dice, search, inspect GM-authored references, exercise reconnect recovery, and end the Session.
4. Transcribe the uploaded audio, edit transcript evidence, add manual evidence if needed, synthesize source-cited proposed summaries/entity/Thread/next-Prep changes, and recover at least one controlled failure/retry.
5. Review conflicts and citations, explicitly approve selected changes, reject at least one proposal, and verify canon/audit/embedding effects are exact and idempotent.
6. Start a fresh process/browser context, ask The Loom about the approved changes, and generate the next Prep from the updated Sanctum state. Rejected or pending material must not appear as canon.

Deterministic versions of both paths run in CI with provider isolation. The bounded hosted acceptance uses the real provider for Loom, embedding, and transcription calls needed to prove the experience. It must not replace real product actions with direct database fixture writes except for test-user bootstrap and intentionally documented fault injection.

**Gate:** both journeys complete twice without cross-tenant leakage, autonomous canon, duplicate charges/effects, lost work, or a provider-cost ceiling breach.

### G3 — Error, permission, accessibility, and recovery matrix

- Add route-level loading and error boundaries plus one shared non-leaky failure taxonomy.
- Cover unauthenticated, denied, missing, archived, stale-version, quota, offline, timeout, provider unavailable, malformed result, and retry exhaustion states across the full loop.
- Add automated axe smoke checks for every core route/state, reduced-motion checks, visible focus checks, focus-return coverage, and a keyboard-only twin-path walkthrough.
- Verify long names/content, zoom, text scaling, and no horizontal overflow at 360×800, 390×844, 768×1024, 1280×800, and 1440×900.

**Gate:** zero serious/critical axe findings; the core loop is keyboard-completable; every recoverable failure preserves input and offers a correct next action.

### G4 — Visual, responsive, and interaction cleanup

- Establish approved baselines for auth, first run, import states, Home, Library list/detail, Threads, Prep, Stage, Review, Approval Queue, Settings, Loom plans/actions, and representative failures.
- Reconcile layout and behavior with the active design specs and current responsive web canon. Fix inconsistency, clipped content, unstable dialog focus, unclear action hierarchy, and misleading AI/rules language.
- Decompose high-risk Stage/UI modules only where it reduces release risk without changing validated DOM/interaction contracts.

**Gate:** approved baselines pass on target viewports; critical flows remain legible and operable on target alpha devices.

### G5 — Performance, observability, and CI release gate

- Measure cold/warm route loads, Import upload/extraction, Loom planning/provider time, exact/lexical/hybrid retrieval, Prep generation, Stage literal search, audio finalization, transcription, synthesis, approval commit, embedding visibility, and queue age.
- Set evidence-based budgets and address regressions on fixture-scale and large-Saga data. Add indexes only with query-plan evidence.
- Keep telemetry payload-free. Provider prompts/responses, imported text, transcript/audio, images, vectors, credentials, cookies, JWTs, signed URLs, and private content never enter logs or dashboards.
- Put the deterministic twin journeys, access-control suite, migration replay, unit/runtime tests, type check, build, accessibility smoke, and stable visual subset into CI.

**Gate:** two consecutive clean CI runs; no secret/private-content scan finding; budgets and accepted exceptions are recorded.

### G6 — Bounded Luna smoke and responsive-web release candidate

- Freeze staging aliases to `openai/gpt-5.6-luna`, exact fixture IDs, maximum provider attempts/calls, maximum input/output tokens, and conservative dollar estimate before running.
- Record cost after every provider response using actual token usage and the applicable current Luna rate. Refuse any next request whose conservative maximum could exceed the remaining portion of $4.
- Prove real Loom structured output/action handling, embeddings/retrieval, transcription/synthesis, retries, metering, zero autonomous canon, and cleanup/restart.
- Run the responsive-web alpha on target desktop/tablet/mobile browsers, including installability where supported, audio permission/capture, offline/reconnect, and private Storage access.
- Complete Vercel staging checks, safe environment review, data cleanup, and rollback instructions. Record real Resend as configured/pass or as the accepted external blocker.

**Gate:** both real-Loom journeys pass, final cumulative provider cost is below $4, staging is clean/restartable, responsive web is accepted as the private alpha client, and native Expo is moved to the first post-alpha plan.

## 5. Test evidence matrix

| Boundary | Required positive evidence | Required negative evidence |
|---|---|---|
| Import | text, Markdown, textual PDF; byte/hash/provenance; explicit enrollment | encrypted, malformed, image-only, oversized, MIME mismatch; no automatic AI/embed/canon |
| Attachment | private JPEG/PNG/WebP, caption/alt/description, linked record | invalid/polyglot/oversized denial; sibling denial; pixels absent from provider request |
| Loom creation | strict structured outputs, typed tools, confirmations, source snapshots | unknown tool/field, stale target, prompt injection, replay mismatch, cross-scope target |
| Retrieval | exact, structured, lexical, hybrid, approved post-commit visibility | sibling Saga, raw import, pending/rejected draft, private image/caption excluded by default |
| Stage | ready packet, offline cache, audio, notes/stubs, marked moment, dice, references | denied consent, reconnect conflict, duplicate receipt, hard-coded system-rule claims |
| Post-session | transcription, edit drift, manual evidence, synthesis, citations, retry | unsupported citation, stale batch, provider failure, autonomous canon/embedding |
| Approval | edit/approve/reject/commit, exact audit and embeddings | conflict, missing source, duplicate commit, bulk-incompatible mutation |
| Release | responsive target devices, accessibility, visual, performance, CI, restart | secret/private content in logs, cost overrun, uncleared fixture data |

## 6. V1 boundaries made explicit

The following are valuable continuations, not Phase G acceptance requirements:

- OCR and AI vision over uploaded images or scanned PDFs.
- Image generation and visual style/asset workflows.
- Rulebook corpus ingestion, `rulebook_grounding`, mechanics extraction, system schema derivation, rules adjudication, and automated character sheets.
- Direct World Anvil, Notion, Obsidian, or other third-party archive integrations.
- `.docx` extraction.
- Native Expo client and Expo push delivery.
- Multi-GM collaboration, players, publishing, and per-player permissions.

## 7. Stop conditions

Phase G pauses before further hosted calls when cost accounting is incomplete, the projected ceiling would exceed $4, tenant isolation fails, a provider payload leaks into telemetry, a mutation bypasses required confirmation/approval, a destructive path exceeds its registered authority, or fixture cleanup cannot be proven. Deterministic and UI work may continue after a provider stop only if it cannot conceal or overwrite the failed evidence.

Phase G is complete only when the release candidate proves the full Create → Organize → Prep → Run → Review → Approve → Continue loop through both import-assisted and conversational real-Loom paths.
