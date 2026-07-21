---
status: active
authority: secondary
scope: mvp
read_after:
  - "[[00 - Start Here]]"
depends_on:
  - "[[00 - Start Here]]"
supersedes: []
last_audited: 2026-07-21
source_file: "Sourced - Downloaded - 260518/relic-sanctum-ux-flow-v0_2.md"
---

> [!info] How to use this spec
> Owns: Sanctum IA, dashboard, embedded session prep, Threads, Relic Guide, Review, and settings UX.
> Does not own: Historical rationale and superseded naming unless explicitly retained as an internal identifier.
> Read next: [[00 - Start Here]]
> Implementation-critical note: Treat this as coding input only after reading the authority order in [[00 - Start Here]].
# Relic — Sanctum UX Flow v0.2

**Source of truth:** [[11 - Product Basepoint]] · [[12 - MVP PRD]] · [[20 - Entity and Canon Schema]] · [[24 - Approval Queue]] · [[22 - Memory and Retrieval]] · [[23 - AI Task Registry]] · [[21 - Tech Architecture]] · [[31 - Session Prep Flow]] · [[13 - Design System]]
**Status:** Active Sanctum UX specification. Replaces v0.1. Sister doc to Stage UX Flow v0.6.
**Scope:** MVP (P0). The Sanctum is the GM's home-base surface on web and mobile — literary, modern, relaxing, and focused on worldbuilding, session prep, review, approval, settings, and canon management.

---

## Changelog

**Citation context and drift patch (July 2026).** Session Review and Approval Queue now expose every synthesis citation as a keyboard-operable evidence disclosure, with timestamped transcript anchors, frozen/current/deleted drift context, untimestamped manual evidence, and safe non-identifying fallback states.

**Manual Session evidence patch (July 2026).** Session Review now accepts pasted notes and a GM manual summary as explicit evidence inputs, preserves unsaved text locally through refresh/save failure, and shows saved immutable sources separately from the editable local forms. Saving evidence does not start synthesis or create canon.

**Priority 3 continuity architecture patch (May 2026).** Sanctum now presents the active Workspace / World / Saga hierarchy. The GM works mostly at Saga level, but the shell must preserve World context, expose World/Saga switching, distinguish World canon from Saga canon where relevant, and reserve Era/timeframe fields without shipping an Era editor. New Saga can reuse an existing World or create one behind the scenes.

**v0.2 (May 2026).** Five targeted revisions from Basepoint v3.4 and the master flow interrogation:

1. **§2.1 Theme revised.** Cream surface retired as a mode differentiator. Session-prep areas within the Sanctum use Amber-forward accents and Verdigris thread-state signals to visually distinguish prep context within the Parchment frame. Stage dark treatment is unchanged. Specific token changes called out in §2.1.

2. **§2.2 Navigation revised.** The web shell follows [[72 - Navigation Design Spec]]: the left rail uses `Home`, `Threads`, `Library`, `Prepare`, `Sessions`, `Review`, with `Export` and `Settings` lower in the rail. `Notes` moves to a sub-section of `Library`. `Prepare` routes to the active or next planned session prep workspace. `Sessions` remains the index/lifecycle manager. Stage is reached from Prepare, session state, Home cards, notifications/deep links, app resume, and a bright Return to Stage affordance while live. Mobile shows Stage in bottom navigation only when a session is ready/live.

3. **§3 Dashboard revised.** The Sanctum home page is session-state-aware. When a session is `planned` or `ready`, the home page renders an inline session-prep workspace (briefing, agenda preview, thread carry-forward, Ready for Stage CTA) as the primary content area, not just a CTA pointing elsewhere. The continuity card pattern is retained for states where no active session exists.

4. **§4 Threads surface added (new).** Thread library with list view (by resolution state) and Timeline view (read-only, derived from `objectives_log` + `canon_audit`). Thread detail page gains `Propose a complication` AI button (Registry v1.0 §8). Both views ship in MVP.

5. **§6.3 Creative AI tasks added.** Session prep editor adds `Brainstorm scene beats` button (Registry v1.0 §7) and `Draft an NPC for this scene` button (Registry v1.0 §9). Entity creation adds `propose_npc_for_scene` as an entry point. Relic Guide uses the `answer_saga_question` contract for cited answers and can prepare GM-reviewed create/edit actions. Stub entity detail page gains `Flesh out from session evidence` button (Registry v1.0 §11).

6. **§2.4 Saga creation flow updated.** Saga Creation references updated to "New saga" flow with help-level choice. No-AI path removed. Resumable saga-creation session wording updated.

No changes to Approval Queue surface (§8), Search (§9), Imports (§10), Sessions index (§11), Saga settings (§12), Permission separation (§14), or Acceptance criteria (§19). Those sections are carried forward verbatim from v0.1.

---

## 0. How to read this

The Sanctum is the GM's home base. When there is no live session — which is most of the time — the GM is here. It handles: saga creation, the dashboard, entity management, thread tracking, session prep, post-session review, approval queue, settings, and export. The web app is built first, then the mobile app adapts the same Sanctum capabilities to smaller screens.

The section order:

1. Premise & principles
2. Theme, navigation, top-level IA
3. Saga dashboard (state-aware home)
4. **Threads surface — new in v0.2** (list + timeline)
5. Library (browse, filter, search)
6. Entity detail (view, edit, link, archive)
7. Entity creation (manual, AI-drafted, creative)
8. Notes (lore, gm_note, summary)
9. Approval Queue surface
10. Search & Relic Guide
11. Imports
12. Sessions index & post-session review entry
13. Saga settings
14. Permission-safe GM/player separation
15. Maps (V1 placeholder)
16. Cross-cutting: AI surfaces, failure UX, mobile reduction
17. Acceptance criteria

