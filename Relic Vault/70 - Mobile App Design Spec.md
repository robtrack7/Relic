---
status: active
authority: secondary
scope: mvp-design
read_after:
  - "[[60 - Design Spec Overview]]"
depends_on:
  - "[[30 - Sanctum UX Flow]]"
  - "[[34 - UI Implementation Spec]]"
  - "[[31 - Session Prep Flow]]"
  - "[[24 - Approval Queue]]"
  - "[[13 - Design System]]"
  - "[[72 - Navigation Design Spec]]"
supersedes: []
last_audited: 2026-06-01
source_file: "Relic Vault/70 - Mobile App Design Spec.md"
---

> [!info] How to use this spec
> Use this for adapting Relic's full Sanctum and Stage product model to mobile after the web app proves the loop. Read with [[60 - Design Spec Overview]], [[72 - Navigation Design Spec]], and [[71 - Component Inventory Design Spec]]. Upstream behavior lives in [[30 - Sanctum UX Flow]], [[32 - Stage UX Flow]], [[34 - UI Implementation Spec]], [[31 - Session Prep Flow]], and [[24 - Approval Queue]].

# Mobile App Design Spec

## 1. Purpose

The mobile app gives the GM the same Relic product model on phone and tablet after the web app is stable: The Sanctum for create/organize/prep/review/approve/continue and The Stage for live play.

Mobile is not a reduced "lite" version. It uses stacked layouts, sheets, bottom navigation, and offline-aware state to make the full loop usable on smaller screens.

## 2. Page synthesis

This spec translates [[30 - Sanctum UX Flow]], [[32 - Stage UX Flow]], and [[34 - UI Implementation Spec]] mobile routes into a consistent mobile app pattern. It also respects [[31 - Session Prep Flow]] and [[24 - Approval Queue]]: mobile must be functionally complete without copying desktop density.

## 3. User mental model

The GM thinks: "I am on my phone. I need the same Saga loop, shaped for this screen: check, create, prep, approve, search, or run."

They expect simple stacks, sheets, large tap targets, reliable offline behavior during play, and quick switching back to Stage when a session is ready or live.

## 4. Primary user jobs

- See active Saga home summary and next action.
- Search and open canon quickly.
- Browse Threads, Library, Prepare, Sessions, Review, Search, and Relic Guide through a compact Sanctum shell.
- Make edits with autosave.
- Prep or adjust a session and mark Ready for Stage.
- Complete Approval Queue actions with mobile source/provenance sheets.
- Open Stage quickly when a session is ready or live.

## 5. Primary action

The primary mobile action is context-dependent: `Continue prep`, `Open Stage`, `Ready for Stage`, `Resume Stage`, `Open Review`, or `Plan next session`. Stage appears in bottom navigation only while a session is ready, started, in progress, or ended pending undo; otherwise Stage access is through Prepare/session context.

## 6. Secondary actions

Secondary actions include quick Search, open Relic Guide sheet, open context switcher sheet, filter lists, open source/provenance sheet, quick create, edit Library record, approve/reject/merge/archive drafts, and open Settings/Usage.

## 7. Layout structure

Use a two-surface mobile shell with contextual Stage access. The app-level bottom navigation shows Sanctum by default and adds Stage only when a session is ready/live. Top area shows current Saga and a context switcher sheet trigger. Inside Sanctum, use a horizontal top tab strip or compact section links for Home, Search, Guide, Threads, Library, Prepare, Sessions, and Review where needed. Inside Stage, keep the live-session stack, Relic Guide sheet access, and sticky action bar.

No persistent right rail. Use bottom sheets for filters, source/provenance, context switcher, Relic Guide results/actions, and confirmation dialogs.

Prioritize the current loop over full information density. The Sanctum home stack should show active session state, pending review, Thread carry-forward, and recent canon before broad library browsing. Detail pages should show title, state chips, summary, and editable body areas before metadata. Long secondary panels should collapse behind sheets so the GM can complete one task at a time.

## 8. Key components

