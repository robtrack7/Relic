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
last_audited: 2026-05-31
source_file: "Relic Vault/66 - Stage Design Spec.md"
---

> [!info] How to use this spec
> Use this for The Stage across web and mobile. Read with [[60 - Design Spec Overview]], [[72 - Navigation Design Spec]], and [[71 - Component Inventory Design Spec]]. Upstream behavior lives in [[32 - Stage UX Flow]], [[31 - Session Prep Flow]], and [[34 - UI Implementation Spec]].

# Stage Design Spec

## 1. Purpose

The Stage supports live play. It gives the GM immediate access to the current session packet, pinned cards, search, quick capture, quick stubs, recording, Mark Moment, dice, and End Session.

It is the live-session surface: clean, focused, and live-session-ready on web and mobile.

## 2. Page synthesis

This spec condenses [[32 - Stage UX Flow]] into a design prompt for The Stage. It must preserve the packet relationship with [[31 - Session Prep Flow]]: Stage renders prepared content; it does not re-synthesize, rewrite, or manage prep.

Stage is not a Sanctum dashboard in dark mode. It is a clean, focused table surface.

## 3. User mental model

The GM thinks: "Players are at the table. I need to find something, capture something, record, mark a moment, or end the session without breaking flow."

They expect fast taps, readable cards, offline resilience, and no surprise prompts.

## 4. Primary user jobs

- Start or resume the live session.
- Read agenda/objective/opening scene quickly.
- Open pinned Character, Place, Faction, Artifact, and Thread cards.
- Search Saga/World canon during play.
- Capture notes and quick stubs.
- Record with consent and mark important moments.
- Roll basic dice.
- End session with undo and optional GM summary.

## 5. Primary action

During ready preview, the primary action is `Start session`. During live play, primary actions live in the sticky bottom bar: Record, Mark Moment, and Dice. End Session is important but should not be visually adjacent to accidental taps.

Search is persistent and should be reachable near the top.

## 6. Secondary actions

Secondary actions include Quick capture, Quick stub, Open pinned card, long-press quick actions, Open in Sanctum read-only, offline queue panel, consent gate, undo End Session, and optional one-line summary after session ends.

## 7. Layout structure

Mobile layout is one vertical scroll:

1. Header: session title, state chip, recording/offline indicator.
2. Persistent search bar.
3. Agenda collapsible sections.
4. Pinned cards, one per row.
5. Notes/captures for this session.
6. Sticky bottom action bar.

Use Ink background with Cream text. Expanded cards use subtle Ink-faint or Stone-900 surfaces. Web and tablet can add an optional right side panel for selected pinned detail, but the main Stage column remains primary. The web implementation is first in build order; the mobile implementation follows with stronger offline ergonomics, not reduced scope.

## 8. Key components

- Navigation: `StageShell`, `StageHeader`, `StageStateChip`, `StageSearchBar`.
- Containment: `StageAgenda`, `PinnedList`, `StageCard`, `StageSidePanel`, `SessionNotesList`.
- Actions: `RecordingControl`, `MarkMomentButton`, `DiceButton`, `QuickCaptureSheet`, `QuickStubSheet`, `EndSessionConfirm`, `UndoBanner`.
- Feedback: `OfflineChip`, `QueuedSyncPanel`, `RecordingFailureBanner`, `ConsentGate`, `StartSessionConfirm`, `SessionEndSummaryCard`.
- Data/status: `PacketHydrationSkeleton`, `SearchModeToggle`, `LocalOnlyBadge`.

See [[71 - Component Inventory Design Spec]].

## 9. Required states

Required states: no ready session, ready preview, started awaiting consent, recording consent yes/no, in progress, recording active, recording paused/error, offline with queued captures, reconnecting, local packet loading, search timeout with lexical fallback, hybrid unavailable offline, quick capture saved, quick stub queued, End Session confirm, ended pending undo, undo success, ended summary card, pipeline queued, app crash/resume.

The Stage must remain useful offline with cached packet, literal search, capture, stubs, recording chunks, Mark Moment, dice, and queued End Session.

## 10. AI behavior

AI is dormant on Stage. The only AI-touching surface in MVP is GM-initiated Hybrid search. There are no proactive suggestions, mid-session summarization, mention detection, prep nudges, live transcription, or background synthesis while status is `in_progress` or `ended_pending_undo`.

Quick capture and recording store evidence. Post-session synthesis starts only after End Session completes.

## 11. Source/provenance behavior

Stage content is mostly deterministic packet and canon projection. It does not need heavy source UI in the live view. Search results can show compact source/scope labels. Opening a cached read-only detail may show limited provenance, but source inspection belongs in Sanctum/Review after play.

Quick captures and marked moments become sources later. They should show timestamp and local/queued state.

## 12. Navigation in

Users arrive from the Stage rail item, current session pill, Sanctum Ready for Stage, app launch with active session, notification/deep link, or resume after crash. A planned session is not openable as live Stage until marked ready.

## 13. Navigation out

Users can return to Sanctum while session is ready or started and prep remains editable. Once in progress, prep is locked. End Session returns to Sanctum dashboard/review flow after undo window and optional summary. Read-only Sanctum detail opens in overlay/side panel without replacing Stage.

## 14. Components to avoid

Avoid initiative trackers, encounter HUDs, tactical maps, live transcript panels, speaker diarization, proactive AI suggestions, player views, VTT controls, stat-block-heavy rules automation, music/soundboards, and full Approval Queue review.

## 15. Visual tone

Clean, focused, dark, and fast. Every element should justify its presence at a live table. Use high contrast, large tap targets, minimal ornament, and strong state clarity. Amber marks action/currentness; Rust marks recording, danger, or destructive confirmation.

## 16. Claude Design prompt

```text
Create Relic's Stage screen for live tabletop play across web and mobile. It should feel clean and focused. Use Ink dark background, Cream text, Amber action/current state, Rust recording/destructive state. Layout: header with session state, persistent search, agenda, pinned cards one per row, session notes, sticky action bar with Record, Mark Moment, Dice. Include Quick Capture, Quick Stub, offline queue chip where available, consent gate, End Session two-step confirm, 60-second undo, and optional one-line summary after end. Web may use a right detail side panel; mobile uses sheets and a bottom action bar. AI is dormant except GM-initiated Hybrid search. Exclude initiative, encounter, tactical map, VTT, live transcription, player controls, proactive AI, and deep review features.
```
