---
status: active
authority: secondary
scope: mvp
read_after:
  - "[[00 - Start Here]]"
depends_on:
  - "[[00 - Start Here]]"
supersedes: []
last_audited: 2026-08-04
source_file: "Sourced - Downloaded - 260518/relic-ui-implementation-spec-v0_2.md"
---

> [!info] How to use this spec
> Owns: Route map, shells, components, build order, empty/loading/error states, and UI acceptance criteria.
> Does not own: Historical rationale and superseded naming unless explicitly retained as an internal identifier.
> Read next: [[00 - Start Here]]
> Implementation-critical note: Treat this as coding input only after reading the authority order in [[00 - Start Here]].
# Relic UI Implementation Spec v0.2

## August 2026 Loom UI Patch

Use **The Loom** for all visible AI naming. Existing `RelicGuide*` component names and `/guide` may remain internal compatibility identifiers while UI copy and accessible names change. Add reusable `LoomIntentComposer`, `LoomActionCard`, `LoomPlan`, `LoomPlanStep`, `LoomCostDisclosure`, and `LoomAuthorityBadge` primitives. Action cards must expose target/effect, validation or stale-target state, cost, confirmation, execution receipt, retry, and dismissal. Destructive confirmations reuse the owning deterministic product dialog rather than custom model-generated UI.

Packet E7 extends `LoomActionCard` with display-safe `open_record`, `list_records`, `show_source`, `explain_provenance`, and `navigate_surface` result projections. Read cards are keyboard-operable links/disclosures, label themselves `Free · Read only`, cap lists at twenty and graph neighbors at eight, and never expose scores, handlers, RPC names, private GM fields, or source IDs as raw UI copy. One shared route helper maps Library records, Threads, and Sessions to their actual route hierarchy so search, relationship links, and Loom navigation cannot manufacture `/entities/thread/...` or `/entities/session/...` URLs.

Packet E8 adds reusable field-diff, relationship-effect, Thread-state, and objective-effect bodies to `LoomActionCard`. Proposal cards show target/type, changed fields, the ordinary Review destination, and `0 additional credits`; they never present the first confirmation as canon approval. Inline canon cards show both affected records or Thread, current-to-proposed state, explicit confirmation, receipt state, and a record/manual fallback link. The browser continues to submit only action ID, expected intent version, decision, and idempotency key; it never forwards trusted payload, target, scope, RPC, or version fields during confirmation.

Packet E9 adds workflow cards for Session creation, lifecycle-aware Prep/Stage/Review navigation, Prep task handoff, transcription retry, and active Workshop resume. Every separately metered Prep card shows the exact 1/3/10-credit estimate before confirmation and links its accepted request to the full Prep review surface. The card must state that generated output is pending review and that confirmation does not apply it. Processing, quota-blocked, provider-unavailable, stale Session, and retry states preserve the same action/request identity. Stage-live cards expose navigation and manual fallback only; they never offer Prep generation or unsolicited assistance.

Packet E10 adds lifecycle card bodies and the first bounded `LoomPlan` projection. Archive/restore cards show record type/name, current state, reversible effect, and two-stage review/confirm controls. `prepare_hard_delete` can only reveal a link to the archived record with `prepareDelete=1`; `LibraryRecordEditor` may open its existing permanent-delete panel from that server-derived query, but keeps the checkbox, exact-name input, blocker list, and final submit entirely outside The Loom. A plan renders two to five numbered cards with effect, cost, dependency labels, receipt state, and one enabled next-step confirmation. Waiting and stopped steps remain readable, retain their manual fallback, and are not bulk-confirmable. Focus order follows step order and stays stable across refresh and all four target viewports.

*Created: May 18, 2026. Updated: May 18, 2026.*  
*Purpose: give vibe-coding agents a buildable first-pass UI map without requiring them to re-read every product document.*

## 0. Scope

This spec translates the active Relic product, UX, schema, architecture, and design-system documents into a practical UI build plan.

**Build against:**

