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
supersedes: []
last_audited: 2026-05-30
source_file: "Relic Vault/70 - Mobile Sanctum Lite Design Spec.md"
---

> [!info] How to use this spec
> Use this for mobile-light Sanctum flows that support the loop around Stage. Read with [[60 - Design Spec Overview]] and [[71 - Component Inventory Design Spec]]. Upstream behavior lives in [[30 - Sanctum UX Flow]], [[34 - UI Implementation Spec]], [[31 - Session Prep Flow]], and [[24 - Approval Queue]].

# Mobile Sanctum Lite Design Spec

## 1. Purpose

Mobile Sanctum Lite gives the GM enough Sanctum capability on phone to continue the loop: view dashboard summary, search, browse/edit light entity details, prep enough to mark ready, review minimum Approval Queue items, and manage basic settings.

It does not replace web as the deep Sanctum workspace. Mobile's primary Relic surface remains The Stage.

## 2. Page synthesis

This spec translates [[30 - Sanctum UX Flow]] mobile reductions and [[34 - UI Implementation Spec]] mobile routes into a consistent mobile app pattern. It also respects [[31 - Session Prep Flow]] and [[24 - Approval Queue]]: mobile must be functional but not overloaded.

## 3. User mental model

The GM thinks: "I am on my phone. I need to check the Saga, prep a little, approve something simple, or get to Stage."

They expect simple stacks, sheets, large tap targets, and quick escape back to Stage.

## 4. Primary user jobs

- See active Saga home summary and next action.
- Search and open canon quickly.
- Browse Threads, entities, Sessions, Review, and Ask through a compact Sanctum shell.
- Make light edits with autosave.
- Prep or adjust a session enough to mark Ready for Stage.
- Complete minimum approval actions on simple drafts.
- Open Stage quickly.

## 5. Primary action

The primary mobile action is context-dependent but often Stage-oriented: `Open Stage`, `Ready for Stage`, `Resume Stage`, or `Open Review`. The bottom navigation should keep Stage reachable.

## 6. Secondary actions

Secondary actions include quick search, open context switcher sheet, filter lists, open source/provenance sheet, quick create, edit entity, approve/reject simple drafts, and open web/full review for complex tasks.

## 7. Layout structure

Use a single-column mobile Sanctum shell. Top area shows current Saga and a context switcher sheet trigger. Bottom nav can include Home, Search, Sessions, Review, Stage, with Stage visually available. Within Sanctum, use a horizontal top tab strip for Threads, Entities, Sessions, Review, Ask where needed.

No persistent right rail. Use bottom sheets for filters, source/provenance, context switcher, AI results, and confirmation dialogs.

Prioritize the current loop over full information density. The home stack should show active session state, pending review, Thread carry-forward, and recent canon before broad library browsing. Detail pages should show title, state chips, summary, and one editable body area before metadata. Long secondary panels should collapse behind sheets so the GM can complete one task at a time.

## 8. Key components

- Navigation: `MobileSanctumShell`, `MobileContextSwitcherSheet`, `BottomNav`, `TopTabStrip`, `StageShortcut`.
- Containment: `MobileDashboardSummary`, `MobileEntityList`, `MobileDetailView`, `MobilePrepStack`, `MobileApprovalCard`.
- Inputs: `MobileSearch`, `SinglePaneEditor`, `SheetPicker`, `ChecklistEditor`.
- Feedback: `MobileAutosaveIndicator`, `OfflineQueuedBanner`, `LoadingSkeleton`, `PermissionErrorState`.
- Trust: `SourceBottomSheet`, `CanonStateChip`, `ApprovalActionSheet`, `QuotaWarningSheet`.

See [[71 - Component Inventory Design Spec]].

## 9. Required states

Required states: bootstrap loading, no active Saga, ready/in-progress session shortcut, mobile dashboard empty, list loading, no results, source sheet open, autosave/offline queued, simple approval, complex approval needs web/full review, quota warning, prep incomplete, Ready success, Stage unavailable, permission denial.

Complex two-pane diff, transcript segment editing, advanced import, export, and Thread Timeline are accessible or deferred but not optimized.

## 10. AI behavior

AI remains GM-invoked. Ask can work on mobile. Prep AI buttons can exist where context supports them. Mobile should not introduce proactive AI cards or permanent chat. AI results use sheets/cards with clear discard/insert/review behavior.

## 11. Source/provenance behavior

Mobile uses bottom sheets for sources and provenance. Source access must be available before approval, but the layout can be stepwise: card first, source sheet second, action confirmation third.

For Ask, citations remain inline and tappable.

Mobile provenance should favor short labels and focused excerpts. If a draft requires comparing multiple long transcript segments, the mobile screen can provide a `Review on web` or `Open full review` CTA, but it should still allow reject or leave pending. The mobile source sheet must preserve safe context: target name, source kind, timestamp when available, and whether evidence is broken or drifted.

## 12. Navigation in

Users arrive from mobile app bootstrap, Stage exit, notification tap, bottom nav, search result, or deep link to Review/Settings/Prep.

## 13. Navigation out

Users go to Stage, dashboard, detail pages, prep, Review, Ask, Settings, or web/full review CTA for complex actions. Context switcher changes active Saga only when no live session blocks it.

## 14. Components to avoid

Avoid desktop-density side rails, permanent chatbot columns, full two-pane Approval Queue as default, transcript editing, advanced import/export flows, full Thread Timeline optimization, graph/map editors, and player-facing controls.

## 15. Visual tone

Compact Sanctum, not mini Stage. It stays parchment/cream, readable, and calm, with larger targets and clear bottom sheets. Stage remains the dark live surface.

## 16. Claude Design prompt

```text
Create Relic's Mobile Sanctum Lite experience. It supports dashboard summary, search, Threads/Entities/Sessions/Review/Ask, light detail editing, prep enough to mark Ready for Stage, minimum approval review, settings, and quick Stage access. Use single-column parchment/cream layout, context switcher sheet, bottom nav with Stage, top tab strip, source bottom sheets, and large tap targets. Keep mobile functional but not as dense as web Sanctum. Exclude permanent chat, full desktop diff by default, transcript editing, graph/map editors, player controls, and proactive AI.
```