Requirement IDs from PRD are referenced inline. Requirements introduced in v0.1 are `SNC-FR-1` through `SNC-FR-30`. New requirements in v0.2 are `SNC-FR-31` onward.

---

## 1. Premise

The Sanctum is the home base for the active World and Saga. Session prep lives here. Entity management lives here. The approval queue lives here. Its tone is literary, modern, and relaxing. The Stage is the clean, focused live-session surface. Both surfaces exist on web and mobile.

**Four rules (unchanged from v0.1):**

1. **Literary, modern, relaxing.** Parchment surface, generous whitespace, Cormorant for names, Instrument Sans for UI.
2. **The GM is the author.** AI is available on demand across creative and editorial domains. AI never writes to canon without GM approval.
3. **Reach in two clicks.** Global search from any screen. Every active-Saga entity reachable in ≤2 clicks from the dashboard; relevant World canon is one filter away.
4. **Autosave with visible state.** No Save button. The GM types, the database settles.

**v0.2 addition — AI invocation rule:** AI is GM-controlled. Relic Guide is always available as a collapsible sidecar/sheet, and many explicit AI buttons exist. None push themselves or mutate canon autonomously. This applies equally to scene beat brainstorming, NPC drafting, session summarization, Guide answers, and Guide create/edit actions.

---

## 2. Theme, navigation, top-level IA

### 2.1 Theme

**v0.2 change: Cream surface retired as a mode differentiator.**

| Surface | Background | Accents |
|---|---|---|
| **Sanctum** | Parchment `#EFEBE4` with noise overlay | Literary, modern, relaxing. Cream `#F7F4EF` for card surfaces. |
| **Session prep area (inline within Sanctum)** | Parchment `#EFEBE4` — same as default | **Amber-forward:** prep action CTAs, agenda field left-rules, Ready for Stage button all use Amber `#B8702A`. Thread-state chips use Verdigris `#2F6B6E` (active), Amber (loose), Stone (dormant), Stone muted (resolved). |
| **Stage** | Ink `#1A1916` | Clean and focused. Cream foreground, Amber action state, Rust recording state. |

**Why:** session prep workspace as a mode (with its own Cream surface) implied a mode-switch the GM had to consciously make. Session prep is not a separate mode — it is what the GM does *within* the Sanctum when a session is upcoming. Amber density does the work of visual differentiation without requiring a separate palette. The GM does not have to "go to session prep workspace"; they are already home.

**Design system tokens needed for v0.2:**

- `sanctum-prep-cta` — Amber `#B8702A`, used for all prep-forward CTAs (Ready for Stage, Draft session prep, Save prep).
- `thread-active-chip` — Verdigris `#2F6B6E` bg `verdigris-dim`, used for `resolution_state='active'` thread chips.
- `thread-loose-chip` — Amber `#B8702A` bg `amber-dim`, used for `is_loose_thread=true` chips.
- `thread-dormant-chip` — Stone-300 bg stone-100, used for `resolution_state='dormant'`.
- `thread-resolved-chip` — Stone muted, used for `resolution_state='resolved'` or `'failed'`.

**Remove:** `session-prep-surface`, `session-prep-cta-primary` tokens referenced in PRD v0.8. These are superseded by `sanctum-prep-cta` and the standard Sanctum palette.

### 2.2 Top-level navigation (web)

**Navigation patch: align with [[72 - Navigation Design Spec]]. Threads remain first-class, Notes are absorbed into Library, Search belongs in the top bar, Relic Guide is always available as a collapsible sidecar/sheet, Prepare replaces Stage in the left rail, and Stage is entered only from prep/live-session context.**

```
Relic   [Workspace / World / Saga ▾]   [Search]   [Guide]   [+ Create]   [Session 15]   [Review 8]   [Usage]   [GM]

Home
Threads
Library
Prepare
Sessions
Review

Export
Settings
```

| Link | Routes to | Change from v0.1 |
|---|---|---|
| **Home** | Active Saga dashboard (§3) | Active Saga cockpit. |
| **Threads** | Thread library (§4) | **New position — first in nav.** Threads are the continuity spine. |
| **Library** | Library (§5) | Replaces user-facing `Entities` rail label. Notes, sources, and entity types live here. |
| **Prepare** | Active/next session prep workspace (§3.2 and [[31 - Session Prep Flow]]) | Primary prep bridge to Stage. |
| **Sessions** | Sessions index (§12) | Lifecycle list and historical sessions. |
| **Review** | Approval Queue (§9) | Badge with pending count. Unchanged. |
| **Export** | Export lifecycle | Low-rail utility. |
| **Settings** | Saga/World/Workspace settings | Low-rail utility. |

**Search/Guide:** Search is a top-bar affordance. Relic Guide is always available as a collapsible sidecar/sheet and can answer with citations, draft, create, and edit through GM-reviewed actions. It is not a left-rail item.

**Stage access:** Stage is not a default rail item. It is reached through Prepare after `Ready for Stage`, current session pill, Home next-action cards, notifications/deep links, app/crash resume, and the top-right `Return to Stage` affordance while a session is live.

**Notes:** no longer a separate nav link. Lore notes, GM notes, summaries, and sources are accessible from within the Library (`Library → Notes` sub-section). Notes usage is contextual — GMs access a lore note by navigating to the Library record or surface it is attached to, not from a top-level Notes inbox.

**The session pill** (top-right) shows the active or most-recent-prepped session and routes:
- `in_progress` → Stage, with `Return to Stage` visible throughout Sanctum.
- `ready` → Stage preview or Prepare, depending on the last context.
- `planned` (with prep started) → Prepare (§3.2).
- No active session → Sessions index, pre-filtered to Planned + Ready.