- `[[11 - Product Basepoint]]`
- `[[12 - MVP PRD]]`
- `[[13 - Design System]]`
- `[[33 - First Run UX Flow]]`
- `[[31 - Session Prep Flow]]`
- `[[32 - Stage UX Flow]]`
- `[[20 - Entity and Canon Schema]]`
- `[[21 - Tech Architecture]]`
- `[[23 - AI Task Registry]]`
- `[[24 - Approval Queue]]`
- `[[25 - Pricing and Rate Limits]]`
- `[[72 - Navigation Design Spec]]`

**Implementation rule:** build the loop first: Create → Organize → Prep → Run → Review → Approve → Continue.

**Hierarchy and Saga lifecycle patch (July 2026).** The desktop context path uses three separate native dropdowns for Workspace, World, and Saga. Each branch exposes only authorized choices and resolves to an exact ID route; World changes select an active Saga in that World, and Workspace changes select an active World/Saga landing target. `+ New saga` carries the selected Workspace/World into the create/reuse flow. All three controls are disabled while the current Session is live or ending. Saga Settings supports scoped rename and exact-name permanent deletion with recoverable server errors.

**Session Review manual-evidence patch (July 2026).** Render separate pasted-notes and GM-summary textareas above transcript editing. Persist unsaved text plus its stable source UUID locally under the authenticated GM and full Session scope, keep it on save/network failure, and clear it only after the scoped source RPC succeeds. Saved evidence renders read-only; Save evidence does not trigger synthesis or canon mutation.

**Import Inbox patch (July 2026).** Add the Saga-scoped `/imports` rail route. Its paste/file composer exposes draft, validating, uploading, failed, rejected, and recovered local states; ready-for-review and archived records render immutable provenance plus keyboard-operable original-content disclosure. Strict UTF-8 `.txt/.md/.markdown` only; clear local state only after a confirmed scoped RPC result. Long filenames/content wrap or scroll without horizontal page overflow. No provider, embedding, proposal, or canon control appears on this page.

**Session Prep parity patch (July 2026).** Render one shared editor on Home and the full Prepare route for planned/ready Sessions. It owns an 800ms/blur optimistic autosave, owner/hierarchy/Session-scoped local recovery, saving/saved/offline/failed/conflict/retry copy, optional scheduled date/time, prior approved-summary fallback, ordered recoverable entity/Thread pins, and only state-valid Reset/Archive/Duplicate actions. Ready must flush the latest local change before navigation; all later lifecycle states render the same packet read-only.

**Approval Queue trust completion patch (July 2026).** Render field-level current/proposed editors, persistent C4 source disclosures, confidence/provenance/target consequences, and filters for status, type, batch, confidence, and conflict. Offer one-by-one, explicit selected, and prominent all-compatible approval; bulk actions state the exact visible count and exclude conflicts, broken sources, dirty edits, merge decisions, and archive confirmations. Preserve edits across failed commit, make archive-versus-delete explicit with Rust confirmation, and rebase stale targets without writing canon.

**MVP surface and build-order rule:** The Sanctum and The Stage are both product surfaces on web and mobile. Sanctum should feel literary, modern, and relaxing. Stage should feel clean and focused. Build the web app first with both surfaces and the full loop, then build the mobile app with platform-appropriate layouts and offline behavior.

---

## Changelog

**Packet E3 conversational Guide patch (July 2026).** The Guide fallback route and sidecar/sheet render one persistent Saga-scoped conversation with typed provenance blocks, paragraph citations, recoverable queued/running/failed turns, and stored reviewed action intents. Conversation survives navigation, refresh, and app restart; it does not follow the GM across Saga scope. Creative proposal blocks are labeled non-canon and never receive fabricated citations.

**v0.2 (May 2026).** Document-control and naming refresh. Updates build-against references to the current versioned files and renames the new-saga continuation route parameter from `:workshopSessionId` to `:creationSessionId` so implementation naming no longer revives retired Saga Creation language. No UI scope expansion.


## 1. Route map

### 1.1 Web routes — Next.js App Router

Use IDs in routes for MVP. Slugs may be added later for readability but must not be required for routing.

