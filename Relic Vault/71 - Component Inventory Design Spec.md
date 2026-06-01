---
status: active
authority: secondary
scope: mvp-design
read_after:
  - "[[60 - Design Spec Overview]]"
depends_on:
  - "[[13 - Design System]]"
  - "[[34 - UI Implementation Spec]]"
  - "[[30 - Sanctum UX Flow]]"
  - "[[32 - Stage UX Flow]]"
  - "[[24 - Approval Queue]]"
  - "[[72 - Navigation Design Spec]]"
supersedes: []
last_audited: 2026-06-01
source_file: "Relic Vault/71 - Component Inventory Design Spec.md"
---

> [!info] How to use this spec
> Use this as the reusable component checklist for the design specs in [[60 - Design Spec Overview]]. Read with [[72 - Navigation Design Spec]] for shell, rail, Search, Relic Guide, and global create behavior. It references Material 3 and Checklist Design only for coverage completeness; Relic's design system in [[13 - Design System]] remains visually authoritative.

# Component Inventory Design Spec

## Purpose

This inventory names the reusable Relic components that should appear across the design-spec layer. It is a design checklist, not a code API contract. Implementation can rename components if needed, but the behavior and state coverage should remain recognizable.

All components should preserve Relic's surface model:

- The Sanctum: Parchment base, Cream cards, literary/modern/relaxing tone, Amber for consequential action, Sage for ready/confirmed/thread-active state, Rust for destructive/blocked/recording.
- The Stage: Ink base, Cream foreground, clean/focused tone, high contrast, minimal decoration, large tap targets, offline resilience where the platform supports it.

Material 3 and Checklist Design can be used to check component coverage: nav, inputs, dialogs, sheets, feedback, loading, empty, offline, error, and destructive confirmation. Do not copy their visual styling.

## Navigation

`SanctumShell` wraps authenticated Sanctum routes on web and mobile. On web it includes top context bar, left rail, main content slot, and collapsible Relic Guide sidecar on wide screens. The left rail destinations are Home, Threads, Library, Prepare, Sessions, Review, Export, and Settings.

`StageShell` wraps Stage routes on web and mobile. It includes Stage header, search, primary scroll area, sticky action bar, and optional wide-screen side panel.

`MobileSanctumShell` is the phone-friendly Sanctum shell with context sheet, contextual Stage bottom navigation, and single-column content. Inside Sanctum, use compact section navigation for Home, Search, Guide, Threads, Library, Prepare, Sessions, and Review.

`ContextSwitcher` shows active Workspace, World, and Saga. It supports switching, resumable new-Saga drafts, `+ New saga`, and blocked switching during live sessions.

`SearchInput` is the persistent top-context search entry. It opens Find results, command palette/full search, and keeps scope clear.

`RelicGuideToggle` opens, focuses, minimizes, or restores Relic Guide without changing page context.

`GlobalCreateMenu` is the top-bar `+ Create` menu. It uses type-specific labels such as New Thread, New Character, New Place, New Faction, New Artifact, New Lore Note, New Session, Import notes, New Saga, and New World / Saga.

`CommandPalette` handles keyboard and modal search on desktop.

`SanctumNav` displays Home, Threads, Library, Prepare, Sessions, Review, Export, and Settings. Review supports pending count. Stage and Relic Guide are not displayed as primary rail items by default.

`MobileSurfaceTabBar` on mobile keeps Sanctum accessible by default and shows Stage only while a session is ready, started, in_progress, or ended_pending_undo. Inside Sanctum, use a top tab strip, section links, or command/search entry for Home, Search, Guide, Threads, Library, Prepare, Sessions, and Review.

`BreadcrumbBack` is used in detail and focused creation flows where shell nav alone is insufficient.

`RightUtilitySidecar` is the optional desktop dock for source/provenance, relationship context, draft warnings, or active inspector content. It should close without changing page context.

`RelicGuideSidecar` is the always-available collapsible AI sidecar for cited answers and GM-reviewed actions. It should feel like a sourced project assistant, not a general-purpose chatbot rail, and it should minimize without losing prompt/action state.

`ReturnToStageButton` is a high-visibility Amber/Amber-light affordance near top-right shell controls while a session is started, in progress, or ended pending undo and the GM is outside Stage.

`SettingsSubnav` groups Saga, World, Workspace usage, Retention, Notifications, Export, Account.

Navigation components must always communicate scope. The active Workspace/World/Saga is not decorative metadata; it is the boundary for search, AI retrieval, Stage packet loading, Approval Queue queries, usage events, and exports. If a narrow layout hides scope details behind a sheet, the collapsed trigger still needs enough text to prevent accidental cross-Saga work.

## Actions

`PrimaryLoopCTA` is the dashboard's state-aware action: Plan Session 1, Continue prep, Ready/Open Stage, Return to Stage, Open Review, or Plan next session.