Copy adapts: `Session 15 · Prepping` (planned/started), `Session 15 · Ready` (ready), `Session 14 · Active` (in_progress).

**V1 nav reserve:** Maps gets a nav slot in V1. Not present in MVP.

### 2.3 Top-level navigation (mobile)

**v0.2 change: Bottom tab bar simplified to two tabs.**

- **Bottom tab bar:** Sanctum by default; Stage appears only while a session is `ready`, `started`, `in_progress`, or `ended_pending_undo`.
- Inside Sanctum on mobile: a scrollable top tab strip or section links: `Home · Search · Guide · Threads · Library · Prepare · Sessions · Review`.
- Session prep is reached from the Sanctum home (the inline prep workspace) or from `Sessions` → tap session row → Open prep.

`SNC-FR-1` (updated) — Mobile Sanctum supports: state-aware dashboard (including inline session prep workspace), thread library (list view), thread detail, Library browse/filter/search, Library detail edit (single-pane), note view/edit, approval queue review (one-pane per AQ-FR-13), Search, Relic Guide sheet, session index, World/Saga switcher. Mobile defers: thread timeline view (web-preferred, accessible but not optimized), two-pane diff, saga export, transcript segment editor, advanced import workflows.

### 2.4 World/Saga switcher

The `GM` avatar or header World/Saga controls reveal the switcher:

```
World: Thornwood ▾
  [ ●  The Thornwood Accord       12 saga entities · last session 6d ago ]
  [ ○  The Salt Empire            48 saga entities · last session 14d ago ]
  [ ○  (Saga creation in progress)  Resume →                        ]
  [ + New saga in this World ]
[ + New World / Saga ]
```

**v0.2 change:** "Saga Creation in progress" renamed to "Saga creation in progress." `+ New saga` routes to the new-saga flow and asks whether to reuse the current World or create a new one when needed (help-level choice: Build with AI / Bring your notes / Start blank) per Basepoint §6. A saga-creation session in `state='in_progress'` renders as a resumable row — the conversational state (internally still `workshop_sessions`) persists per PRD edge cases. User-facing label is "Saga creation", not "Saga Creation."

---

## 3. World/Saga dashboard — state-aware home

**v0.2 change: The dashboard is session-state-aware. When a session is in-prep, the home page IS the prep workspace, not just a pointer to it.**

### 3.1 When the dashboard renders and what it shows

The Sanctum URL `/workspace/<workspace_id>/world/<world_id>/saga/<saga_id>` renders the dashboard. The content of the home area changes based on session state.

| Active Saga state | Home area renders |
|---|---|
| **No sessions yet** (just created) | Welcome card: "Plan your first session" + `+ New session` CTA. Saga stats below. |
| **Session `planned` or `ready`** | **Inline Prepare workspace** — the briefing, agenda preview, thread carry-forward, and Ready for Stage/Open Stage CTA (§3.2). This is the primary content. Saga stats are accessible by scrolling. |
| **Session `in_progress`** | "Session in progress" status card with session title + duration + `Return to Stage` as the prominent top-right and card CTA. |
| **Session `ended`, pipeline pending** | Review card: "Session N ended — review ready · X items" with `Open Review` CTA. Below it: `+ New session` secondary CTA. |
| **Session `ended`, pipeline complete, no new session** | "Last session reviewed" summary card + `+ Plan next session` CTA. |
| **No sessions at all, blank saga** | Empty state with `+ New session` and `Import notes` CTAs. Continuity nudges surface once the GM has ≥1 entity. |

This replaces v0.1's single Continuity card. The card pattern is retained but the content becomes a richer prep workspace when there's active prep.

### 3.2 Inline session prep workspace (when session is `planned` or `ready`)

This is the "session prep workspace" work — surfaced directly on the Sanctum home rather than behind a separate nav.

```
┌─ Session 15 — The Iron Cost  ◇ ready      [ ⋮ ] ──────────────────--──┐
│                                                                       │
│ ┌── Briefing ──────────────────────────────────────────────────────┐  │
│ │ Composing briefing…   ░░░░░░░░░░░░░░░░░░░░░░░░░░     [Refresh]   │  │
│ │                                                                  │  │
│ │ At the end of Session 14, the Pale Broker was confirmed active…  │  │
│ │ ·  Seraphine holds the Iron Deed                                 │  │
│ │ ·  Thornwood Accord remains in negotiation                       │  │
│ │ ·  The orphan's aunt thread is loose                             │  │
│ │                              Composed 09:15 · 4 sources [view]   │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│ ┌── Threads carry-forward ─────────────────────────────────────────┐  │
│ │ ◆ active  Thornwood Accord                        [Open thread]  │  │
│ │ ◆ active  The Pale Broker                         [Open thread]  │  │
│ │ ◆ loose   The orphan's aunt                       [Open thread]  │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│ ┌── Agenda ────────────────────────────────────────────────────────┐  │
│ │ Objective   [The party confronts the Pale Broker at the docks   ]│  │
│ │ Opening     [Midnight at the dockside warehouse. Fog.           ]│  │
│ │ Scene notes [Seraphine is waiting. She has the Deed.            ]│  │
│ │                                                                  │  │
│ │ [AI: Draft this session]  [Brainstorm beats]  [Draft an NPC]     │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│ ┌── Pinned entities (4) ───────────────── [ + Add · Relic Guide ]  ┐  │
│ │ ▣ Seraphine Valdrus  ▣ The Pale Broker  ▣ Bren Holst (stub)      │  │
│ │ ▣ The Iron Deed                                                  │  │
│ └──────────────────────────────────────────────────────────────────┘  │
│                                                                       │
│ Checklist  [ ] Meet with Seraphine before the confrontation?          │
│            [ ] What does the Broker want if not the Deed?             │
│            [+] Add item                                               │
│                                                                       │
│ ───────────────────────────────────────────────────────────────────── │
│ [ Open full editor ]            [ Ready for Stage → ]   (amber CTA)   │
└───────────────────────────────────────────────────────────────────────┘
```