| Route | Surface | Purpose | MVP |
|---|---|---|---:|
| `/` | Public | Landing or redirect to app | P0 minimal |
| `/auth/sign-in` | Auth | Email/password sign in | P0 |
| `/auth/sign-up` | Auth | Create GM account | P0 |
| `/app` | Bootstrap | Load GM profile, Workspace, active World/Saga; redirect | P0 |
| `/app/new-saga` | First-run / Create | New saga flow: World choice, GM profile, help level | P0 |
| `/app/new-saga/:creationSessionId` | First-run / Create | Resume Build with AI / Bring your notes / scaffold review | P0 |
| `/app/w/:workspaceId/world/:worldId/saga/:sagaId` | Sanctum | Saga home, current prep card, Threads carry-forward | P0 |
| `/app/w/:workspaceId/world/:worldId/saga/:sagaId/threads` | Sanctum | Thread list + read-only Thread Timeline | P0 |
| `/app/w/:workspaceId/world/:worldId/saga/:sagaId/threads/:threadId` | Sanctum | Thread detail, objectives log, related entities, AI assists | P0 |
| `/app/w/:workspaceId/world/:worldId/saga/:sagaId/entities` | Sanctum | Library records, filters, search | P0 |
| `/app/w/:workspaceId/world/:worldId/saga/:sagaId/entities/new` | Sanctum | Manual entity create / draft from prompt | P0 |
| `/app/w/:workspaceId/world/:worldId/saga/:sagaId/entities/:entityType/:entityId` | Sanctum | Entity detail editor | P0 |
| `/app/w/:workspaceId/world/:worldId/saga/:sagaId/sessions` | Sanctum | Session list and pipeline status | P0 |
| `/app/w/:workspaceId/world/:worldId/saga/:sagaId/sessions/new` | Sanctum | Create session prep workspace | P0 |
| `/app/w/:workspaceId/world/:worldId/saga/:sagaId/sessions/:sessionId/prep` | Sanctum | Session prep workspace | P0 |
| `/app/w/:workspaceId/world/:worldId/saga/:sagaId/sessions/:sessionId/stage` | Stage web | Web Stage surface reached from Prepare/session context | P0 |
| `/app/w/:workspaceId/world/:worldId/saga/:sagaId/sessions/:sessionId/review` | Sanctum | Transcript, summary, proposed updates | P0 |
| `/app/w/:workspaceId/world/:worldId/saga/:sagaId/review` | Sanctum | Approval Queue | P0 |
| `/app/w/:workspaceId/world/:worldId/saga/:sagaId/guide` | Sanctum | The Loom fallback page reached from sidecar/context; route name is compatibility-only | P0 |
| `/app/w/:workspaceId/world/:worldId/saga/:sagaId/search` | Sanctum | Full search page, command-palette fallback | P0 |
| `/app/w/:workspaceId/world/:worldId/saga/:sagaId/imports` | Sanctum | Raw paste/text/Markdown intake and source review | P1 |
| `/app/w/:workspaceId/world/:worldId/saga/:sagaId/settings` | Sanctum | Saga settings: name, system, profile override, retention | P0 |
| `/app/w/:workspaceId/world/:worldId/settings` | Sanctum | Lightweight World settings | P0 minimal |
| `/app/w/:workspaceId/settings` | Sanctum | Workspace settings, usage, future billing placeholder | P0 minimal |
| `/app/w/:workspaceId/world/:worldId/saga/:sagaId/export` | Sanctum | Markdown/JSON export request and downloads | P0 |

**Do not build in MVP:** player wiki routes, public saga pages, per-player permissions, BYOK UI, local model UI, image generation UI, full timeline editor, graph editor, map editor, initiative/encounter tracker.

### 1.2 Mobile routes — Expo Router

Mobile is built after the web app and preserves both Sanctum and Stage. It may open to Stage when a session is live, but it must expose complete mobile-appropriate Sanctum routes as part of the same product model.

