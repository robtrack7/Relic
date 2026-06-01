---
status: active
authority: secondary
scope: mvp-design
read_after:
  - "[[60 - Design Spec Overview]]"
depends_on:
  - "[[24 - Approval Queue]]"
  - "[[20 - Entity and Canon Schema]]"
  - "[[23 - AI Task Registry]]"
  - "[[34 - UI Implementation Spec]]"
  - "[[13 - Design System]]"
  - "[[72 - Navigation Design Spec]]"
supersedes: []
last_audited: 2026-05-31
source_file: "Relic Vault/67 - Approval Queue Design Spec.md"
---

> [!info] How to use this spec
> Use this for Review and Approval Queue screens where drafts become canon. Read with [[60 - Design Spec Overview]], [[72 - Navigation Design Spec]], and [[71 - Component Inventory Design Spec]]. Upstream behavior lives in [[24 - Approval Queue]], [[20 - Entity and Canon Schema]], and [[23 - AI Task Registry]].

# Approval Queue Design Spec

## 1. Purpose

The Approval Queue is Relic's MVP trust surface. It lets the GM review AI/import/pipeline proposals, inspect sources, compare diffs, edit, approve, reject, merge, archive, or leave items pending.

Nothing here becomes canon without explicit GM action.

## 2. Page synthesis

The screen translates [[24 - Approval Queue]] into a focused editorial review interface. It depends on [[20 - Entity and Canon Schema]] for canon state transitions and [[23 - AI Task Registry]] for draft behavior.

The page should be optimized for careful action, not speed-run acceptance. Avoid prominent Approve All.

## 3. User mental model

The GM thinks: "Relic found possible changes. I decide which are true."

They need confidence, source context, and the ability to correct drafts without losing the original evidence.

## 4. Primary user jobs

- Review pending drafts grouped by session/entity/change kind.
- Compare proposed changes against current canon.
- Inspect source/provenance before approving.
- Edit and approve when AI got the idea right but wording wrong.
- Reject, merge, archive, or bulk archive stale proposals.
- Resolve conflicts and broken sources safely.

## 5. Primary action

Primary action is `Approve` or `Edit & Approve` for the selected draft after inspection. `Commit selected` may exist only with explicit selection and visible review context.

Do not make bulk approval visually dominant. Stale bulk archive is a cleanup action, not a canon-approval shortcut.

## 6. Secondary actions

Secondary actions include Reject, Merge, Archive request confirmation, View source, Open target Library record, Filter, Search draft text/source, Refresh conflict, Copy into manual edit, Retry pipeline artifact if allowed, and Open session review.

## 7. Layout structure

Desktop uses a two- or three-pane layout:

- Left: grouped queue list with counts, confidence/source warning chips, filters.
- Main: selected draft diff/editor and action bar.
- Right dock: source/provenance, transcript excerpt, citation drift, sibling drafts, conflict detail.

Mobile uses one draft at a time. Queue list, diff, and source bottom sheet should be reachable but not cramped. The mobile layout must remain functionally equivalent: approve, edit-and-approve, reject, merge, archive, and source review are all available.

The selected draft should always have a clear review frame: target Library record, change kind, current state, proposed state, confidence/source quality, and the action consequence. The GM should never need to infer whether an action commits immediately, creates a follow-up draft, or only marks a proposal rejected. Keep action buttons close to the diff, while filters and queue navigation stay visually separate.

## 8. Key components

- Navigation: `ApprovalQueueShell`, `ApprovalGroupList`, `DraftFilterBar`, `ReviewEntryTabs`.
- Containment: `ApprovalItemCard`, `DiffViewer`, `InlineDraftEditor`, `SourceDock`, `ConflictPanel`, `StaleQueueBanner`.
- Actions: `ApproveButton`, `EditApproveButton`, `RejectButton`, `MergeButton`, `ArchiveConfirmButton`, `CommitSelectedBar`.
- Trust/status: `ConfidenceBandChip`, `SourceBadge`, `CitationDriftIndicator`, `BrokenSourceWarning`, `ExpectedVersionWarning`.
- Feedback: `CommitLoadingState`, `ValidationErrorState`, `NetworkRetryBanner`.

See [[71 - Component Inventory Design Spec]].

## 9. Required states

Required states: empty queue, grouped pending drafts, loading, filter no results, low-confidence draft, broken source, citation drift, conflict detected, target archived, validation failed, approval committing, edit draft dirty, reject reason picker, merge target picker, stale 30-day warning, stale 90-day nudge, network failure, permission denial, quota blocked for regeneration but manual review available.

Blind approval must be disabled on conflicts and source-dependent broken evidence.

## 10. AI behavior

The queue itself is review, not generation. AI may have produced drafts upstream. Regeneration or rerun actions, if present, are GM-invoked and quota-gated, and must not block manual approve/reject/edit.

AI never writes canon from this screen. The write occurs only when the GM approves or edit-and-approves.

## 11. Source/provenance behavior

Source/provenance is central. Every selected draft should show source badges and a source dock/sheet. Transcript sources show timestamp, frozen excerpt, current transcript segment when available, and citation drift when changed.

Broken source behavior must explain what is safe: reject, merge into manual edit, or copy content manually. Approve/Edit & Approve is disabled when required evidence is missing.

Source detail should be readable before action. On desktop, the source dock can remain open while the GM scrolls the diff. On mobile, opening the source sheet should not lose draft context; the sheet title should repeat target name and change kind. Low-confidence drafts should sort upward, but the label must describe evidence quality rather than model certainty.

## 12. Navigation in

Users arrive from dashboard pending review card, Review rail item, post-session notification, pipeline status page, Library detail draft badge, stale queue notification, or prep pending-warning link.

## 13. Navigation out

Users go to target Library detail, source transcript segment, session review page, dashboard, session prep, or Settings usage if quota affects rerun options.

## 14. Components to avoid

Avoid prominent Approve All, automatic canon commit, hidden source panels, chatbot-style review, player publishing controls, relationship graph merge UI, and any flow that treats AI output as already true.

## 15. Visual tone

Trustworthy editorial desk inside the literary, modern, relaxing Sanctum. It should feel deliberate and evidence-backed. Use Cream review surfaces, clear before/after diff styling, Amber for action, Sage for approved/safe state, Rust for destructive/archive/broken-source warnings.

## 16. Claude Design prompt

```text
Create Relic's Approval Queue trust surface inside The Sanctum. Make it literary, modern, relaxing, deliberate, and evidence-backed. Desktop layout: grouped draft list, selected diff/editor, source/provenance dock. Mobile: one draft at a time with source bottom sheet and equivalent approve/edit/reject/merge/archive capability. Include filters, confidence chips, source badges, citation drift, broken source warnings, conflict panel, and stale queue banner. Make clear that AI drafts are not canon until explicit GM action. Do not include a prominent Approve All or proactive AI chat. Exclude player publishing, graph merge visuals, and any automatic canon write.
```