**Notes:**
- `Open full editor` navigates to `/saga/<id>/sessions/<id>/prep` — the full-page session editor with more room. For quick edits, the home workspace is sufficient. For detailed prep, the full editor is one click.
- `Ready for Stage` (amber, Basepoint §5) transitions `planned` → `ready`. The Prepare workspace updates its header chip to `◇ ready` and the CTA becomes `Open in Stage →`.
- `AI: Draft this session` is `generate_session_prep` (GM-invoked, Registry v1.0 §4).
- `Brainstorm beats` is `propose_scene_beats` (Registry v1.0 §7).
- `Draft an NPC` is `propose_npc_for_scene` (Registry v1.0 §9).
- The briefing auto-runs (`compose_prep_briefing`, Registry v1.0 §5) but streams visibly. The "Composed HH:MM · N sources [view]" stamp makes generation visible.
- Thread carry-forward is sourced from the database directly (all `active` and `loose` threads for this saga) — no AI task, no quota.

`SNC-FR-31` — The inline prep workspace on the dashboard is a read/write surface. The GM can edit agenda fields inline (autosave per `ENT-FR-9`). Edits made here are identical to edits made in the full editor. There is no sync step.

`SNC-FR-32` — When `sessions.pending_prep_suggestions` contains accepted suggestions (from a previous `generate_session_prep` run), the agenda fields show the accepted values. The GM sees what was accepted, not a separate "pending" state. The full editor page shows the full suggestion history.

### 3.3 First-time post-creation card

On first dashboard load after saga creation (any help-level path), an Amber-bordered card prompts the first session:

```
┌─ Your saga is ready ──────────────────────────────────┐
│ Plan your first session to get to the table.           │
│                                                        │
│ [ + Plan Session 1 → ]       [ Open Prepare ]          │
└────────────────────────────────────────────────────────┘
```

`SNC-FR-3` (updated) — Shown until either CTA is tapped or the GM dismisses via `×`. Dismissal stored on `gm_profiles.session_prep_intro_dismissed_at` (field name retained despite session prep workspace rename; it tracks "post-creation tour dismissed").

The copy no longer mentions "Saga Creation" (retired user-facing name). Session 1 creation opens the session editor directly (not a separate "session prep workspace" entry).

### 3.4 Empty saga dashboard (Start Blank path)

If the GM chose Start Blank at creation, the home renders a friendly empty state:

```
┌──────────────────────────────────────────────────────┐
│ Your saga is empty.                                   │
│                                                       │
│ Start with a thread, a character, or a place.         │
│ Or bring in notes from a paste.                       │
│                                                       │
│ [ + New thread ]  [ + New character ]  [ Import ]     │
│                                                       │
│ Want a scaffold?  [ Build with AI → ]                 │
└──────────────────────────────────────────────────────┘
```

The `Build with AI →` CTA routes back to the saga-creation flow with this saga pre-selected, enabling the GM to scaffold later if they want.

`SNC-FR-3b` — Empty saga start-blank renders no continuity nudges (nothing to nudge about). Nudges surface once the GM has ≥3 entities.

### 3.5 Stale-pipeline banner

Unchanged from v0.1 §3.5. If any `pipeline_runs` row for this saga has `staleness_warned_at` set, a banner sits at the top of the dashboard above the home area content:

```
[ ⚠  Session 14 review has been waiting 32 days — Open Review · Re-run synthesis · Bulk archive ]
```

### 3.6 Continuity nudges (new in v0.2)

When the GM has ≥1 ended session and ≥5 entities, the dashboard home area shows a quiet Continuity strip below the session prep workspace (or below the post-session card when no prep is active):

```
┌── Your saga, at a glance ────────────────────────────┐
│ 3 stubs have session evidence — flesh them out        │
│ 2 entities untouched since Session 10                 │
│ 1 thread has been dormant for 3 sessions              │
└────────────────────────────────────────────────────────┘
```

Each row is tappable and routes to the relevant entity or thread detail.

`SNC-FR-33` — Continuity nudges are computed from the database only (no AI quota cost). Queries:
- Stubs with evidence: `entities WHERE is_stub=true` joined to `sources WHERE session_id IN (recent sessions)`.
- Untouched entities: `entities WHERE updated_at < now() - INTERVAL '3 sessions worth of time'` (approximate: use `ended_at` of the 3rd-most-recent ended session).
- Dormant threads: `threads WHERE resolution_state='dormant' AND updated_at < <3 sessions ago>`.

---

## 4. Threads surface

**New in v0.2. Threads are the continuity spine of the saga.**

### 4.1 Entry points

- `Threads` nav link (top nav, first position).
- Threads carry-forward section on the dashboard home (§3.2).
- Thread chip on entity detail (any entity linked to a thread via `session_active_threads` or `relationships`).
- Thread cards in the Approval Queue's Loose Threads group (links to thread detail).

### 4.2 Thread list view

```
┌─ Threads ──────────────────────────────────────── [ + New thread ] ──┐
│                                                                        │
│ [ All ] [ Active ] [ Loose ] [ Dormant ] [ Resolved ] [ Failed ]      │
│                                           [ List ▾ ] [ Timeline ]     │
│                                                                        │
│ ACTIVE (5)                                                             │
│ ◆ The Thornwood Accord   quest · 4 obj · last session S14             │
│   The Pale Broker attempts to seize the Iron Deed…                    │
│                                                                        │
│ ◆ The Pale Broker        mystery · 0 obj · last session S11           │
│   Speaks only through intermediaries…                                 │
│                                                                        │
│ ◆ House Kael's debt      political · 2 obj (1 done) · S13            │
│   Seraphine is owed a debt. Kael has not paid.                        │
│                                                                        │
│ LOOSE (3)                                                             │
│ ◈ The orphan's aunt      narrative · flagged by S14 review            │
│ ◈ Missing courier        narrative · flagged by S12 review            │
│                                                                        │
│ DORMANT (2) ──────────── [ show ] ────────────────────────────────    │
│ RESOLVED (4) ─────────── [ show ] ────────────────────────────────    │
└────────────────────────────────────────────────────────────────────────┘
```