| Route | Surface | Purpose | MVP |
|---|---|---|---:|
| `/sign-in` | Auth | Email/password sign in | P0 |
| `/sign-up` | Auth | GM account create | P0 |
| `/bootstrap` | Bootstrap | Resolve Workspace/World/Saga/session state | P0 |
| `/new-saga` | First-run mobile | Functional new saga form; web remains optimized | P0 |
| `/sagas` | Switcher | World/Saga/session switcher | P0 |
| `/stage` | Stage | Current ready/started/in-progress session when live/ready context exists | P0 |
| `/stage/:sessionId` | Stage | Live session screen | P0 |
| `/stage/:sessionId/search` | Stage | Search modal/screen | P0 |
| `/stage/:sessionId/capture` | Stage sheet | Quick capture | P0 |
| `/stage/:sessionId/stub` | Stage sheet | Quick NPC/place/thread stub | P0 |
| `/stage/:sessionId/dice` | Stage sheet | Basic dice utility | P0 |
| `/stage/:sessionId/end` | Stage modal | End Session confirm + undo | P0 |
| `/sanctum` | Sanctum | Saga home summary and next action | P0 |
| `/sanctum/entities` | Sanctum | Library list/search | P0 |
| `/sanctum/entities/:entityType/:entityId` | Sanctum | Read/edit Library detail | P0 |
| `/sanctum/sessions/:sessionId/prep` | Sanctum | Session packet read/edit and Ready for Stage | P0 |
| `/sanctum/review` | Sanctum | Approval Queue review with mobile source sheets | P0 |
| `/settings` | Settings | Retention, usage readout, sign out | P0 minimal |

---

## 2. Layout shells

### 2.1 Sanctum desktop shell

**Use for:** the web implementation of the Sanctum: saga home, Threads, Library, Prepare, Sessions, Review, Export, Settings, Search, and The Loom.

- Parchment background.
- Left navigation rail, 220–260px.
- Top context bar: three separate Workspace / World / Saga dropdowns, Search, The Loom toggle, `+ Create`, current session pill, Review badge, usage chip when near quota, account menu. The dropdowns render as one context path but retain independent labels and controls.
- Main content column, max readable width 960–1120px unless list/detail layout requires more.
- Optional right inspector for source/provenance, relationships, draft warnings, quota warnings.
- Cream cards on Parchment. Literary, modern, relaxing. Amber marks consequential action. Verdigris marks confirmed/ready. Rust marks destructive/blocked.

Default left rail order: **Home · Threads · Library · Prepare · Sessions · Review**. Export and Settings sit low in the rail. Stage is reached from Prepare, session state, Home next-action cards, notifications/deep links, app resume, and `Return to Stage`; it is not a default rail item. The Loom is invoked through the sidecar/sheet, fallback page, or contextual action; it is not a rail item.

### 2.2 Sanctum mobile shell

**Use for:** mobile support after web: Library review, prep read/edit, approval, settings, Search, and The Loom.

- Single column.
- Top context switcher compressed into a sheet.
- App-level bottom nav: Sanctum by default; add Stage only while a session is ready, started, in_progress, or ended_pending_undo.
- Inside Sanctum: compact section navigation for Home, Search, Guide, Threads, Library, Prepare, Sessions, Review.
- No persistent right rail; use bottom sheets for source/provenance and filters.
- Large tap targets, minimum 44px.

### 2.3 Stage mobile shell

**Use for:** the mobile implementation of Stage for live play.

- Ink background.
- Cream text and cards.
- Header: session title, state chip, recording/offline indicator.
- Persistent search bar below header.
- One vertical scroll: agenda → pinned cards → notes.
- Sticky bottom action bar: Record · Mark Moment · Dice.
- Clean and focused. No decorative elements. No marketing copy. No proactive AI prompts.

### 2.4 Stage web shell

**Use for:** web implementation of Stage and tablet/laptop live play before the mobile app ships.

- Same dark Stage visual language.
- Main Stage column remains primary.
- Optional right side panel for selected pinned entity.
- Search can open as command palette on desktop; inline search remains visible.
- Do not turn Stage web into Sanctum. Keep it clean, focused, and glance-ready.

---

## 3. Token mapping

Map `[[13 - Design System]]` tokens into shared Tailwind/CSS variables.