- Navigation: `MobileAppShell`, `MobileSanctumShell`, `StageShell`, `MobileContextSwitcherSheet`, `MobileSurfaceTabBar`, `TopTabStrip`, `StageShortcut`, `RelicGuideSheet`, `ReturnToStageButton`.
- Containment: `MobileDashboardSummary`, `MobileEntityList`, `MobileDetailView`, `MobilePrepStack`, `MobileApprovalCard`, `StageAgenda`, `PinnedList`.
- Inputs: `MobileSearch`, `SinglePaneEditor`, `SheetPicker`, `ChecklistEditor`.
- Feedback: `MobileAutosaveIndicator`, `OfflineQueuedBanner`, `LoadingSkeleton`, `PermissionErrorState`.
- Trust: `SourceBottomSheet`, `CanonStateChip`, `ApprovalActionSheet`, `QuotaWarningSheet`.

See [[71 - Component Inventory Design Spec]].

## 9. Required states

Required states: bootstrap loading, no active Saga, ready/in-progress session shortcut, Stage tab hidden, Stage tab visible, Return to Stage visible, mobile dashboard empty, list loading, no results, source sheet open, Relic Guide minimized/open/loading/failure/action review, autosave/offline queued, approval with source review, conflict requiring safe action, quota warning, prep incomplete, Ready success, Stage unavailable, permission denial.

Complex two-pane diff becomes a stepwise mobile diff/source/action flow. Transcript segment editing, advanced import, export, and Thread Timeline may use mobile-specific patterns, but they should not be described as unavailable solely because the platform is mobile.

## 10. AI behavior

AI remains GM-invoked. Relic Guide, prep AI buttons, and review-safe AI actions can work on mobile where context supports them. Mobile should not introduce proactive AI cards or permanent chat. Relic Guide results use sheets/cards with clear discard/insert/review behavior. Canon mutation requires inline GM review or Approval Queue.

## 11. Source/provenance behavior

Mobile uses bottom sheets for sources and provenance. Source access must be available before approval, but the layout can be stepwise: card first, source sheet second, action confirmation third.

For Relic Guide, citations remain inline and tappable.

Mobile provenance should favor short labels and focused excerpts. If a draft requires comparing multiple long transcript segments, the mobile screen should step the GM through target, diff, source, and action instead of forcing a cramped desktop layout. The mobile source sheet must preserve safe context: target name, source kind, timestamp when available, and whether evidence is broken or drifted.

## 12. Navigation in

Users arrive from mobile app bootstrap, Stage exit, notification tap, contextual Stage tab, search result, or deep link to Review/Settings/Prepare.

## 13. Navigation out

Users go to Stage when ready/live, dashboard, detail pages, Prepare, Review, Search, Relic Guide, Settings, or source/provenance sheets. Context switcher changes active Saga only when no live session blocks it.

## 14. Components to avoid

Avoid desktop-density side rails, permanent chatbot columns, autonomous Guide behavior, cramped two-pane Approval Queue as default, graph/map editors, player-facing controls, and any copy implying mobile is a reduced product.

## 15. Visual tone

Full Relic adapted to mobile. Sanctum stays literary, modern, relaxing, parchment/cream, readable, and calm with larger targets and clear bottom sheets. Stage remains clean, focused, dark, and live-session-ready.

## 16. Claude Design prompt

```text
Create Relic's mobile app experience for after the web app is stable. It includes both surfaces: Sanctum for dashboard, Search, Relic Guide, Threads/Library/Prepare/Sessions/Review, editing, prep, approval, settings, and usage; Stage for live session agenda, pinned cards, Relic Guide, capture, recording, Mark Moment, dice, and End Session. Use contextual Stage bottom navigation that appears only while a session is ready/live, parchment/cream Sanctum layouts, dark clean/focused Stage layouts, context switcher sheets, source bottom sheets, Guide action sheets, and large tap targets. Keep mobile functionally equivalent while using mobile-native stacks and sheets. Exclude permanent chat, autonomous AI, cramped desktop diff by default, graph/map editors, player controls, and proactive AI.
```