`SNC-FR-34` — Default filter is `Active + Loose` combined. Dormant, Failed, and Resolved are distinct groups; Failed must not be folded into Resolved because its reason and recovery meaning differ.

`SNC-FR-35` — Thread rows show: name (Cormorant 18px), kind badge (mono), objective count (with completed), last-touched session number, and 2-line summary. Canon chip applies (`◆` amber dot for active, `◈` amber open-diamond for loose, `○` stone for dormant, `✓` Verdigris for resolved).

### 4.3 Thread timeline view

Toggle with the `[ Timeline ]` chip in the thread list header.

The timeline is a vertical session axis with threads as horizontal lanes. Each thread's state transitions (objective completion, resolution state change, loose flag, session-pin) are plotted as events at the session where they occurred.

```
              S11       S12       S13       S14       S15
              ──        ──        ──        ──        ─ ─
Thornwood     ●─────────────────────●────────●──────────   active
Accord         ↑ start              ↑ obj1    ↑ obj2

Pale Broker   ─────────●───────────────────────────────   active
                        ↑ start

House Kael    ─────────────●─────●─────────────────────   active
                            ↑     ↑ obj1 done
                            start

Orphan's aunt                              ◈──────────    loose
                                            ↑ flagged S14

Missing courier ●────────────────●─────────────────────  dormant
                 ↑ start          ↑ dormant S12
```

**What the dots and markers represent:**

| Symbol | Event |
|---|---|
| `●` | Thread created or first-active |
| `↑ obj1` | Objective N marked complete |
| `◈` | Flagged as loose thread |
| `○` | Went dormant |
| `✓` | Resolved |
| `✗` | Failed |

Hover (web) / tap (mobile) on any marker → tooltip showing the event summary and session name.

`SNC-FR-36` — The timeline is read-only. It is derived from current `threads.objectives_log`, append-only `canon_audit` Thread operations, their source/Session links, `session_active_threads`, Thread rows in `session_pinned_entities`, and Sessions. Objective create/edit/reorder/complete/reopen operations are audited so earlier transitions remain visible after the current JSON objective state changes. No timeline-event schema, AI task, or quota cost is introduced. Every entry exposes its evidence kind and source/audit identifier; missing or deleted related records render as unavailable rather than breaking the projection.

`SNC-FR-37` — Timeline is rendered client-side from data fetched in one query. The query joins `threads`, `sessions`, `objectives_log` (jsonb), and `canon_audit` for the saga. Performance budget: <300ms p50 for a 15-session saga with 20 threads.

`SNC-FR-38` — On mobile, the timeline renders as a horizontal scroll (session axis is horizontal, threads are rows). The list view is the default on mobile; timeline is behind the chip toggle.

### 4.4 Thread detail

Each thread detail page extends the standard entity detail layout (§6) with thread-specific sections.

