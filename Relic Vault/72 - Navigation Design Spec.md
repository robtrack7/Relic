---
status: active
authority: secondary
scope: mvp-design
read_after:
  - "[[60 - Design Spec Overview]]"
depends_on:
  - "[[11 - Product Basepoint]]"
  - "[[12 - MVP PRD]]"
  - "[[30 - Sanctum UX Flow]]"
  - "[[31 - Session Prep Flow]]"
  - "[[32 - Stage UX Flow]]"
  - "[[34 - UI Implementation Spec]]"
  - "[[61 - Sanctum Dashboard Design Spec]]"
  - "[[71 - Component Inventory Design Spec]]"
supersedes: []
last_audited: 2026-06-01
source_file: "Relic Vault/72 - Navigation Design Spec.md"
---

> [!info] How to use this spec
> Use this as the navigation contract for Relic's web app shell and major product surfaces. It defines what belongs in the top context bar, left navigation rail, global create menu, World/Saga switcher, Relic Guide sidecar, and future-reserved navigation areas. Read with [[60 - Design Spec Overview]], [[61 - Sanctum Dashboard Design Spec]], [[70 - Mobile App Design Spec]], and [[71 - Component Inventory Design Spec]].

# Navigation Design Spec

## 0. Purpose

This spec defines Relic's primary navigation model for the web app and the canonical navigation vocabulary for downstream screen specs. It translates the product hierarchy, the Sanctum/Stage surface model, and the core GM loop into a clear navigation system. Mobile adapts this model through [[70 - Mobile App Design Spec]] without changing the product IA.

The desktop left rail described here is a web-shell pattern, not a platform split. Mobile keeps the same product hierarchy and complete Sanctum/Stage capability, but presents it through a Sanctum/Stage bottom bar, compact section navigation, Search entry, Relic Guide sheet, and task sheets per [[70 - Mobile App Design Spec]].

Relic navigation must help the GM answer five questions quickly:

1. Where am I?
2. Which World and Saga am I working in?
3. What should I do next?
4. Where do I go to create, organize, prep, run, review, or approve?
5. What is canon, draft, pending, live, or blocked?

The guiding rule:

> The left rail is for places the GM works. The top bar is for context, search, creation, urgent state, and Guide visibility.

---

## 1. Product hierarchy

Relic's navigation must preserve this hierarchy:

```text
Account
└── Workspace
    └── World
        └── Saga
            └── Session
```

### 1.1 Hierarchy meanings

| Level | Meaning | Navigation treatment |
|---|---|---|
| Account | Authenticated user identity. | Account menu only. |
| Workspace | Ownership, usage, future billing/collaboration boundary. | Top context switcher and Settings. |
| World | Shared setting and World canon container. | Top context switcher, lightweight World settings, future World overview. |
| Saga | Playable storyline inside a World. | Primary active context for the dashboard, shell, search, Prepare, Stage, Review, and Library. |
| Session | Prep/run/review unit inside a Saga. | Current session pill, Prepare, Sessions, Stage, Review. |

### 1.2 Scope rule

The active Workspace / World / Saga is not decorative metadata. It controls:

- search scope
- Relic Guide scope
- AI retrieval scope
- Library filters
- Stage packet loading
- Approval Queue queries
- usage attribution
- export scope
- permission and RLS boundaries

The shell must always make current scope visible.

---

## 2. Primary navigation model

Relic uses two persistent navigation zones:

1. **Top context bar** — global scope, search, Guide toggle, create, session state, review state, usage, account.
2. **Left navigation rail** — primary work surfaces.

Recommended web shell:

```text
[Relic]  Workspace / World / Saga ▾     [Search…]     [Guide]     [+ Create]     [Session pill]     [Review badge]     [Usage]     [Account]
```

```text
Home
Threads
Library
Prepare
Sessions
Review

Export
Settings
```

---

## 3. Top context bar

## 3.1 Purpose

The top context bar answers:

- What Workspace / World / Saga am I in?
- How do I find anything or open Relic Guide?
- How do I create something quickly?
- What is the current session state?
- What needs review?
- Are there usage or quota concerns?
- Where are account-level controls?

## 3.2 Top bar zones

### Zone 1: Relic / Home

Clicking the Relic mark or product name returns to the active Saga dashboard.

Behavior:

