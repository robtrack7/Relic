---
status: active
authority: secondary
scope: mvp-design
read_after:
  - "[[60 - Design Spec Overview]]"
depends_on:
  - "[[33 - First Run UX Flow]]"
  - "[[23 - AI Task Registry]]"
  - "[[20 - Entity and Canon Schema]]"
  - "[[13 - Design System]]"
supersedes: []
last_audited: 2026-05-30
source_file: "Relic Vault/63 - Saga Scaffold Review Design Spec.md"
---

> [!info] How to use this spec
> Use this for the shared review screen after Build with AI or Bring your notes. Read with [[60 - Design Spec Overview]] and [[71 - Component Inventory Design Spec]]. Upstream behavior lives in [[33 - First Run UX Flow]], [[23 - AI Task Registry]], and [[20 - Entity and Canon Schema]].

# Saga Scaffold Review Design Spec

## 1. Purpose

The Saga scaffold review screen is the approval moment for AI-assisted Saga creation. It lets the GM inspect, edit, regenerate, discard, and commit the drafted premise, entities, Threads, secrets, and first-session packet.

This screen turns AI Draft material into canon only after the GM chooses `Commit saga`.

## 2. Page synthesis

The page combines [[33 - First Run UX Flow]] scaffold-review rules, [[23 - AI Task Registry]] `scaffold_saga` behavior, and [[20 - Entity and Canon Schema]] synthetic approved draft/audit behavior. It should make the draft/canon boundary unmistakable.

The screen is not the general Approval Queue. It is a creation-time review surface. Committed scaffold material does not go to the queue again because this screen is already the GM approval event.

## 3. User mental model

The GM thinks: "Relic made a starting kit. I am deciding what belongs in my Saga before it becomes true."

They expect fast review, not line-by-line legal approval. They want to fix names, drop weak ideas, regenerate one item, and confirm a first-session seed.

## 4. Primary user jobs

- Review the drafted Saga premise and central conflict.
- Inspect draft Characters, Places, Factions, Artifacts, and Threads.
- Edit generated material inline before commit.
- Discard or regenerate weak items without rewriting the whole scaffold.
- Check first-session packet readiness.
- Commit selected material into canon.

## 5. Primary action

`Commit saga` is the primary action. It should stay disabled until minimum viable scaffold criteria are met: Saga/World data exists, required draft data is valid, and AI-assisted paths have a first-session packet.

The button copy must imply GM action: `Commit saga`, not `Generate saga` or `Publish`.

## 6. Secondary actions

Secondary actions: edit item, regenerate item or section, discard item, restore discarded item, view source, resolve duplicate warning, create blank Saga with this name, save and leave, and return to previous step.

Regenerate should be local to one item or section. Avoid a destructive "redo everything" primary affordance.

## 7. Layout structure

Desktop uses a three-zone review layout:

- Left rail: section list with counts and warning badges.
- Main pane: selected draft card, editable fields, first-session packet preview.
- Right rail: source/provenance, duplicate warnings, unresolved issues, commit readiness.

Mobile uses stacked section tabs, draft cards, and provenance in a bottom sheet. The primary commit bar should be sticky at the bottom after the GM has scrolled enough to review content.

Keep draft cards visually distinct from canon cards. Use Draft chips, source badges, editable text fields, and warning strips.

## 8. Key components

- Navigation: `FocusedCreationShell`, `ReviewSectionRail`, `MobileSectionTabs`.
- Containment: `ScaffoldDraftCard`, `FirstSessionPacketPreview`, `CommitReadinessPanel`, `DuplicateWarningPanel`.
- Inputs: `InlineDraftEditor`, `NameField`, `NarrativeTextarea`, `DiscardToggle`.
- Actions: `RegenerateItemButton`, `RestoreDiscardedButton`, `CommitSagaButton`, `SaveAndLeaveButton`.
- Trust: `DraftStateChip`, `SourceBadge`, `ProvenancePanel`, `NoCanonUntilCommitNotice`.
- Feedback: `ValidationWarning`, `RegenerationLoadingState`, `CommitFailureBanner`.

See [[71 - Component Inventory Design Spec]].

## 9. Required states

Required states include loading draft, streaming/processing complete, draft validation warnings, empty scaffold, low-quality scaffold, duplicate entity warning, item discarded, item regenerated, source panel open, commit in progress, commit failed but no canon written, commit succeeded redirecting, browser close/resume, mobile source sheet, and quota blocked for regeneration.

Empty scaffold blocks commit and preserves input. Low-quality scaffold may allow commit with visible warnings.

## 10. AI behavior

AI has already drafted the scaffold. On this screen, AI can be invoked only for targeted regeneration. Regeneration must preserve unrelated edited cards and show which section is being changed.

AI output remains draft until commit. The screen must never imply that AI has already written canon. If quota is blocked, manual editing and commit of existing valid draft material remain available.

## 11. Source/provenance behavior

Every generated item should expose source context from conversation or notes. Use compact source badges on cards and a right rail or bottom sheet for detail.

Duplicate warnings should explain whether the conflict is in the selected World/Saga. Source labels should use user-understandable names such as `Conversation`, `Pasted notes`, or uploaded filename. Avoid exposing internal task names in the main UI.

## 12. Navigation in

Users arrive from Build with AI conversation, Bring your notes processing, or resuming a saved creation draft at review step.

## 13. Navigation out

Commit routes to [[61 - Sanctum Dashboard Design Spec]] with Plan Session 1 card or inline prep if Session 1 is created. Save and leave returns to the previous Sanctum context or first-run holding state. Back routes to conversation or notes input with draft preserved.

## 14. Components to avoid

Avoid general Approval Queue layouts with unrelated post-session drafts, prominent Approve All, player-facing publish controls, World-canon promotion controls, relationship graph previews, full timeline editors, image generation, and model-selection controls.

## 15. Visual tone

Literary, modern, relaxing editorial review table inside the Sanctum creation flow. The page should feel careful but not bureaucratic: draft cards on Cream, Amber for commit/readiness, Rust for blocking validation, Sage for resolved readiness. Cormorant carries names; DM Mono carries `DRAFT`, source, and warning labels.

## 16. Claude Design prompt

```text
Create Relic's Saga scaffold review screen after AI-assisted New saga. It is the GM approval moment before canon write inside the literary, modern, relaxing Sanctum creation flow. Use a desktop layout with section rail, editable draft-card main pane, and source/warnings rail; include a mobile stacked variant with source bottom sheet and equivalent commit/edit/regenerate capability. Show draft chips, source badges, duplicate warnings, edit/regenerate/discard actions, first-session packet preview, and a disabled/enabled Commit saga bar. AI can only regenerate targeted items. Nothing is canon until the GM commits. Exclude general queue bulk approval, player publishing, graph/timeline editors, image generation, and model settings.
```
