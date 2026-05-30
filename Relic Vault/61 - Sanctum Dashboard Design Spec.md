---
status: active
authority: secondary
scope: mvp-design
read_after:
  - "[[60 - Design Spec Overview]]"
depends_on:
  - "[[30 - Sanctum UX Flow]]"
  - "[[31 - Session Prep Flow]]"
  - "[[34 - UI Implementation Spec]]"
  - "[[13 - Design System]]"
supersedes: []
last_audited: 2026-05-30
source_file: "Relic Vault/61 - Sanctum Dashboard Design Spec.md"
---

> [!info] How to use this spec
> Use this for the authenticated Sanctum home after the shell has resolved active Workspace, World, and Saga. Read with [[60 - Design Spec Overview]] and [[71 - Component Inventory Design Spec]]. Upstream behavior lives in [[30 - Sanctum UX Flow]], [[31 - Session Prep Flow]], and [[34 - UI Implementation Spec]].

# Sanctum Dashboard Design Spec

## 1. Purpose

The Sanctum dashboard is the active cockpit for the selected Saga. It answers: what is happening now, what needs attention, what should be prepped next, what changed recently, and what can the GM create quickly?

This is not a generic Workspace overview or analytics page. Workspace and World context appear in the shell, while the dashboard centers the current Saga loop: Create, Organize, Prep, Review, Approve, Continue.

## 2. Page synthesis

The page combines state-aware home behavior from [[30 - Sanctum UX Flow]], prep entry from [[31 - Session Prep Flow]], shell rules from [[34 - UI Implementation Spec]], and visual tone from [[13 - Design System]]. It is the web app's literary, modern, relaxing Saga cockpit and should show one dominant next step, not a grid of equal modules.

When a session is planned or ready, the dashboard's primary content becomes an inline prep surface. When a session is in progress, it becomes a Resume Stage surface. When review is pending, it foregrounds the Approval Queue without hiding Plan Next Session. When no session exists, it points to Plan Session 1 or New session.

## 3. User mental model

The GM thinks: "This is my Saga desk. I can see what is unresolved, what changed, what is waiting for review, and how to get back to prep or play."

They are not managing organization settings here. They are continuing story work. They expect the screen to remember where they left off and reduce the cost of restarting.

## 4. Primary user jobs

- Resume the most important loop step for the active Saga.
- See active and loose Threads that should carry forward.
- Open or continue session prep from inside The Sanctum.
- Review pending drafts before they become canon.
- Create a Character, Place, Faction, Artifact, Thread, Session, or note quickly.
- Reopen recently edited canon without searching.

## 5. Primary action

The primary action is state-dependent:

- No sessions: `Plan your first session` or `New session`.
- Planned session: `Continue prep`.
- Ready session: `Open in Stage`.
- In-progress session: `Resume Stage`.
- Ended with review pending: `Open Review`.
- Reviewed with no next session: `Plan next session`.

Only one action should receive the strongest Amber treatment.

## 6. Secondary actions

Secondary actions include quick create, Open Threads, Open Entities, Open Sessions, Ask Relic, View recent canon, and Open Approval Queue. These should be visible but quieter than the primary loop action.

Quick create belongs on the dashboard because it lets the GM capture momentum without navigating away. It should use type-specific choices rather than a generic "add item" button.

## 7. Layout structure

Use the Sanctum shell: a persistent left rail, a top context bar, central dashboard content, and an optional right utility sidecar. The rail should read as places to go: Home, Threads, Entities, Sessions, Review, Ask, with Export and Settings lower in the rail. Search does not belong in the rail; it belongs in the top context bar with Workspace/World/Saga scope.

The top context bar should show active Workspace/World/Saga, global search/command input, current session pill, Review badge, Ask button, usage chip when relevant, and account menu. The current session pill is one of the primary routes into prep, Stage, or Review.

The default desktop dashboard uses two content columns. The main column holds the primary loop card, current session/prep/review state, and Thread carry-forward. The secondary column holds recently edited canon, quick create, small usage/status summaries, and a compact Ask Relic entry. On wide screens, a right sidecar may open for Ask Relic, source/provenance, or contextual inspection, but it should be closed by default and should not become a permanent chat column.