```
┌─ Thread detail ─────────────────────────────── [⋮ actions] ──────────┐
│ ◀ Threads                                                              │
│                                                                        │
│ The Thornwood Accord                              quest · active       │
│  ── The Pale Broker attempts to seize the Iron Deed...                 │
│                                                                        │
│ ┌── Narrative ──────────────────┐  ┌── State ─────────────────────┐  │
│ │                               │  │ Resolution   active            │  │
│ │ The Thornwood Accord began…  │  │ Kind         quest             │  │
│ │                               │  │ Loose?       No                │  │
│ │ [AI: Expand · Tighten · Reorg]│  │                               │  │
│ └───────────────────────────────┘  │ Last session S14              │  │
│                                    │                               │  │
│ ┌── Objectives ─────────────────┐  │ Pinned in sessions            │  │
│ │ ✓ Confirm Pale Broker exists   │  │ ├ Session 14                  │  │
│ │ ✓ Find the Iron Deed carrier   │  │ └ Session 15 (planned)        │  │
│ │ ○ Confront Broker directly     │  └───────────────────────────────┘  │
│ │ [+ Add objective]              │                                    │
│ └───────────────────────────────┘  ┌── AI assist ──────────────────┐  │
│                                    │ [ Propose a complication ]     │  │
│ ┌── Related entities ────────────┐ │                               │  │
│ │ Seraphine Valdrus  The Iron Deed│ │ —— or ——                      │  │
│ │ The Pale Broker                │ │ [ Resolve / close this thread ]│  │
│ └───────────────────────────────┘  └───────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

`SNC-FR-39` — Objectives are inline-editable and orderable. `+ Add objective` appends a stable-ID entry to `threads.objectives_log`. Completing sets `state='completed'` and `completed_at=now()`; reopening restores `state='open'` and clears `completed_at`. Edit, toggle, reopen, and order changes use optimistic Saga-scoped writes and surface stale-version conflicts instead of silently overwriting.

`SNC-FR-40` — The `Propose a complication` button invokes `propose_thread_complication` (Registry v1.0 §8). Output renders as 1–3 complication cards below the AI assist panel. Each card shows the summary, narrative, entities implicated, escalation level, and sources. GM taps a card → text is pre-filled into the narrative editor for editing. No canon write occurs until the GM saves the edited narrative.

`SNC-FR-41` — The Thread state control supports `active`, `loose`, `dormant`, `resolved`, and `failed`. Resolved requires an outcome; Failed requires a reason. Confirmation is an explicit GM-direct canon edit through the scoped manual write/source/audit path with optimistic version checking. It does not create an AI draft or bypass audit, and changing away from Resolved/Failed clears the obsolete explanation.

---

## 5. Library

The Library defaults to the active Saga plus relevant World canon. Scope filters are visible but lightweight: `Saga canon`, `World canon`, `All visible`. Sibling Sagas are not included in MVP Library/search results.

**World canon filter.** Shows records with `scope='world'` and `saga_id=null` for the active World. **Saga canon filter.** Shows records with `scope='saga'` and the active `saga_id`.


Unchanged from v0.1 §4, with one structural note:

**Notes sub-section.** The Library type rail now shows `Notes` below the six entity types (previously `Notes` was a top-nav link):

```
│ Notes      37  │
│  [ Lore (24) ] [ Summaries (8) ] [ GM notes (5) ]
```

The behavior is identical to v0.1 §7 (Notes library). The entry point has moved from top-nav to the Library sub-section.

---

## 6. Entity detail — view, edit, link, archive

Unchanged from v0.1 §5, with one addition on stub entity detail:

**Stub fleshing CTA.** When `entity.is_stub=true` AND at least one `sources` row exists from a transcript (`source_kind='transcript_segment'`) involving this entity, a CTA renders above the narrative editor:

```
┌──────────────────────────────────────────────────────────────────┐
│ STUB · Session evidence found in 2 sessions                       │
│ [ Flesh out from session evidence ]   [ Dismiss ]                 │
└───────────────────────────────────────────────────────────────────┘
```

`SNC-FR-42` — Tapping `Flesh out from session evidence` invokes `propose_quick_stub_fleshing` (Registry v1.0 §11). Output renders as a proposal panel replacing the CTA:

```
┌─ Fleshing proposal ──────────────────────────────────────────────┐
│ Proposed narrative (from Sessions 11, 14):                        │
│  The Pale Broker operates through go-betweens, never appearing    │
│  directly. Session 14 confirmed they have a presence at the       │
│  dockside warehouse…                                              │
│                                                                   │
│ Proposed summary  "A shadow operative, known only through agents" │
│ Suggested relationships:                                          │
│   ◻ located-at   Dockside Warehouse (new entity, stub)           │
│   ◻ opposed-to   Seraphine Valdrus                                │
│                                                                   │
│ Sources: S11 transcript · 01:04:20 · S14 transcript · 00:58:12   │
│                                                                   │
│ [ Accept narrative ]  [ Edit first ]  [ Discard ]                 │
└───────────────────────────────────────────────────────────────────┘
```

`SNC-FR-43` — On `Accept narrative`: writes through the standard approval write path (`change_kind='update'`, `created_by='gm_via_ai_approval'`, clears `is_stub=false`). The entity moves from stub to fleshed canon. Accepted relationships are inserted into `relationships` in the same transaction.

On `Edit first`: proposal text is copied into the narrative editor; the GM edits and saves. Saves as a direct GM edit (not AI-drafted), `created_by='gm'`.

On `Discard`: proposal dismissed. CTA reappears next time (the GM can re-invoke).

---

## 7. Entity creation

### 7.1 Entry points

Unchanged from v0.1 §6.1. The `+ New entity` button routes to the type chooser. The help-level pattern from saga creation generalizes:

```
[ Character ]  [ Place ]  [ Faction ]
[ Artifact  ]  [ Thread ] [ Session  ]
```

Session creation opens the session prep editor (§3.2 full-editor mode) directly.

### 7.2 Manual creation form

Unchanged from v0.1 §6.2.

### 7.3 AI-drafted entity creation

Unchanged from v0.1 §6.3. `Draft from prompt` → side-by-side review → save as canon.

### 7.4 NPC-for-scene entry path (new)

From the session prep workspace (§3.2) or the entity creation type chooser, the GM can choose `Draft an NPC for this scene`:

1. Opens a single-field prompt: *"Describe the role: who do you need in this scene?"*
2. Invokes `propose_npc_for_scene` (Registry v1.0 §9) — returns 1–3 candidate cards.
3. GM picks one candidate (or taps "None of these, describe differently").
4. On pick: selected candidate flows into `draft_entity_from_prompt` (Registry v1.0 §3) with the candidate as the pre-filled prompt. The standard AI-drafted entity review pane opens (§7.3 above).
5. GM reviews, edits, and saves. Standard canon-write path.

`SNC-FR-44` — The two-step (propose candidates → draft entity) keeps a single entity creation path and avoids parallel creation mechanics. The `propose_npc_for_scene` task is a selection surface only.

---

## 8. Notes — lore, GM notes, summaries

Unchanged from v0.1 §7. The Notes library is now accessed via `Library → Notes` rather than a top-nav link. Behavior, filters, and detail views are identical.

---

## 9. Approval Queue surface

Unchanged from v0.1 §8. No changes to queue IA, item anatomy, per-group commit, source view docking, or stale handling.

---

## 10. Search & Relic Guide

### 10.1 – 10.3 Search

Unchanged from v0.1 §9.1–9.3. Search bar persistent, Literal default, Hybrid opt-in, <500ms p50.

### 10.4 Relic Guide — RAG-backed Q&A and actions

Relic Guide uses the same Workspace/World/Saga retrieval boundary as Memory Spec v0.9: current Saga canon first, relevant World/Era canon second, no sibling Sagas by default.


**v0.2 update: `answer_saga_question` task is registered (Registry v1.0 §10).** Relic Guide uses this task for cited answers and can prepare GM-reviewed actions that either apply inline to working state or route to Approval Queue for canon-impacting changes. The v0.1 note about the missing task ("This spec assumes one will be added in a Registry revision") is resolved by the registry task contract.

Updated internal references:

- Task name: `answer_saga_question`.
- Retrieval profile: `sanctum_qa_grounding` (defined in Memory v0.9 §5.6 and mapped from Registry v1.0 §10).
- `no_answer=true` path: renders *"I don't have enough information about that in the current canon. Try different phrasing or [browse the Library]."*

Everything else from v0.1 §9.4–9.6 is unchanged.

`SNC-FR-20`, `SNC-FR-21` — unchanged.

---

## 11. Imports — paste, Markdown, docx

Unchanged from v0.1 §10, with one wording update:

`SNC-FR-22` (updated) — The `+ Import` placeholder now reads:

```
┌─ Import ──────────────────────────────────────────────┐
│ Bring legacy notes into your saga.                     │
│                                                        │
│ For now, you can paste notes when creating a new saga  │
│ ("Bring your notes" help level). The Import Inbox —   │
│ Markdown, docx, PDF — ships next.                      │
│                                                        │
│ Creating a saga?  [ New saga → ]                       │
└────────────────────────────────────────────────────────┘
```

"Saga Creation still open? Resume Saga Creation" replaced with "Creating a saga? New saga →" per Basepoint §6 renaming.

---

## 12. Sessions index & post-session review entry

Unchanged from v0.1 §11, with one wording update in the row CTAs:

`SNC-FR-23` (unchanged) — Sessions can be filtered by status.

Row CTAs updated: `[ Open prep ]` replaces `[ Open in session prep workspace ]`. "session prep workspace" is no longer a user-facing surface name; the prep editor is reached from the session row.

```
Session 15  ◇ ready · planned 2026-05-30
── The Iron Cost
  [ Open prep ]   [ Preview in Stage ]

