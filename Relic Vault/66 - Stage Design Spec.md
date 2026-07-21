---
status: active
authority: secondary
scope: mvp-design
read_after:
  - "[[60 - Design Spec Overview]]"
depends_on:
  - "[[32 - Stage UX Flow]]"
  - "[[31 - Session Prep Flow]]"
  - "[[13 - Design System]]"
  - "[[34 - UI Implementation Spec]]"
  - "[[72 - Navigation Design Spec]]"
supersedes: []
last_audited: 2026-07-20
source_file: "Relic Vault/66 - Stage Design Spec.md"
---

> [!info] How to use this spec
> Use this for The Stage across web and mobile. Read with [[60 - Design Spec Overview]], [[72 - Navigation Design Spec]], and [[71 - Component Inventory Design Spec]]. Upstream behavior lives in [[32 - Stage UX Flow]], [[31 - Session Prep Flow]], and [[34 - UI Implementation Spec]].

# Stage Design Spec

## 1. Purpose

The Stage supports live play. It gives the GM immediate access to the current session packet, pinned cards, search, Relic Guide, quick capture, quick stubs, recording, Mark Moment, dice, and End Session.

It is the live-session surface: clean, focused, and live-session-ready on web and mobile.

## 2. Page synthesis

This spec condenses [[32 - Stage UX Flow]] into a design prompt for The Stage. It must preserve the packet relationship with [[31 - Session Prep Flow]]: Stage renders prepared content; it does not re-synthesize, rewrite, or manage prep.

Stage is not a Sanctum dashboard in dark mode and is not a default rail destination. It is a clean, focused table surface opened from Prepare or live-session context.

## 3. User mental model

The GM thinks: "Players are at the table. I need to find something, capture something, record, mark a moment, or end the session without breaking flow."

They expect fast taps, readable cards, offline resilience, and no surprise prompts.

## 4. Primary user jobs

- Start or resume the live session.
- Read agenda/objective/opening scene quickly.
- Open pinned Character, Place, Faction, Artifact, and Thread cards.
- Search Saga/World canon during play.
- Use Relic Guide for cited live support and GM-reviewed create/edit actions.
- Capture notes and quick stubs.
- Record with consent and mark important moments.
- Roll basic dice.
- End session with undo and optional GM summary.

## 5. Primary action

During ready preview, the primary action is `Start session`. During live play, primary actions live in the sticky bottom bar: Record, Mark Moment, and Dice. End Session is important but should not be visually adjacent to accidental taps.

Search is persistent and should be reachable near the top.

## 6. Secondary actions

Secondary actions include Quick capture, Quick stub, Open pinned card, long-press quick actions, Open in Sanctum read-only, use Relic Guide, offline queue panel, consent gate, undo End Session, and optional one-line summary after session ends.

## 7. Layout structure

Mobile layout is one vertical scroll:

1. Header: session title, state chip, recording/offline indicator.
2. Persistent search bar.
3. Agenda collapsible sections.
4. Pinned cards, one per row.
5. Notes/captures for this session.
6. Relic Guide sheet/sidecar access.
7. Sticky bottom action bar.

Use Ink background with Cream text. Expanded cards use subtle Ink-faint or Stone-900 surfaces. Web and tablet include a collapsible Relic Guide sidecar and can add an optional right side panel for selected pinned detail only when it does not compete with Guide. The main Stage column remains primary. The web implementation is first in build order; the mobile implementation follows with stronger offline ergonomics, not reduced scope.

## 8. Key components

- Navigation: `StageShell`, `StageHeader`, `StageStateChip`, `StageSearchBar`, `ReturnToStageButton`.
- Containment: `StageAgenda`, `PinnedList`, `StageCard`, `StageSidePanel`, `SessionNotesList`.
- Actions: `RecordingControl`, `MarkMomentButton`, `DiceButton`, `QuickCaptureSheet`, `QuickStubSheet`, `RelicGuideAction`, `EndSessionConfirm`, `UndoBanner`.
- Feedback: `OfflineChip`, `QueuedSyncPanel`, `RecordingFailureBanner`, `ConsentGate`, `StartSessionConfirm`, `SessionEndSummaryCard`.
- Data/status: `PacketHydrationSkeleton`, `SearchModeToggle`, `LocalOnlyBadge`, `RelicGuideSidecar`.

See [[71 - Component Inventory Design Spec]].

## 9. Required states

Required states: no ready session, ready preview, started awaiting consent, recording consent yes/no, in progress, Sanctum return available, recording active, recording paused/error, offline with queued captures, reconnecting, local packet loading, search timeout with lexical fallback, hybrid unavailable offline, Relic Guide minimized/expanded/loading/failure, quick capture saved, quick stub queued, End Session confirm, ended pending undo, undo success, ended summary card, pipeline queued, app crash/resume.