- If active Saga exists: route to Home.
- If no active Saga exists: route to New Saga.
- If a live session blocks context change: preserve current context and show a safe warning.

### Zone 2: Workspace / World / Saga switcher

Display as a compact but readable context path:

```text
Workspace ▾ / World ▾ / Saga ▾
```

The switcher is the main place for multi-World and multi-Saga navigation. It should not be replaced by a generic dashboard overview.

#### Switcher contents

```text
Workspace
- Current Workspace
- Workspace settings
- Usage

World
- Current World
- World overview
- Edit World
- World settings
- New World / Saga
- Other Worlds

Saga
- Current Saga
- Saga settings
- New Saga in this World
- Resume saga creation, if applicable
- Other Sagas in this World
```

#### Switcher behavior

| Situation | Behavior |
|---|---|
| No World exists | New Saga flow creates one behind the scenes or through explicit new World choice. |
| One World exists | Show current World and Sagas; default New Saga to current World. |
| Multiple Worlds exist | Show grouped Worlds and Sagas. |
| Saga creation in progress | Show resumable row. |
| Session in progress | Block switching and route user to End Session or Resume Stage. |
| Unsaved local edits | Warn before switching if changes are not yet safely queued/saved. |

### Zone 3: Search

Use a global search entry:

```text
Search…
```

Search answers:

> Where is the thing?

Outputs:

- record results
- source results
- session results
- thread results
- command-style shortcuts
- quick stub option when appropriate

Examples:

- `Seraphine`
- `Iron Deed`
- `new place`
- `Session 12`
- `loose ledger`

Search belongs in the top context bar and should be globally available across Sanctum. Stage has its own local search treatment inside the Stage shell.

### Zone 4: Relic Guide

Relic Guide is the always-available AI sidecar. It is visible as a collapsible/minimizable control in the shell and can be expanded into a right sidecar on desktop or a sheet/drawer on mobile.

Relic Guide can answer:

> What does the canon say, and what can I do next?

Outputs:

- sourced answer
- citation list
- source drawer
- linked records
- no-answer state when insufficient canon exists
- suggested prompts based on the current surface
- draft text, prep changes, quick stubs, Library proposals, or reviewable edits

Examples:

- `Who knows about the Iron Deed?`
- `Which threads are still loose from last session?`
- `What should I remember before prepping Session 15?`

#### Guide behavior

- Guide answers require citations when they make factual claims about canon.
- Guide can create or edit proposals and can apply low-risk working-state changes after GM review.
- Guide must not autonomously mutate canon.
- Canon changes require either explicit inline GM-reviewed commit or Approval Queue draft, depending on risk and provenance.
- Default scope is current Saga plus relevant World canon.
- Sibling Sagas are excluded unless a future explicit cross-Saga tool is added.
- Guide can be minimized without losing its current thread or draft state.

### Zone 5: Global Create

A scoped creation menu:

```text
+ Create
```

The menu should use labels, not only icons.

Recommended menu:

```text
New Thread
New Character
New Place
New Faction
New Artifact
New Lore Note
New Session
Import notes
New Saga
New World / Saga
```

#### Create rules

- Default creation scope is the active Saga.
- World-scoped creation must be explicit.
- New Session routes to Session Prep.
- New Saga routes to New Saga.
- New World / Saga routes to New Saga with create-new-World path.
- Unsupported imports must be disabled or absent.
- AI must not auto-run from the create menu unless the GM explicitly selects an AI-assisted path.

### Zone 6: Current session pill

The current session pill is the fastest route into prep, Stage, or Review.

Examples:

```text
No session planned
Session 12 · Prepping
Session 12 · Ready
Session 12 · Active
Session 12 · Review ready
```

#### Click behavior

| Pill state | Route |
|---|---|
| No session planned | Sessions or New Session. |
| Planned / Prepping | Prepare. |
| Ready | Stage preview, with option to return to Prep. |
| Started | Stage. |
| In progress | Stage. |
| Ended pending undo | Stage undo state. |
| Review ready | Review / Approval Queue. |
| Pipeline pending | Session pipeline status. |

When a session is `started`, `in_progress`, or `ended_pending_undo` and the GM is viewing Sanctum, the current session pill expands or pairs with a high-visibility `Return to Stage` affordance near the top-right controls. Use Amber/Amber-light for return-to-live guidance and reserve Rust for recording, blocked, or destructive states.