| Design token | CSS variable | Tailwind alias | Use |
|---|---|---|---|
| Ink | `--ink #1A1916` | `relic.ink` | text, dark Stage background |
| Ink faint | `--ink-faint #2C2A25` | `relic.inkFaint` | Stage cards, dark panels |
| Stone 900 | `--stone-900 #38342E` | `relic.stone900` | secondary dark text |
| Stone 700 | `--stone-700 #6A6258` | `relic.stone700` | muted body text |
| Stone 500 | `--stone-500 #9C9389` | `relic.stone500` | metadata, placeholders |
| Stone 300 | `--stone-300 #C6BEB3` | `relic.stone300` | borders, dividers |
| Stone 100 | `--stone-100 #E4DDD4` | `relic.stone100` | subtle surfaces |
| Parchment | `--parchment #EFEBE4` | `relic.parchment` | Sanctum page background |
| Cream | `--cream #F7F4EF` | `relic.cream` | cards, elevated surfaces |
| White | `--white #FDFCFA` | `relic.white` | rare highlights only |
| Amber | `--amber #B8702A` | `relic.amber` | primary action, canon consequence |
| Amber light | `--amber-light #D4904C` | `relic.amberLight` | Stage active states |
| Amber dim | `--amber-dim #EED9BF` | `relic.amberDim` | warning/loose-thread tint |
| Rust | `--rust #8A3828` | `relic.rust` | destructive, recording, blocked |
| Rust dim | `--rust-dim #F0D9D4` | `relic.rustDim` | destructive warning tint |
| Verdigris | `--verdigris #2F6B6E` | `relic.verdigris` | success, approved, ready |
| Verdigris dim | `--verdigris-dim #CCDDDC` | `relic.verdigrisDim` | active-thread tint |

**Fonts:**

- Display: Cormorant Garamond. Use for entity names, saga titles, page heroes, literary excerpts.
- UI: Instrument Sans. Use for all UI text, labels, body, inputs.
- Mono: DM Mono. Use for metadata, timestamps, state chips, quota labels, source labels.

**Radii and shadows:** keep tight. `radius-sm=2px`, `radius-md=4px`, `radius-lg=8px`. Avoid generic SaaS pill excess except for small state chips.

---

## 4. Shared component inventory

### 4.1 Foundations

- `AppShell`
- `SanctumShell`
- `StageShell`
- `ContextSwitcher`
- `SearchInput`
- `RelicGuideToggle`
- `RelicGuideSidecar`
- `ReturnToStageButton`
- `GlobalCreateMenu`
- `CurrentSessionPill`
- `ReviewBadge`
- `CommandPalette`
- `UsageChip`
- `StateChip`
- `SourceBadge`
- `EntityTypeIcon`
- `AutosaveIndicator`
- `EmptyState`
- `ErrorState`
- `LoadingSkeleton`
- `ConfirmDialog`
- `BottomSheet`
- `Toast`
- `UndoBanner`

### 4.2 Form primitives

- `TextField`
- `TextareaField`
- `RichTextEditor`
- `SelectField`
- `RadioCardGroup`
- `SegmentedControl`
- `TagInput`
- `RelationshipPicker`
- `EntityPicker`
- `FileDropzone`
- `CharacterCountMeter`

### 4.3 Canon and draft primitives

- `CanonStateChip`
- `DraftCard`
- `DraftWarningList`
- `ProvenancePanel`
- `SourceExcerpt`
- `CitationDriftIndicator`
- `DiffViewer`
- `ApprovalActionBar`
- `RejectReasonPicker`
- `CommitButton`

### 4.4 Entity components

- `EntityList`
- `EntityListItem`
- `EntityDetailHeader`
- `EntityNarrativeEditor`
- `GMNotesBlock`
- `LoreNotesPanel`
- `RelationshipList`
- `MentionSuggestions`
- `ArchivedBanner`
- `StubBanner`
- `FleshStubCTA`

### 4.5 Thread components

- `ThreadList`
- `ThreadStateChip`
- `ThreadCarryForwardCard`
- `ThreadTimelineReadOnly`
- `ThreadObjectiveLog`
- `ThreadComplicationButton`

### 4.6 Session prep components

- `PrepWorkspace`
- `PrepBriefingCard`
- `AgendaEditor`
- `SceneBeatAssistMenu`
- `ActiveThreadsPanel`
- `PinnedEntityPicker`
- `SessionPacketPreview`
- `ReadyForStageButton`
- `StalePrepWarning`

### 4.7 Stage components

- `StageHeader`
- `StageSearchBar`
- `RelicGuideSidecar`
- `StageAgenda`
- `PinnedList`
- `StageCard`
- `CharacterStageCard`
- `PlaceStageCard`
- `FactionStageCard`
- `ArtifactStageCard`
- `ThreadStageCard`
- `QuickCaptureSheet`
- `QuickStubSheet`
- `RecordingControl`
- `MarkMomentButton`
- `DiceSheet`
- `EndSessionConfirm`
- `SessionEndSummaryCard`
- `OfflineChip`