`QuickCreateMenu` offers type-specific creation: Character, Place, Faction, Artifact, Thread, Session, note. It should not be a vague plus menu without labels.

`GlobalCreateAction` is the top-bar create trigger. It opens `GlobalCreateMenu` from any primary work surface and defaults creation scope to the active Saga unless the GM explicitly chooses a World/Saga action.

`ReadyForStageButton` marks a session ready. It validates packet completeness and never starts recording.

`OpenStageButton` opens a ready/started/in-progress session in Stage from Prepare, Home, current session pill, notification/deep link, or app resume.

`RelicGuideAction`, `DraftThisSessionButton`, `BrainstormBeatsButton`, `DraftNpcButton`, `ThreadComplicationButton`, and `FleshStubCTA` are GM-invoked AI actions. They must show quota/loading/failure states and never imply autonomous canon writes.

`ApproveButton`, `EditApproveButton`, `RejectButton`, `MergeButton`, `ArchiveConfirmButton`, and `CommitSelectedBar` belong to review flows. Bulk approval should not be visually prominent.

`CommitSagaButton` commits selected scaffold material after review.

`ExportRequestButton` and `DownloadExportButton` handle export lifecycle.

`DeleteConfirmDialog` covers destructive actions such as transcript delete, Saga delete, and hard-delete of already archived records.

`RecordingControl`, `MarkMomentButton`, and `DiceButton` are Stage sticky actions. They require large tap targets and clear active/disabled states.

Action hierarchy should be strict. A screen may have many available actions, but only one primary loop action should receive strongest treatment. AI actions should look available and useful, not inevitable. Destructive actions should never share a row with the primary loop CTA unless protected by a confirmation menu.

## Containment

`SagaStatusPanel` shows current Saga loop state without becoming a Workspace analytics card.

`NextActionCard` is the dashboard hero pattern. It changes by loop state: Plan Session 1, Continue prep, Open Stage, Return to Stage, Open Review, or Plan next session.

`CurrentSessionPill` is a top-bar route into Prepare, Stage, or Review depending on session status.

`PrepWorkspace` contains the prep editor or inline prep summary.

`PrepBriefingCard` is the visible canon-only reading aid with composed time and source count.

`ThreadCarryForwardCard` lists active and loose Threads. It is database-driven, not AI-driven.

`RecentCanonList` shows recently edited canon and links to detail pages.

`PendingReviewCard` summarizes Approval Queue work and links to Review.

`EntityList`, `EntityListItem`, and `EntityDetailHeader` support library/detail patterns.

`ScaffoldDraftCard` represents reviewable creation-time AI output. It uses Draft chips and source badges.

`FirstSessionPacketPreview` shows the packet seed that becomes Session 1.

`ApprovalItemCard` shows a draft proposal in the queue.

`DiffViewer` renders before/after field changes, create previews, archive requests, and merge results.

`SourceDock` and `ProvenancePanel` hold source details on desktop.

`StageAgenda`, `PinnedList`, and `StageCard` form the live play reading surface.

`BottomSheet` is the standard mobile container for filters, source/provenance, context switcher, AI results, and action confirmation.

Containment should avoid nested cards. Use section headings, dividers, and subtle borders before adding another framed panel. Repeated records, review items, modals, and focused tools can use cards. Whole screens should not look like stacks of unrelated widgets.

## Feedback

`AutosaveIndicator` shows Saving, Saved just now, Saved time ago, Offline queued, or Save failed. It is mandatory on editable Sanctum records and prep fields.

`LoadingSkeleton` is used for lists, cards, details, and packet hydration. Avoid spinner-only pages for primary content.

`Toast` is for low-stakes confirmation. Do not use toast for source warnings, conflicts, destructive consequences, or quota hard stops.

`UndoBanner` is used for End Session's 60-second undo and can be reused for reversible actions.

`PipelineStatusBanner` communicates transcription/synthesis/review states.

`QuotaWarningCard` and `UsageChip` communicate usage pressure. They must preserve manual fallbacks.

`OfflineChip`, `OfflineQueuedBanner`, and `QueuedSyncPanel` show offline status and queued work.

`ConflictPanel` shows live version vs proposed/local version and disables blind commit.

`ValidationWarning` blocks unsafe commit but should explain the concrete missing field or failed rule.

`PermissionErrorState` uses generic safe copy for the GM and leaves details to logs.

Feedback components should separate status from instruction. A chip can say `Offline · queued`; the expanded panel can explain what is queued and what will sync. A quota card can state the blocked task, reset timing, and manual fallback. A validation message should identify the field or rule that blocks the action.

## Inputs

`TextField`, `TextareaField`, and `RichTextEditor` use Instrument Sans, Cream surfaces, Stone borders, Amber focus state, and visible autosave when bound to persistent records.