### Zone 7: Review badge

Displays pending review count:

```text
Review 8
```

Behavior:

- Opens Approval Queue.
- Badge can show low-confidence or conflict warning states.
- Should remain visible when review is pending.

### Zone 8: Usage / quota chip

Only visible when relevant.

Examples:

```text
Usage 72%
AI credits low
Storage near limit
Transcription limit reached
```

Behavior:

- Opens Settings → Usage.
- Explains what is blocked.
- Manual workflows remain available where allowed.

### Zone 9: Account menu

Contains:

- Account
- Preferences
- Settings
- Sign out

Avoid placing primary product navigation here.

---

## 4. Left navigation rail

## 4.1 Purpose

The left rail answers:

> What kind of work am I doing?

It should stay stable, short, and task-oriented. It should not list every entity type.

Recommended rail:

```text
Home
Threads
Library
Prepare
Sessions
Review

Export
Settings
```

---

## 5. Left rail destinations

## 5.1 Home

Home is the active Saga cockpit.

Owns:

- active Saga title and summary
- next action
- current session state
- inline prep when session is planned or ready
- Threads carry-forward
- pending Review summary
- recently edited canon
- quick create
- small usage or pipeline warnings when relevant

Home must not become:

- a generic Workspace analytics dashboard
- a full World overview
- a billing console
- an AI chat dashboard

### Primary Home states

| State | Primary CTA |
|---|---|
| Empty Saga | Plan first session / Create first canon record. |
| No sessions | Plan your first session. |
| Planned session | Continue prep. |
| Ready session | Open in Stage. |
| In-progress session | Resume Stage. |
| Review ready | Open Review. |
| Review complete, no next session | Plan next session. |

## 5.2 Threads

Threads are the continuity spine.

Owns:

- thread list
- active / loose / dormant / resolved filters
- thread detail
- objectives log
- related entities
- session appearances
- read-only Thread Timeline
- GM-invoked thread complication proposals

Recommended Threads subnav:

```text
All Threads
Active
Loose
Dormant
Resolved
Timeline
```

### Thread meaning

Threads represent:

- quests
- story arcs
- mysteries
- unresolved consequences
- political tensions
- character arcs
- loose obligations
- active dramatic pressure

Thread Timeline is allowed in MVP only as a read-only derived view. It is not a writable timeline editor.

## 5.3 Library

Library is the main worldbuilding and canon editor.

Use **Library**, not **Entities**, as the left rail label because this area contains more than typed entities.

Owns:

- Characters
- Places
- Factions
- Artifacts
- Lore
- Notes
- Sources
- Archives
- future relationship views
- future broader timeline views
- future map views if promoted

Recommended Library subnav:

```text
All
Characters
Places
Factions
Artifacts
Lore
Notes
Sources
Archived

Future:
Relationships
Timeline
Maps
```

### Library behavior

- Uses master-detail layout.
- Supports filters, search, archive state, scope chips, source/provenance, relationships/backlinks.
- Regular edits autosave.
- Hard delete is hidden behind archive and confirmation.
- Stub records can later be fleshed out from session evidence.

### Notes and lore

Notes should not be a primary top-level rail item. They live in Library and are contextual to entities, threads, sessions, or sources.

## 5.4 Sessions

Sessions is the session lifecycle manager.

Owns:

- all sessions
- planned sessions
- ready sessions
- active/in-progress status
- ended sessions
- Prepare entry
- transcript / pipeline state
- session review entry
- manual summary fallback
- session settings

Recommended Sessions subnav:

```text
All Sessions
Planned
Ready
Ended
Pipeline
```

### Prepare routing

Prepare is the primary left-rail route for the active or next planned session's prep workspace.

Prepare is also reached from:

- Home primary CTA
- current session pill
- Sessions list
- Plan Session 1
- Approval Queue completion
- Stage return before session is in progress

Prepare is not a third product surface; it is a Sanctum workflow and uses the Sanctum shell, palette, and source/provenance rules.

## 5.5 Stage

Stage is the live-session surface. It is not a default left-rail destination.

Owns:

- ready preview
- start session
- consent gate
- live agenda
- pinned cards
- search during play
- quick capture
- quick stub
- recording
- Mark Moment
- dice
- End Session
- undo banner
- optional one-line summary
- pipeline queued transition

