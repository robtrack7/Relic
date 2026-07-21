---
status: active
authority: secondary
scope: planning
read_after:
  - "[[40 - MVP Implementation Planning Sequence]]"
depends_on:
  - "[[13 - Design System]]"
  - "[[30 - Sanctum UX Flow]]"
  - "[[31 - Session Prep Flow]]"
  - "[[32 - Stage UX Flow]]"
  - "[[33 - First Run UX Flow]]"
  - "[[34 - UI Implementation Spec]]"
  - "[[72 - Navigation Design Spec]]"
supersedes: []
last_audited: 2026-07-21
source_file: "Relic Vault/42 - UI Manual Flow Implementation Plan.md"
---

# UI Manual Flow Implementation Plan

## Goal

Build the MVP loop as a usable manual product before wiring AI calls: Create -> Organize -> Prep -> Run -> Review -> Approve -> Continue.

## Build Against

- [[13 - Design System]]
- [[30 - Sanctum UX Flow]]
- [[31 - Session Prep Flow]]
- [[32 - Stage UX Flow]]
- [[33 - First Run UX Flow]]
- [[34 - UI Implementation Spec]]
- [[72 - Navigation Design Spec]]
- [[24 - Approval Queue]]

## Implementation Groups

### 1. Design Tokens and Shells

- Map design tokens into shared CSS/Tailwind variables.
- Build `SanctumShell` for the literary, modern, relaxing Parchment/Cream surface in the web app first.
- Build the clean, focused `StageShell` in the web app first, then adapt both shells for mobile after the web loop is stable.
- Implement Workspace/World/Saga context controls, top-context Search, Relic Guide toggle/sidecar, `+ Create`, current session pill, Review badge, usage chip placeholder, `Return to Stage` while live, and state chips.

### 2. Auth, Bootstrap, and Start Blank

- Implement auth screens and route guard.
- Implement bootstrap redirect rules from [[33 - First Run UX Flow]].
- Implement New saga form with World choice, GM profile, help-level cards, and Start Blank create.
- Keep Build with AI and Bring your notes visible only as mocked/disabled or review-gated states until [[43 - AI Runtime Implementation Plan]] is accepted.

### 3. Sanctum Manual Loop

- Build dashboard states: no sessions, planned/ready session, in-progress session, review-ready session, empty Saga.
- Build Library/detail CRUD with manual create, edit, archive, source/provenance placeholders, duplicate warnings, and state chips.
- **Complete through Packet D3:** Threads list/detail now cover separate Active/Loose/Dormant/Failed/Resolved groups, optimistic title/summary/state/resolution edits, objective create/edit/complete/reopen/order, D2 related entities, Session pin history, and a source-traceable read-only timeline. Stage remains compact/read-only.
- Build notes and lore surfaces as sub-sections of Library.

### 4. Session Prep Without AI Wiring

- **Complete through Packet D4:** session list/planned-session behavior, full-editor/inline-dashboard parity, visible recoverable autosave, prior-session summary/fallback, scheduled-session affordances, state-valid actions, ordered archived/missing-pin recovery, checklist, packet preview, and latest-write Ready for Stage are implemented. Prepare remains the rail destination; Stage opens from Ready/Open Stage and live-session context.
- **Completed Packet D5 (partial format scope):** paste and strict UTF-8 text/Markdown now enter the scoped Import Inbox as raw, immutable, reviewable sources without invoking AI or relaxing explicit GM canon approval. `.docx` remains deferred.
- **Immediate next Packet E1:** deliver embedding and re-embedding workers without enrolling Import Inbox sources automatically.
- Show prep briefing and AI assist areas as empty/mocked/disabled surfaces with manual alternatives until AI runtime is accepted.
- Preserve autosave and quota/provider failure states without needing live AI calls.

### 5. Stage Manual Loop

- Build web Stage first, then mobile Stage packet hydration, agenda, pinned cards, search UI, Relic Guide sheet/sidecar, quick capture, quick stub, dice, consent, recording state UI, Mark Moment, End Session, and undo window.
- Implement offline queue indicators and local-first Stage interactions according to [[32 - Stage UX Flow]].
- Keep Stage AI dormant; Hybrid search is the only online retrieval affordance and must degrade clearly when offline.

### 6. Review and Approval Shell

- Build post-session status UI, transcript/review placeholders, and manual summary fallback.
- Build Approval Queue grouped list, draft diff shell, source dock, rejection reasons, conflict panel, and quota/provider failure states.
- The shell can be built before `synthesize_session`; it should accept seeded/manual draft fixtures for UI testing.

## Required Tests

- New GM can sign up, create default Workspace, create a World/Saga via Start Blank, and land on Sanctum.
- GM can manually create/edit/archive entities and see audit/provenance placeholders.
- GM can create a planned session, edit prep, mark Ready for Stage, and open Stage.
- Stage can capture notes/stubs, roll dice, record consent state, and end a session without any AI call.
- Approval Queue shell supports approve/edit/reject/merge/archive flows against fixture drafts.
- AI-dependent buttons do not call live AI until AI runtime implementation is accepted.

## Acceptance

UI/manual planning is complete when the loop is usable without AI and all disabled/mocked AI surfaces have clear manual fallback states.