`InlineTitleField` supports entity, Thread, Session, and Saga title edits.

`RadioCardGroup` is used for New saga help level and GM profile choices. Cards should be readable and selectable with keyboard/touch.

`SegmentedControl` handles local mode switches, such as list/timeline or literal/hybrid search, where the number of options is small.

`SelectField` handles enums such as Thread state, retention setting, or profile overrides.

`TagInput`, `RelationshipPicker`, `EntityPicker`, `ThreadPicker`, and `PinnedEntityPicker` support structured linking without visual graphs.

`SearchInput` appears in command palette, Library filters, and Stage. Search state must show scope.

`GuidePromptInput` appears in Relic Guide. It preserves the user's prompt on failure and supports answer, draft, create, and edit intents.

`QuestionInput` is retained as an internal primitive for Guide Q&A and must preserve the question on failure.

`ChecklistEditor` supports prep checklist and Thread objectives where applicable.

`FileDropzone` is allowed only for MVP-supported files in the owning flow. Disabled unsupported types need clear copy.

`CharacterCountMeter` handles notes limits and long input warnings.

Input components should preserve GM authorship. AI insertions should enter editable fields as suggestions or accepted working state, never as hidden mutations. Autosave must not make destructive or approval decisions. Rich text should remain practical: readable prose, bullets, source links, and structured data where specified by owning docs.

## Data and status

`CanonStateChip` distinguishes Raw Input, AI Draft, Canon, and Archived where applicable.

`ScopeChip` distinguishes World vs Saga scope.

`ThreadStateChip` supports Active, Loose, Dormant, Resolved, Failed using Sage/Amber/Stone language.

`SessionStatusChip` supports planned, ready, started, in_progress, ended_pending_undo, ended.

`StateChip` is the generic compact status primitive for loading, queued, blocked, stale, ready, and active.

`ConfidenceBandChip` communicates source-quality proxy bands in Review. It should not imply model certainty.

`SourceBadge` is the compact citation/provenance entry on draft cards, Relic Guide answers, queue items, and prep suggestions.

`CitationBadge` indexes Relic Guide citations and opens source preview.

`CitationDriftIndicator` appears when a transcript source's current segment differs from the frozen excerpt used by a draft.

`UsageSummaryCard`, `QuotaMeter`, and `ResetDateLabel` show metered Workspace usage.

`ExportStatusCard` shows requested, processing, ready, expired, and failed export states.

Status chips must be visually small but semantically precise. Draft, Canon, Archived, Stub, Ready, In progress, Offline, Queued, Low confidence, Broken source, and Conflict are not interchangeable. Avoid color-only distinction; pair color with text and, where useful, icon or shape.

## AI and trust

`GuideAnswerCard` renders the answer, citations, and no-answer state. It must not present uncited factual claims.

`GuideActionCard` renders proposed creates/edits with target, source/provenance, risk, and the next safe action: apply to working state, review inline, or send to Approval Queue.

`PrepSuggestionCards`, `SceneBeatCards`, `NpcCandidateCards`, and `ThreadComplicationCards` are ephemeral suggestion containers. They offer Insert/Copy/Use/Discard as appropriate, not direct canon commit.

`InlineReviewCard` is used when an AI candidate can become canon through a documented inline review path, such as prep AI Quick Stub.

`DraftWarningList` collects duplicate warnings, missing sources, low confidence, validation issues, and scope warnings.

`NoCanonUntilCommitNotice` appears in creation-time review.

`NoAnswerState` appears when Relic Guide lacks sufficient canon grounding.

`BrokenSourceWarning` disables unsafe approval paths and explains alternatives.

`CommitReadinessPanel` summarizes what is required before Commit saga or Ready for Stage.

`ProvenancePanel`, `SourceDock`, and `SourceBottomSheet` are required in any flow where trust depends on evidence.

AI components should always answer three questions: who invoked this, what state is the output in, and what happens if the GM accepts it? Ephemeral suggestions can be discarded without audit. Draft-backed changes require review. GM-direct synthetic approval paths need visible inline review. Canon-only answers and briefings need citations or source stamps. Relic Guide may prepare real changes, but canon mutation requires inline GM review or Approval Queue.

## Mobile sheets and modals

`MobileContextSwitcherSheet` shows Workspace/World/Saga switching and live-session blocks.

`SourceBottomSheet` shows source labels, excerpts, transcript timestamps, and citation drift on mobile.

`FilterBottomSheet` handles type/scope/state filtering.

`ApprovalActionSheet` collects approve/reject/edit/merge/archive actions for a selected mobile draft.

`QuickCaptureSheet`, `QuickStubSheet`, and `DiceSheet` are Stage-specific sheets. They must be fast, offline-safe, and dismissible.