The Stage must remain useful offline with cached packet, literal search, capture, stubs, recording chunks, Mark Moment, dice, and queued End Session. Relic Guide should degrade to cached context, preserved prompts, and queued/retry states when online AI is unavailable.

## 10. AI behavior

AI on Stage is GM-controlled through Relic Guide and explicit actions. Relic Guide may answer live questions with citations, suggest prompts, draft quick captures/stubs, and prepare edits. It must not autonomously summarize, update canon, mention-detect, or run background synthesis while status is `in_progress` or `ended_pending_undo`.

Relic Guide can affect the project only after GM review. Low-risk session working-state changes can use an inline preview/apply action. Canon-impacting changes require inline GM-reviewed commit or Approval Queue draft with provenance.

Quick capture and recording store evidence. Post-session synthesis starts only after End Session completes.

## 11. Source/provenance behavior

Stage content is mostly deterministic packet and canon projection. It does not need heavy source UI in the live view. Search results can show compact source/scope labels. Opening a cached read-only detail may show limited provenance, but source inspection belongs in Sanctum/Review after play.

Quick captures and marked moments become sources later. They should show timestamp and local/queued state. Relic Guide proposals that use live-session evidence should label that evidence and avoid presenting queued/local material as approved canon.

## 12. Navigation in

Users arrive from current session pill, Prepare Ready for Stage/Open Stage actions, Home next-action cards, app launch with active session, notification/deep link, `Return to Stage`, or resume after crash. A planned session is not openable as live Stage until marked ready. A direct Stage route with no ready/live session redirects or points to Prepare.

## 13. Navigation out

Users can return to Sanctum while session is ready or started and prep remains editable. Once in progress, prep is locked. When the GM is in Sanctum during `started`, `in_progress`, or `ended_pending_undo`, the shell shows a bright top-right `Return to Stage` affordance. End Session returns to Sanctum dashboard/review flow after undo window and optional summary. Read-only Sanctum detail opens in overlay/side panel without replacing Stage.

## 14. Components to avoid

Avoid initiative trackers, encounter HUDs, tactical maps, live transcript panels, speaker diarization, autonomous AI suggestions, player views, VTT controls, stat-block-heavy rules automation, music/soundboards, and full Approval Queue review.

## 15. Visual tone

Clean, focused, dark, and fast. Every element should justify its presence at a live table. Use high contrast, large tap targets, minimal ornament, and strong state clarity. Amber marks action/currentness and return-to-live guidance; Rust marks recording, danger, or destructive confirmation.

## 16. Claude Design prompt

```text
Create Relic's Stage screen for live tabletop play across web and mobile. It should feel clean and focused. Use Ink dark background, Cream text, Amber action/current state, Rust recording/destructive state. Layout: header with session state, persistent search, agenda, pinned cards one per row, session notes, collapsible Relic Guide sidecar/sheet, sticky action bar with Record, Mark Moment, Dice. Include Quick Capture, Quick Stub, offline queue chip where available, consent gate, End Session two-step confirm, 60-second undo, and optional one-line summary after end. Stage opens from Prepare/session context, not default navigation. If the GM returns to Sanctum mid-session, show a bright top-right Return to Stage affordance. Relic Guide can answer with citations and prepare GM-reviewed create/edit actions, but cannot autonomously mutate canon. Exclude initiative, encounter, tactical map, VTT, live transcription, player controls, autonomous AI, and deep review features.
```

## 17. Web wireframe implementation decision — 2026-07-20

For the current web MVP, `Claude Design - Relic Design System/Relic Wireframes (standalone).html` is the concrete Stage layout and interaction reference. It does not change the upstream lifecycle, canon, or offline contracts in [[32 - Stage UX Flow]]. The implemented web cockpit keeps the wireframe's five persistent actions in this order: Record, Note, Dice, Create, End Session. Mark Moment and durable recording remain upstream MVP obligations and must be added without displacing or renaming that rail.

The web implementation uses the existing server-rendered session packet and scoped Supabase RPCs, with a client cockpit for transient overlay, Loom, GM Screen, dice, recording, and undo state. End Session persists `ended_pending_undo` and its timestamp before showing the 60-second recovery treatment. Quick notes, quick-created canon stubs, consent, and dice writes use existing scoped backend contracts. Board management is session-local presentation unless it was prepared through the existing pin RPC.

Browser `MediaRecorder` capture is isolated behind a recording adapter. Captured audio is held only for the current tab; Storage upload, chunk registration, offline retention, transcription enqueue, and provider delivery are not represented as complete until the web client is connected to those existing backend contracts. The same rule applies to Relic Guide: live/prep Loom presentation must not imply that the AI task entrypoint is wired when it is not.