If a session is planned or ready, inline prep can occupy the main column with briefing, agenda preview, thread carry-forward, pinned entities, and Ready for Stage CTA. Use `Open full editor` as a secondary link. On mobile, collapse into a single column ordered by next action, session state, pending review, Threads, recent canon, and quick create.

## 8. Key components

- Navigation: `SanctumShell`, `SanctumHomeLink`, `ContextSwitcher`, `TopContextSearch`, `CurrentSessionPill`, `SanctumNav`, `ReviewBadge`, `AskRelicButton`.
- Actions: `PrimaryLoopCTA`, `QuickCreateMenu`, `ReadyForStageButton`, `OpenReviewButton`, `OpenStageButton`.
- Containment: `SagaStatusPanel`, `NextActionCard`, `PrepSummaryPanel`, `ThreadCarryForwardCard`, `RecentCanonList`, `PendingReviewCard`, `QuickCreateCard`.
- Sidecar/inspection: `AskRelicSidecar`, `SourceProvenanceSidecar`, `ContextInspector`.
- Feedback: `AutosaveIndicator`, `PipelineStatusBanner`, `QuotaWarningChip`, `OfflineQueuedChip`.
- AI and trust: `PrepBriefingCard`, `SourceCountBadge`, `AskRelicAction`, `DraftFromPromptAction`.

See [[71 - Component Inventory Design Spec]] for shared definitions.

## 9. Required states

Required dashboard states: no Saga resolved, empty Saga, no sessions, Session 1 prompt, planned session, ready session, in-progress session, ended pending pipeline, review ready, no review items, quota warning, offline/cached, loading shell, loading dashboard, RLS/permission error, and stale pending review.

The empty Saga state should offer `Plan your first session`, `Create character`, `Create place`, `Create thread`, and a clearly invoked `Draft from prompt` or `Ask Relic a question` action. AI must not auto-run.

## 10. AI behavior

AI appears as invoked actions, a collapsible sidecar/page, and one visible reading aid. The prep briefing may compose when a prep surface loads, but it must be visibly stamped as canon-only and source-backed. Dashboard AI actions can link to Ask Relic, Draft this session, Brainstorm beats, or Draft an NPC only when the relevant prep context exists.

No proactive suggestions, surprise cards, persistent chatbot rail, or "Relic noticed..." nudges. AI never writes canon from the dashboard without the GM entering a review or explicit inline approval path.

## 11. Source/provenance behavior

Dashboard provenance is compact. Prep briefing shows composed time and source count. Pending Review card shows draft count, source warning count, and low-confidence count. Recent canon can show last source/action only when useful.

Do not crowd the dashboard with full citations. Open a provenance drawer or route to the owning detail/review page for inspection.

## 12. Navigation in

Users arrive from auth/bootstrap, New saga commit, Start blank, Stage end, notification tap, shell logo/home, World/Saga switcher, or browser refresh.

## 13. Navigation out

Users can go to Threads, Entities, Sessions, session prep editor, Stage, Approval Queue, Ask, Export, Settings, or specific recent canon detail pages. If the session is in progress, Saga switching should be blocked until End Session.

## 14. Components to avoid

Avoid generic metrics dashboards, full Workspace admin cards, permanent chatbot columns, initiative or encounter widgets, map previews, relationship graphs, player-facing controls, live transcription panels, and broad "recommended by AI" feeds.

## 15. Visual tone

Literary, modern, relaxing, and decisive. The web dashboard should feel like a prepared desk for the active Saga: parchment frame, cream cards, restrained Amber action, Sage thread signals, Cormorant for Saga/session names, DM Mono for state and provenance.

## 16. Claude Design prompt

```text
Create the Relic Sanctum dashboard as an active Saga cockpit for the web app, not a Workspace overview. Make it literary, modern, and relaxing using the Sanctum parchment design system. Include shell context for Workspace/World/Saga, top-bar search, nav order Threads, Entities, Sessions, Review, Ask. The main card must adapt to Saga/session state and show the next loop action. Include Thread carry-forward, pending review, recently edited canon, and quick create. Session prep lives inline when a session is planned or ready. Ask Relic is a page/contextual action, not a permanent chat column. Exclude initiative, encounter, map, player, graph, and live transcription features.
```