Stage state behavior:

```text
No ready session → Prep a session first
Ready session → Stage preview
Started → Stage shell
In progress → Live Stage
Ended pending undo → Undo surface
Ended → Pipeline queued / return to Review
```

AI is dormant on Stage unless the GM explicitly invokes Search or Relic Guide. Do not include proactive suggestions, live transcript panel, encounter tracker, VTT, tactical map, or player controls.

Stage access is contextual. It opens from Prepare after `Ready for Stage`, from the current session pill when a session is ready or live, from Home next-action cards, from notifications/deep links, from app/crash resume, or from the top-right `Return to Stage` affordance during a live session.

## 5.6 Review

Review is the trust surface.

Owns:

- Approval Queue
- session pipeline results
- proposed canon changes
- draft grouping
- diff/editor
- source/provenance dock
- approve
- edit and approve
- reject
- merge
- archive request
- conflict resolution
- broken source handling
- stale proposal cleanup

Review must make clear:

- AI output is not canon.
- Import/session/pipeline outputs are not canon.
- Canon changes happen only through explicit GM approval or documented direct GM action.
- Prominent Approve All is not allowed.

## 5.7 Export

Export is a low-rail utility surface.

Owns:

- Markdown export
- JSON export
- export request
- export processing
- export ready
- export expired
- export failed

Export could also appear inside Settings, but keeping it visible in the rail supports user trust and data ownership.

## 5.8 Settings

Settings owns configuration and usage.

Recommended Settings subnav:

```text
Saga
World
Workspace
Usage
Retention
Notifications
Export
Account
```

### Settings boundaries

| Section | Owns |
|---|---|
| Saga | Saga name, game system, GM profile override, retention defaults, delete/archive Saga. |
| World | World name, summary, default game system, lightweight setting context. |
| Workspace | usage, ownership, future billing/collaboration boundary. |
| Usage | AI credits, transcription, storage, imports/exports, caps, reset timing. |
| Retention | audio, transcript, export retention. |
| Notifications | pipeline and review notification preferences. |
| Export | export lifecycle if not using left-rail Export. |
| Account | sign out and account-level basics. |

Do not include BYOK, local model settings, full billing, co-GM collaboration, player permissions, custom calendars, plugin marketplace, or image generation in MVP.

---

## 6. Creation paths

Creation should happen in three places.

## 6.1 Global create menu

The top-bar `+ Create` supports creation from anywhere.

Recommended items:

```text
New Thread
New Character
New Place
New Faction
New Artifact
New Lore Note
New Session
Import notes
New Saga
New World / Saga
```

## 6.2 Contextual create buttons

Each section has local create actions:

| Surface | Local action |
|---|---|
| Threads | New Thread |
| Library | New Character / Place / Faction / Artifact / Lore Note |
| Sessions | New Session |
| Prepare | Add pinned entity / Create quick stub |
| Stage | Quick Capture / Quick Stub |
| Review | No create-first behavior; review actions dominate. |

## 6.3 Dashboard quick create

Dashboard quick create should be shorter and momentum-oriented:

```text
+ Thread
+ Character
+ Place
+ Note
+ Session
```

It should not include every possible action. It helps the GM capture the next thought without navigating away.

---

## 7. World and Saga management

## 7.1 Do not add Worlds and Sagas as primary left rail items

Worlds and Sagas are scope containers, not ordinary work surfaces. They belong primarily in the top context switcher and Settings.

## 7.2 World management

Accessible from top switcher and Settings.

Potential World page/section:

```text
World Overview
World Canon Summary
World Lore
World-level Entities
World Settings
Sagas in this World
New Saga
Archive World
```

MVP should keep World management lightweight.

## 7.3 Saga management

Accessible from top switcher and Settings.

Potential Saga page/section:

```text
Saga Overview
Saga Settings
Game system
GM profile override
Retention
Entity count / health
Delete / archive Saga
Export Saga
```

The active Saga dashboard remains Home. Saga settings should not replace Home.

---

## 8. Search and Ask navigation

Search and Relic Guide are related but distinct.

## 8.1 Search

Search is for finding.

Outputs:

- entities
- Threads
- Sessions
- notes
- sources
- command actions
- quick stub option when no result

Search belongs in the top context bar and should be globally available.

## 8.2 Relic Guide