---

## 5. Page-by-page MVP build list

### 5.1 Auth and bootstrap

| Page | Build |
|---|---|
| Sign up / Sign in | Minimal email/password forms, error state, loading state. |
| Bootstrap | Queries GM profile, Workspace, active World/Saga, active session. Redirects to New saga if none. |

### 5.2 New saga / first-run

| Page | Build |
|---|---|
| New saga form | Saga name, game system, World choice, GM profile card, help-level radio cards. |
| Build with AI | Conversation surface, Draft it CTA, streaming state, retry, save/resume. |
| Bring your notes | Paste field, `.txt/.md/.markdown` upload, 50,000-char cap, Draft from this CTA. |
| Scaffold review | Section rail, draft cards, source rail, edit/regenerate/discard, Commit saga. |
| Start blank | Immediate empty saga create and redirect to Sanctum home. |

### 5.3 Sanctum home

Build as the loop dashboard, not a generic project homepage.

- Current Saga summary.
- Next session / Plan Session 1 card.
- Threads carry-forward card.
- Recent Library records.
- Pending Review card.
- The Loom entry point from the persistent sidecar/handle or contextual card.
- Usage chip only when near quota or in settings.

### 5.4 Threads

- List states: Active, Loose, Dormant, Failed, Resolved.
- Detail page with optimistic title/summary/state/resolution editing, orderable objective lifecycle, D2 related entities, Session pin history, and source references.
- Read-only Thread Timeline derived from objective state plus append-only Thread canon audit, Session-linked sources, Session active/pinned rows, and Sessions. Entries expose trace IDs and tolerate missing/archived related records.
- No writable timeline editor.

### 5.5 Library

- Library with type filters, search, archived toggle.
- Detail editor with autosave, source/provenance, relationships, mentions, notes.
- New entity: manual blank plus `Draft from prompt`.
- Stub flow: `Flesh this stub` invokes `propose_quick_stub_fleshing` and routes accepted changes through draft/update review.

### 5.6 Sessions and prep

- Session list with status chips: planned, ready, started, in_progress, ended_pending_undo, ended.
- Prepare workspace: objective, opening scene, scene notes, active threads, pinned entities, prep briefing, The Loom, Ready for Stage.
- Read-only lock when session is `in_progress` or `ended_pending_undo`.

### 5.7 Stage

- Current session screen.
- Agenda, pinned cards, search, The Loom, quick capture, quick stub, recording consent, chunked recording state, Mark Moment, dice, End Session, undo.
- Offline cache state and pending sync state.

### 5.8 Review and Approval Queue

- Pipeline status page: distinct audio, transcription, transcript-edit, retry/recovery, synthesis, summary, draft-count, and failure states.
- Approval Queue grouped by entity.
- Diff viewer, source panel, approve/edit/reject/merge/archive actions.
- Approve one, Commit selected, and prominent Approve All for the exact visible compatible set.
- Every pending synthesis citation opens with a native keyboard-operable disclosure on both Review surfaces. Transcript context includes timestamp, frozen/current text, exact/edited/deleted state, and an authorized anchor to the cited segment; manual evidence is labeled untimestamped.
- Broken, unavailable, deleted, permission-denied, and unsupported evidence must render safe non-identifying fallback copy. Citation inspection is read-only and must remain usable without horizontal overflow at 1440×900, 1024×768, 768×1024, and 390×844.
- Signed audio context is deferred until a short-lived, retention-aware browser signing boundary exists; never expose private object paths or widen Storage policy for this component.

### 5.9 The Loom