Session 14  ▢ ended · played 2026-05-09
── The Thornwood Accord
  8 review items pending · transcript 1h47m
  [ Open Review ]   [ View summary ]
```

### 12.1 Post-session transcription review contract

`Open Review` separates the recovery path into explicit Audio, Transcription, and Synthesis stages. Audio may be queued/uploading/complete/failed; transcription may be queued/transcribing/complete/failed; synthesis may be queued/running/ready/failed. A failure explains what remains safe and gives the next action instead of collapsing everything into a generic pipeline error.

When transcription fails, uploaded audio is preserved. The GM can retry transcription without recording or uploading again, paste session notes, or add a manual summary. Either text path can independently become a surviving synthesis input. The two inputs are explicit Save actions: pasted notes are for raw/rough material; the manual summary is for the GM's concise account of what mattered.

Each textarea preserves its unsaved value locally as the GM types and restores it after refresh. Save or network failure leaves the text in place with retry copy. Confirmed saves clear only that local draft and add an immutable evidence card showing source kind, excerpt, and saved time. The form must never imply that Save starts AI work or changes canon; synthesis remains a separate GM action in the next pipeline step.

Completed transcript segments are editable as timestamp-labeled text blocks. A GM may change text or soft-hide a segment. Timestamps, segment boundaries, and audio references are immutable, and new transcript segments cannot be inserted in MVP. Original provider segments and already-captured citation excerpts stay frozen for audit/drift handling.

Transcript text is evidence. Synthesis output remains proposed draft material. Neither becomes canon without explicit GM approval through the owning review/Approval Queue path. The dense editor is web-first for this slice; the mobile-native transcript editor remains part of the broader mobile gap.

Pending synthesis drafts on this page show each citation in an inline disclosure. Transcript citations show timestamp, the frozen cited excerpt, current segment text, and edited/deleted state, with a direct link to the exact transcript segment anchor. Pasted-note and GM-summary citations are explicitly labeled as having no timestamp. Unavailable, broken, deleted, permission-denied, and unsupported evidence uses non-identifying fallback copy. Opening or following a citation is read-only: it cannot edit the draft, approve a proposal, or write canon.

---

## 13. Saga settings

World settings are lightweight in MVP: name, summary, default game system, and shared AI context. Saga settings remain the main editable settings surface for active play. Full World dashboard and Era editor are V1.


Unchanged from v0.1 §12, with one update:

The **GM profile editor** section now reads "Saga creation profile" rather than "Saga Creation profile" to reflect the renamed flow. The fields (`WS-FR-4` from the PRD) are unchanged.

---

## 14. Permission-safe GM/player separation

RLS enforces Workspace/World/Saga boundaries. Future player access attaches to Saga, not the entire World.


Unchanged from v0.1 §14. GM-only access in MVP, architecture future-compatible, visual conventions for V1 muscle memory.

---

## 15. Maps (V1 placeholder)

Unchanged from v0.1 §15.1. No Maps nav in MVP. V1 placeholder IA preserved.

The v0.1 §15.2 Thread Timeline is **no longer a V1 placeholder** — it has been promoted to MVP in §4.3. The Timeline section of v0.1 §15.2 is superseded by §4.3 here.

---

## 16. Cross-cutting concerns

### 16.1 AI surfaces in Sanctum (v0.2 update)

| Surface | Task | When fires | Quota |
|---|---|---|---|
| Entity narrative editor | `draft_entity_from_prompt` rough-note/update mode | GM clicks Expand/Tighten/Reorganize | standard |
| Lore note editor | `draft_entity_from_prompt` rough-note/update mode | Same | standard |
| "Draft from prompt" entity creation | `draft_entity_from_prompt` | GM clicks Draft after typing prompt | standard |
| NPC-for-scene creation | `propose_npc_for_scene` -> `draft_entity_from_prompt` | GM clicks "Draft an NPC" | light + standard |
| Stub fleshing | `propose_quick_stub_fleshing` | GM clicks "Flesh out from session evidence" | light |
| Thread complication | `propose_thread_complication` | GM clicks "Propose a complication" on thread detail | light |
| Session prep — beats | `propose_scene_beats` | GM clicks "Brainstorm beats" in agenda editor | light |
| Session prep — synthesis | `generate_session_prep` | GM clicks "Draft this session" | heavy |
| Prep briefing | `compose_prep_briefing` | Auto-runs on prep workspace load (streaming) | light |
| Mention chip on save | exact-name mention detection | Transactional after the debounced/blur entity save; accepted or dismissed explicitly | infrastructure |
| Search bar (Hybrid) | `search_for_ui` | On query, hybrid mode | infrastructure |
| Relic Guide answer | `answer_saga_question` | GM submits question | light |
| Approval Queue | None — review only | — | — |

All tasks except `compose_prep_briefing` (auto-running reading aid) are GM-invoked. No task fires unsolicited during or outside prep.

### 16.2 Failure UX

`SNC-FR-29` (updated) — Each AI surface has a defined failure path. New tasks added:

| Task | On failure |
|---|---|
| `propose_scene_beats` | Inline error: `Couldn't generate beats · Retry`. GM input preserved. |
| `propose_thread_complication` | Inline error: `Couldn't generate complications · Retry`. Thread content unchanged. |
| `propose_npc_for_scene` | Inline error: `Couldn't suggest NPCs · Retry`. GM can use draft_entity_from_prompt directly. |
| `propose_quick_stub_fleshing` | Inline error: `Couldn't flesh out stub · Retry`. Stub CTA reappears. |
| `answer_saga_question` | Inline error: `Couldn't answer · Retry`. Question preserved. |
| (all v0.1 entries) | Unchanged. |