`EndSessionConfirm` is a two-step confirmation modal followed by `UndoBanner`.

`StartSessionConfirm` handles ready/started transition and consent warning context.

`ConsentGate` appears before recording begins.

`DestructiveConfirmDialog` requires explicit confirmation copy for irreversible deletes or archive requests.

Sheets should be task-specific and easy to dismiss. A source sheet should not also contain filters; an approval action sheet should not hide source evidence; a quick capture sheet should open fast and work offline. Modals are reserved for blocking decisions, destructive actions, consent, and lifecycle transitions.

## Empty states

Empty states should be concrete and action-oriented:

- No Saga: create first Saga.
- Empty Saga: create Character, Place, Thread, or Plan Session 1.
- No Threads: explain Threads as unresolved continuity and offer New thread.
- No Session: plan the next session.
- No Review items: no proposed changes waiting.
- Stage no ready session: open Prepare or plan a session.
- Search no results: adjust search or create quick stub where appropriate.
- Relic Guide no answer: not enough current canon, try search or browse Library.

Do not use empty states to promote MVP-excluded features.

Empty-state copy should be short and concrete. It should name the thing missing, explain why it matters in the GM loop, and offer one or two allowed next actions. Avoid inspirational filler or feature teasers.

## Loading states

Use skeletons for card/list/detail surfaces. Use progress labels for AI, transcription, upload, pipeline, export, and commit:

- Preparing draft
- Processing notes
- Composing briefing
- Drafting session prep
- Transcribing audio
- Building review items
- Saving
- Saved
- Queued for sync

AI loading states should preserve user input and support cancel/leave where upstream allows.

Loading components should not cause layout jumps. Lists keep skeleton rows in the expected density. Detail pages show header skeleton before body skeleton. Stage packet loading should render the shell first, then hydrate packet sections from local cache.

## Error states

`AIErrorState` offers retry, edit input, or continue manually.

`QuotaBlockedState` explains what is blocked and what still works. Manual edit, search, approval/rejection, and Start blank should remain available where applicable.

`NetworkErrorState` preserves local input and offers retry.

`ValidationErrorState` gives field-level and commit-level explanations.

`ConflictState` shows proposed/local vs live target and disables blind commit.

`BrokenSourceState` explains missing evidence and allows reject/merge/manual path.

`PermissionDeniedState` uses safe user copy.

`RecordingFailureState` on Stage stops safely, preserves completed chunks, and offers retry.

`ExportFailedState` offers retry and explains expiry/failure without implying data loss.

Errors should never punish manual workflows. If AI fails, the GM can keep writing. If transcription fails, manual summary remains available. If quota blocks generation, approval and editing remain available. If network fails, local state is preserved where the platform supports it.

## Offline states

Offline behavior is especially important on Stage. Components must distinguish:

- cached and readable
- local edit queued
- capture queued
- recording chunk queued
- reconnecting
- sync failed
- conflict deferred to Sanctum

The Stage should not force conflict resolution mid-session. Sanctum can surface conflicts after play.

## Quota states

Quota surfaces should use human units: credits, transcription minutes, storage, import/export size, entity/Saga caps where relevant. They should state reset timing and available manual fallback.

Do not make quota UI feel like billing-first product design. It is a trust and cost-control surface in MVP.

## Conflict states

Conflicts appear where approval, autosave, offline sync, or draft expected versions diverge from live canon. A conflict component must include:

- what changed
- current live value
- proposed/local value
- safe actions: refresh, edit manually, keep local where allowed, reject draft
- disabled unsafe action

Never silently overwrite canon from an AI draft.

## Components to use sparingly or avoid

`Carousel` should not carry core canon, Threads, Review, Session Prep, or navigation. It may be used only for low-risk inspiration, examples, or compact recent-work browsing where all items remain accessible elsewhere.

`PermanentAIChatColumn` is not a Relic component. Relic Guide is an always-available collapsible sidecar/sheet, but the dashboard and detail pages should not become chatbot-first interfaces and Guide must not act autonomously.

`HeavyDataTable` should be limited to usage/export/admin-like settings or developer-facing diagnostics. Entity, Thread, prep, and review work should use lists, cards, detail panels, and diffs.

`FABMenu` should be mobile-only and reserved for a small set of closely related creation actions. Desktop Sanctum should prefer explicit buttons, quick-create cards, and command/search.

`GenericMaterialStyling` should never override Relic's visual system. Material 3 is a coverage reference for behavior, accessibility, and interaction states, not the visual source of truth.

## Components explicitly excluded from MVP

Do not design or promote reusable components for initiative tracking, encounter tracking, VTT integration, relationship graph, writable timeline editor, full map editor, player wiki, per-player permissions, real-time transcription, BYOK UI, local model settings, image generation, collaborative co-GM editing, or custom calendars.