- GM-invoked only.
- Reached from the persistent Loom sidecar/sheet, contextual action, or fallback page; not the primary left rail.
- Shows a bounded persistent thread rather than a search-result wrapper. New thread, clear, archive, retry, and edit/resubmit preserve explicit state without writing canon.
- Renders grounded answer paragraphs, creative/grounded proposal blocks, guidance, action previews, and insufficiency with distinct accessible semantics.
- Grounded paragraphs remain hidden unless all citations validate and resolve to authorized C4 source context. Citation disclosures are keyboard/touch operable and return focus to their marker.
- E3 action cards support open-record and confirmed entity-draft only. They explain consequences, cost/review routing, stale conflicts, and acceptance state; preview/dismissal are zero-write.
- Queued/running updates use polite live announcements. Error, quota, fallback, drift, and insufficiency never rely on colour alone.
- Shows answer state: Canon / Draft / Raw / Transcript sources.
- No answer may be presented as canon unless grounded in canon.
- Can prepare create/edit actions, but canon mutation requires inline GM review or Approval Queue.
- Empty state suggests example prompts and actions, not proactive prompts.

### 5.10 Settings, usage, export

- Saga settings: name, game system, audio/transcript retention, profile override.
- Workspace settings: usage readout, upgrade placeholder, sign out.
- Export: JSON and Markdown request, status, download link, 7-day expiry.

---

## 6. Empty, loading, and error states

### 6.1 Empty states

| Context | Copy direction | Primary action |
|---|---|---|
| No Saga | `Create your first saga.` | New saga |
| Empty Saga | `Start with a character, place, or thread.` | New entity |
| No Threads | `Threads track what is unresolved.` | New thread |
| No Session | `Plan the next session from what matters now.` | New session |
| No Review items | `No proposed changes waiting.` | Back to Sanctum |
| Stage no ready session | `No session is ready for Stage.` | Open Prepare |
| Search no result | `No match. Create a quick stub?` | Quick stub |

### 6.2 Loading states

Use skeletons for lists and cards. Use explicit progress states for model calls, transcription, upload, and export.

Required async labels:

- `Preparing draft...`
- `Processing notes...`
- `Transcribing audio...`
- `Building review items...`
- `Saving...`
- `Saved · just now`
- `Queued for sync`

### 6.3 Error states

Errors must tell the GM what happened and what is safe.

| Error | Required action |
|---|---|
| AI call failed | Retry, edit prompt/input, continue manually. |
| Quota reached | Explain human unit, show next reset or upgrade placeholder. |
| Transcription failed | State that preserved audio is safe, retry transcription without re-upload, and offer pasted-notes/manual-summary recovery when those inputs are available. |
| Commit conflict | Show live version vs draft version, allow refresh or manual merge. |
| Offline | Keep reading/capturing if cached; queue writes. |
| RLS denial | Generic safe copy to user, full event to Sentry/PostHog. |

---

## 7. Form and autosave behavior

- Default to autosave for entity, note, thread, and prep fields.
- Debounce text autosave at 800ms after idle.
- Save on blur immediately.
- Show visible state: `Saving`, `Saved · just now`, `Saved · 2m ago`, `Offline · queued`.
- Do not autosave destructive actions, commit actions, approve/reject actions, End Session, Start Session, or retention deletes.
- Rich text editor saves structured content and plain-text search body.
- Mention detection runs after save, not per keystroke.
- Embeddings regenerate after substantive save, debounced server-side.

The D2 Library implementation applies this behavior to Character, Place, Faction, Artifact, Thread, and Note: text saves after 800ms idle and immediately on blur, keeps unsaved input visible after failures, and stops blind retries after a version conflict. Ordinary edits have no Save button. Archive and restore remain explicit actions; permanent deletion is disclosed separately and requires both an irreversible-action checkbox and exact-name entry, and is unavailable until the archived record has no blocking references.

---

## 8. Approval diff components

### 8.1 Required components

- `ApprovalQueueShell`
- `ApprovalGroupList`
- `ApprovalItemCard`
- `DiffViewer`
- `InlineDraftEditor`
- `SourceDock`
- `TranscriptSourceExcerpt`
- `CitationDriftIndicator`
- `RejectReasonPicker`
- `MergeTargetPicker`
- `CommitSelectedBar`

### 8.2 Diff rules

- Create draft: show proposed card preview.
- Update draft: show field-level before/after.
- Archive request: show serious Rust state and confirmation.
- Merge: identity decision first; resulting update returns as a separate review item.
- Source dock remains visible on desktop. On mobile, source dock opens as a bottom sheet.

---

## 9. Session prep components

Session prep is visually inside Sanctum, not a third top-level mode.