### 16.3–16.7

Loading states, offline behavior, empty saga, mobile reduction, reasoning — unchanged from v0.1 §16.3–16.7.

**Mobile adaptation update (§16.6):** The web app is the first build target, but mobile Sanctum is not a lesser product surface. Mobile may use stacked layouts, sheets, and horizontal-scroll timeline treatment, while preserving complete core loop functionality.

---

## 17. Acceptance criteria

- Header exposes active World and active Saga without adding a third top-level mode.
- New Saga can reuse an existing World or create one behind the scenes.
- Entity search defaults to current Saga plus relevant World canon and excludes sibling Sagas.
- No MVP flow exposes full World dashboard, Era editor, cross-Saga graph, or cross-Saga timeline.


All v0.1 acceptance criteria (`SNC-AC-1` through `SNC-AC-10`) are unchanged.

**New in v0.2:**

`SNC-AC-11` — Thread Timeline renders correctly for a saga with ≥5 sessions and ≥5 threads. All thread state transitions plotted against the correct session. Timeline loads in <300ms p50 for a 15-session saga.

`SNC-AC-12` — `propose_scene_beats` returns exactly 3 beat cards with no entity names absent from saga canon. Cards render within 14s p95.

`SNC-AC-13` — `propose_thread_complication` returns 1–3 complication cards that do not resolve the thread. Cards render within 14s p95.

`SNC-AC-14` — `propose_npc_for_scene` returns 1–3 candidates with no name collision against existing canon entities. On candidate selection, the entity flows into `draft_entity_from_prompt` and renders the standard inline review pane.

`SNC-AC-15` — `propose_quick_stub_fleshing` CTA only appears when `is_stub=true` AND transcript evidence exists. Acceptance writes an update draft that clears `is_stub=false` on approval.

`SNC-AC-16` — `answer_saga_question` never renders an answer without citations. `no_answer=true` path renders the standard "I don't have enough information" mesVerdigris, not an empty answer body.

`SNC-AC-17` — The inline session prep workspace on the Sanctum home page is editable (autosaves). Changes persist identically to the full-editor page.

`SNC-AC-18` — Thread carry-forward section on the dashboard renders all `active` and `loose` threads for the saga. No AI task invoked for this rendering; it is a database query.

---

## 18. Knock-on effects (for next revision cycle)

The prior downstream-doc revision table is closed by the vault pass. Current active companions are aligned; remaining implementation must use [[02 - Source Map]] for authority and [[23 - AI Task Registry]] v1.0 for AI contracts.

| Doc | Required change | Severity |
|---|---|---|
| **PRD v0.10** | Active and aligned. Legacy requirement aliases remain only for migration traceability. | Complete |
| **Stage UX Flow v0.6** | Resolved in vault pass: prep lives inside the Sanctum parchment frame with Amber/Verdigris accents, not an independent Cream mode. | Complete |
| **Session Prep Flow v0.2** | Resolved: legacy session prep workspace spec is archived; canonical prep editor surface lives at `/saga/<id>/sessions/<id>/prep`. | Complete |
| **AI Task Registry v1.0** | Standalone contract source for all AI tasks. | Complete |
| **Basepoint v3.5** | Active and aligned. | Complete |
| **Design System `[[13 - Design System]]`** | Active visual/token source; `sanctum-prep-cta` is present. | Complete |
| **Schema v0.8** | Supports `threads.objectives_log`, `resolution_state`, `is_loose_thread`, `is_stub`, and stub-fleshing approval path. | Complete |
| **Tech Architecture Spec v1.2** | Resolved in vault pass: the session-prep query role is named `prep_query`; functionally unchanged from the prior composition-oriented role. | Complete |

---

*End Sanctum UX Flow v0.2 vault copy. Aligned for MVP coding with Basepoint v3.5, PRD v0.10, Schema v0.8, Approval Queue v0.5, Memory v0.9, AI Registry v1.0, Tech Architecture v1.2, Stage UX v0.6, Session Prep v0.2, and Design System.*