Relic Guide is for answering and acting with GM control.

Outputs:

- canon-grounded answer
- citations
- source drawer
- linked records
- no-answer state
- proposed edits
- prep insertions
- quick stubs
- reviewable canon drafts

Relic Guide is:

- an always-available collapsible sidecar/sheet
- a surface-aware action assistant
- a cited answer surface
- a draft/proposal generator
- a GM-reviewed editing aid

Relic Guide is not:

- a permanent chatbot column
- a left rail destination by default
- an autonomous canon-writing surface
- an answer-to-canon tool without GM review

---

## 9. Stage navigation

Stage does not appear in the default left rail. The rail exposes `Prepare`; Stage opens from the prep/live-session workflow.

Stage is reachable from:

- current session pill
- Ready for Stage panel
- Open Stage button
- Home next action
- direct Stage route
- notification/deep link
- app/crash resume
- top-right `Return to Stage` affordance while a session is live

Stage should preserve session context and avoid deep branching.

Stage routes/states:

```text
Stage / no ready session → open Prepare
Stage / ready preview
Stage / started
Stage / in progress
Stage / ended pending undo
Stage / pipeline queued
```

---

## 10. Future navigation reserves

## 10.1 Timeline

Short term:

```text
Threads → Timeline
```

This is MVP-safe only as a read-only Thread Timeline.

Future possible placements:

```text
Library → Timeline
World → Timeline
Saga → Timeline
```

Do not promote Timeline to the primary left rail unless it becomes a daily-use work surface.

## 10.2 Relationships

Short term:

```text
Entity Detail → Relationships panel
Thread Detail → Related entities
Library → Relationships, future
```

Do not promote relationship graph to primary navigation in MVP.

Future possible placement:

```text
Library → Relationships
```

## 10.3 Maps

Future only:

```text
Library → Maps
World → Maps
```

Do not include Maps in MVP navigation.

## 10.4 Player publishing

Future only:

```text
Publish
Player Wiki
Share Recap
```

Do not include these in MVP navigation.

---

## 11. Full navigation tree

```text
App
├─ Top Bar
│  ├─ Relic / Home
│  ├─ Workspace switcher
│  │  ├─ Workspace settings
│  │  └─ Usage
│  ├─ World switcher
│  │  ├─ Switch World
│  │  ├─ World overview
│  │  ├─ Edit World
│  │  ├─ World settings
│  │  └─ New World / Saga
│  ├─ Saga switcher
│  │  ├─ Switch Saga
│  │  ├─ Resume saga creation
│  │  ├─ New Saga in this World
│  │  └─ Saga settings
│  ├─ Search
│  │  ├─ Find results
│  │  └─ Create stub from no result
│  ├─ Relic Guide
│  │  ├─ Cited answer
│  │  ├─ Suggested prompts
│  │  ├─ Draft proposal
│  │  ├─ Inline reviewed edit
│  │  └─ Approval Queue draft
│  ├─ + Create
│  │  ├─ Thread
│  │  ├─ Character
│  │  ├─ Place
│  │  ├─ Faction
│  │  ├─ Artifact
│  │  ├─ Lore Note
│  │  ├─ Session
│  │  ├─ Import notes
│  │  ├─ New Saga
│  │  └─ New World / Saga
│  ├─ Current session pill
│  │  ├─ Plan session
│  │  ├─ Continue prep
│  │  ├─ Open Stage
│  │  ├─ Resume Stage
│  │  └─ Open Review
│  ├─ Review badge
│  ├─ Usage chip
│  └─ Account menu
│
├─ Left Rail
│  ├─ Home
│  ├─ Threads
│  ├─ Library
│  ├─ Prepare
│  ├─ Sessions
│  ├─ Review
│  ├─ Export
│  └─ Settings
│
├─ Home
│  ├─ Next action
│  ├─ Current session state
│  ├─ Inline prep summary when planned/ready
│  ├─ Threads carry-forward
│  ├─ Pending Review
│  ├─ Recent canon
│  └─ Quick create
│
├─ Threads
│  ├─ All
│  ├─ Active
│  ├─ Loose
│  ├─ Dormant
│  ├─ Resolved
│  ├─ Thread detail
│  ├─ Objectives log
│  └─ Read-only Thread Timeline
│
├─ Library
│  ├─ All
│  ├─ Characters
│  ├─ Places
│  ├─ Factions
│  ├─ Artifacts
│  ├─ Lore
│  ├─ Notes
│  ├─ Sources
│  ├─ Archived
│  ├─ Future: Relationships
│  ├─ Future: Timeline
│  └─ Future: Maps
│
├─ Sessions
│  ├─ All Sessions
│  ├─ Planned
│  ├─ Ready
│  ├─ Ended
│  ├─ Pipeline
│  ├─ Prepare
│  ├─ Session Review
│  └─ Transcript / summary
│
├─ Stage
│  ├─ No ready session
│  ├─ Ready preview
│  ├─ Started
│  ├─ In progress
│  ├─ Recording
│  ├─ Search
│  ├─ Quick Capture
│  ├─ Quick Stub
│  ├─ Dice
│  └─ End Session
│
├─ Review
│  ├─ Queue
│  ├─ Draft detail
│  ├─ Diff/editor
│  ├─ Source dock
│  ├─ Conflict panel
│  ├─ Approve
│  ├─ Edit and approve
│  ├─ Reject
│  ├─ Merge
│  └─ Archive request
│
├─ Export
│  ├─ Markdown
│  ├─ JSON
│  ├─ Requested
│  ├─ Processing
│  ├─ Ready
│  ├─ Expired
│  └─ Failed
│
└─ Settings
   ├─ Saga
   ├─ World
   ├─ Workspace
   ├─ Usage
   ├─ Retention
   ├─ Notifications
   ├─ Export
   └─ Account
```