**Accent density:** use Amber left rules and Verdigris thread chips to make prep feel active without changing the base surface.

Required components:

- `PrepBriefingCard`
- `AgendaEditor`
- `ObjectiveField`
- `OpeningSceneField`
- `SceneNotesField`
- `ActiveThreadsPanel`
- `PinnedEntityPicker`
- `SceneBeatAssistMenu`
- `NpcForSceneAssist`
- `SessionPacketPreview`
- `ReadyForStageButton`
- `PrepLockedBanner`
- `StalePrepWarning`

---

## 10. Stage card components

### 10.1 Shared Stage card anatomy

- Type label in DM Mono.
- Name in Cormorant.
- Summary in short Instrument Sans prose.
- State chip: active, pinned, stub, archived reference, hidden if irrelevant.
- Expanded body sections: What the GM needs now, relationships, last seen, notes.
- Never display long editor chrome in Stage.

### 10.2 Type-specific cards

| Type | Required Stage content |
|---|---|
| Character | Name, summary, voice/wants if parsed, faction/location links, last session mention. |
| Place | Name, summary, current scene notes, related characters/factions. |
| Faction | Name, motive summary, allies/opponents, active threads. |
| Artifact | Name, known properties, owner/location, GM notes if pinned. |
| Thread | State, current objective, loose question, next pressure. |

---

## 11. Visualization boundaries

| Visualization | MVP status | Build instruction |
|---|---|---|
| Thread Timeline | MVP, read-only | Build simple derived view from thread objectives/session/canon activity. No editing. |
| Graph / Constellation | V1 | Do not build. Reserve data consistency through relationships/mentions only. |
| Entity Neighborhood | V1 | Do not build. Entity detail may show a simple related list only. |
| Thread Map | V1 | Do not build. Thread list and timeline cover MVP. |
| Session Web | V1 | Do not build. Session detail may list related entities/drafts only. |
| World History / Era Timeline | V1 | Do not build. MVP may create hidden/default Era and show no Era editor. |
| Writable timeline editor | V1 | Explicitly excluded from MVP. |
| Relationship graph editor | Excluded from MVP | Do not build. |

---

## 12. Coding order for vibe-coding agents

1. **Design tokens and shells** — Tailwind/theme variables, typography, `SanctumShell`, `StageShell`.
2. **Auth and bootstrap** — sign up, sign in, default Workspace, route guard.
3. **New saga flow** — form, profile, World choice, help level, blank create.
4. **Scaffold review** — Build with AI / Bring notes mocked or disabled until AI implementation-plan review, then wire to `scaffold_saga`.
5. **Sanctum home** — Plan Session 1, Threads carry-forward, recent Library records, pending Review, live Return to Stage state.
6. **Library/detail** — CRUD, autosave, state chips, source/provenance placeholders.
7. **Threads** — list, detail, read-only timeline.
8. **Prepare** — objective/opening/notes, pinned entities, The Loom, Ready for Stage.
9. **Web Stage surface** — ready/in-progress packet, pinned cards, search, The Loom, capture, dice, and End Session in web.
10. **Mobile app** — after web loop stability, adapt Sanctum and Stage with cached packet, sheets, search/capture, dice, and approval flows.
11. **Recording** — consent, local chunks, upload state, Mark Moment.
12. **Post-session pipeline UI** — transcript/review status and failure states.
13. **Approval Queue** — grouped review, diff, source dock, commit.
14. **Usage and quota readouts** — chips, settings panel, quota errors.
15. **Export** — JSON/Markdown request and download lifecycle.
16. **Polish pass** — accessibility, responsive shells, empty/error/loading states, performance checks.

---

## 13. Acceptance criteria

- A coding agent can identify every MVP route, shell, and major component without opening product strategy docs.
- The first UI pass preserves Sanctum/Stage separation.
- The design system tokens are mapped before custom styling begins.
- First-run, prep, Stage, Review, and Approval can be built in sequence without inventing new UX concepts.
- All AI surfaces are GM-invoked and visibly draft/proposal-oriented.
- All MVP/V1 visualization boundaries are explicit.
- Quota surfaces are present but do not require full Stripe billing.

---

*End of UI Implementation Spec v0.2.*