---

## 12. MVP exclusions from navigation

Do not add navigation for:

- initiative tracking
- encounter tracking
- VTT integration
- relationship graph
- writable timeline editor
- full map editor
- player wiki
- per-player permissions
- real-time transcription
- speaker diarization
- BYOK UI
- local model settings
- image generation
- collaborative co-GM editing
- custom calendars

These may appear in V1 parking-lot documentation only.

---

## 13. Navigation review checklist

Use this checklist when reviewing wireframes or implementation:

- Is the active Workspace / World / Saga visible?
- Is the dashboard focused on the active Saga rather than Workspace analytics?
- Are Threads top-level and visually treated as the continuity spine?
- Does Library contain entity types, notes, sources, and future relationship/timeline reserves?
- Is Prepare in the left rail and visibly a Sanctum workflow?
- Is Stage absent from the default left rail and reachable from prep/live-session context?
- Does a live session show a high-visibility `Return to Stage` affordance in Sanctum?
- Is Review clearly available when drafts are pending?
- Is Search in the top bar?
- Is Relic Guide always available, collapsible, and absent from the primary left rail?
- Do Relic Guide create/edit actions require inline GM review or Approval Queue before canon mutation?
- Is global create scoped and type-specific?
- Are World and Saga management handled through the switcher and Settings?
- Are timeline and relationships reserved without becoming MVP primary nav?
- Are MVP exclusions absent from primary navigation?
- Are canon-mutating actions gated by GM approval or direct GM action?
- Are manual workflows available when AI/quota fails?

---

## 14. Claude Design prompt

```text
Design Relic's web app navigation system. Use a top context bar for Relic/Home, Workspace/World/Saga switcher, Search, Relic Guide toggle, + Create, current session pill, Review badge, Usage chip, and Account menu. Use a left rail for primary work surfaces: Home, Threads, Library, Prepare, Sessions, Review, Export, Settings. Home is the active Saga cockpit, not a Workspace overview. Threads are the continuity spine. Library contains Characters, Places, Factions, Artifacts, Lore, Notes, Sources, Archived, and future reserves for Relationships/Timeline/Maps. Prepare is the Sanctum workflow for the active or next planned session and is the bridge to Stage. Stage is a contextual live-session surface reached from Prepare, current session pill, Home next-action cards, notifications/deep links, app resume, and a bright Return to Stage affordance while live. Review is the trust surface where drafts become canon by explicit GM action. Relic Guide is always available as a collapsible sidecar/sheet, can answer with citations and prepare create/edit actions, and cannot mutate canon without inline GM review or Approval Queue. Preserve MVP exclusions and do not add initiative, encounters, VTT, player wiki, full graph, writable timeline, maps, BYOK, local models, image generation, custom calendars, or co-GM features.
```
