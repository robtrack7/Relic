---
status: active
authority: secondary
scope: mvp
read_after:
  - "[[00 - Start Here]]"
depends_on:
  - "[[00 - Start Here]]"
supersedes: []
last_audited: 2026-06-01
source_file: "Sourced - Downloaded - 260518/relic-stage-ux-flow-v0_6.md"
---

> [!info] How to use this spec
> Owns: Live-session UX: agenda, pinned cards, search, capture, recording, dice, End Session, and offline behavior.
> Does not own: Historical rationale and superseded naming unless explicitly retained as an internal identifier.
> Read next: [[00 - Start Here]]
> Implementation-critical note: Treat this as coding input only after reading the authority order in [[00 - Start Here]].
# Relic — Stage UX Flow

**Version:** v0.6
**Status:** Active Stage UX specification
**Supersedes:** v0.5

## Document scope

This document defines the user experience and interaction model for **The Stage**, Relic's live-session surface on web and mobile. It is the source of truth for Stage behavior. Companion documents — `[[31 - Session Prep Flow]]`, `[[34 - UI Implementation Spec]]`, `[[12 - MVP PRD]]`, and `[[33 - First Run UX Flow]]` — define the surfaces this one references but does not specify.

This document is optimized for downstream consumption by AI coding agents (vibe-coding tools, Claude Code). Each section is self-contained, references are explicit and versioned, and feature specs follow a consistent shape: **Purpose → Behavior → Schema/IDs → Edge cases → Out of scope.**

## Changelog

**v0.6 (May 2026).** Priority 7 closeout. Clarifies alpha Stage distribution through Expo preview/internal builds, notification tap behavior into Stage/Sanctum destinations, Stage-safe failure UX, and quota-blocked/manual-fallback states. No live-session feature expansion.


**v0.5 (May 2026).** Document-control refresh. Updates companion-document references after Priority 5/6. No Stage UX behavior, state-machine behavior, or Stage MVP scope changed.

**Priority 3 continuity architecture patch (May 2026).** Stage remains focused on the active Saga and Session, but all cached state, search calls, upload paths, and telemetry carry `workspace_id`, `world_id`, and `saga_id`. Stage search reads current Saga canon plus relevant World canon, excluding sibling Sagas. Stage never promotes session events to World canon.

**v0.4 alignment patch (May 2026).** Historical Priority 2 terminology and source-alignment pass. Current active source versions are listed in [[02 - Source Map]].

Material corrections:

1. Replaced the old three-top-level-mode model with **Sanctum + Stage**. Session prep is a Sanctum workspace, not a peer mode.
2. Replaced user-facing **Saga Creation** language with **New saga / Saga creation**. Internal schema/task names may remain where already locked.
3. Replaced all functional Stage references to session prep workspace with **session prep workspace / prep editor / prep briefing**.
4. Kept Stage behavior unchanged where the revision document said Stage itself was unaffected: dark treatment, dormant AI, packet rendering, recording, quick capture, quick stubs, dice, End Session, and post-session enqueue.
5. Preserved v0.4 additions: Start Session confirmation (`STG-FR-22`) and one-line end-session summary (`STG-FR-23`).
6. Fixed stale source versions, duplicate §11.5 numbering, and end-of-file version notes.

## Upstream specs (locked)

| Doc | Version | What's pulled |
|---|---|---|
| Basepoint | v3.5 | §5 two-surface model, §13 design, Stage dormancy, Sanctum -> Stage lock boundary |
| PRD | v0.10 | §3.1 (`STG-FR-1..23`), §3.2 (`CON-FR-*`), §3.3 (`OFL-FR-*`), Session Prep references |
| Schema | v0.8 | §3 entities, §6 notes (`quick_capture`, `summary`), shared columns, session lifecycle, `session_marked_moments` |
| Tech Arch | v1.2 | Offline sync, mobile architecture, Stage role, recording/upload/background jobs |
| Registry | v1.0 | `search_for_ui`, `synthesize_session`, `compose_prep_briefing`, and stub-fleshing references. |
| Design System | v0.4 | `[[13 - Design System]]` Stage mobile pattern and Stage-specific tokens |
| Approval Queue | v0.5 | Summary note handling and downstream draft/canon processing |
| Session Prep Flow | v0.2 | Ready-for-Stage packet, prep locking, fallback one-line summary handoff |

## Naming reconciliation (v0.4 alignment)

Relic has **two user-facing surfaces**:

| Surface | Purpose | Build order |
|---|---|---|
| **Sanctum** | Workspace/World/Saga home, entity management, Threads, Review, Relic Guide, and Prepare workspace | Web first, mobile follows |
| **Stage** | Live session support: agenda, pinned cards, search, Relic Guide, capture, record, dice, end session | Web first, mobile follows |

**Prepare** is a Sanctum workspace, not a separate product surface. The GM opens a session from Sanctum, edits the packet in Prepare, taps **Ready for Stage**, then opens Stage. Stage can preview a `ready` or `started` packet without locking prep. Prep locks only when the session reaches `in_progress`.

**Stage access** is contextual. Stage is not a default left-rail destination; it opens from Prepare, current session pill, Home next-action cards, notification/deep link, app/crash resume, or the bright `Return to Stage` affordance shown in Sanctum while a session is live.

**Saga creation** replaces retired user-facing creation-mode language. Internal names such as `workshop_sessions`, `workshop_input`, or `scaffold_saga` may remain in engineering/schema contexts, but Stage copy must never tell the GM to open Saga Creation.

**Prepare workspace** is the active user-facing wording for the rail destination. Use **Prepare**, **prep editor**, or **prep briefing** in MVP copy depending on context.

---

## 1. Premise

The Stage is the table surface. It exists for one moment: a GM is mid-session, with players, recording running, and something needs to happen *now* — find an NPC, jot a thought, roll a die, mark a moment. Every interaction is clean, focused, and glanceable, not a workflow.

**Five rules:**

1. **Mobile-ready surface.** Everything important is reachable without leaving the Stage; web ships first, then mobile follows with stronger offline ergonomics.
2. **Relic Guide is GM-controlled.** Guide is available for live support and can prepare actions, but it never mutates canon autonomously.
3. **Airplane-mode complete.** Every Stage action works offline; reconnect flushes. (Tech Arch §15.)
4. **Cold-load to interactive <2s** on modern phone with working network. (PRD STG acceptance.)
5. **Decoration costs milliseconds. None are paid.** (Design System principle 06.)

---

## 2. Theme & dark mode

**Default:** Stage uses a clean, focused, dark high-contrast pattern from the design system (Ink #1A1916 surface, Cream foreground, Amber for action/state, Rust for record).

**Why dark is the default:** the Stage is a single-purpose surface for ~3-hour sessions in typically dim table conditions. Forcing a per-session light/dark choice is friction. Dark *is* the Stage.

**Light mode:** offered as a per-user **Stage-specific setting** (Settings → Stage appearance → Light / Dark / Match Sanctum). Useful for outdoor daylight sessions or accessibility. Same layout, same density, inverted to Parchment surface.

**Sanctum theme** is independent. Defaults Parchment-light. A dark Sanctum is V1+.

**Session prep workspace treatment:** prep lives inside the Sanctum parchment frame. It uses Amber-forward card accents and Verdigris thread-state indicators, not an independent Cream mode.

**Token requirement:** the design system must define or preserve Stage-specific tokens for:
- Verdigris-tinted offline chip background and border
- Stone-900 inset surface for expanded entity cards
- Two-stage offline chip color variants (Verdigris → amber → rust as queue depth grows)
- High-ambient-light variant of the record dot (thin Ink outline)

---

## 3. Cold-load to interactive

Stage entry points:

| Entry | From | To |
|---|---|---|
| `RESUME` | Sanctum home status card | Stage with active `in_progress` session |
| `OPEN` | App icon (mobile) | Stage if active session exists, else prompt |
| `START` | Prepare `Open in Stage` CTA | Stage with `ready` packet; session remains editable until Start Session confirmation |
| `RETURN` | Sanctum top-right `Return to Stage` affordance | Stage with current `started`, `in_progress`, or `ended_pending_undo` session |

**Frame budget (mobile, <2s total):**

- **0–200ms:** App shell renders from local cache. Session title, search bar, sticky bottom bar visible.
- **200–600ms:** Packet hydrates from local SQLite (Tech Arch §15.2). Agenda + pinned cards populate.
- **<2s:** Network reconciliation in background. Updates flow in without re-rendering shell.

**Empty state:** No active or ready session → single CTA: `Open Prepare` / `Plan a session`, or `Resume Session N — The Title` if a `ready`, `started`, or `in_progress` packet exists.

---

## 4. Session lifecycle states

The Stage operates against these `sessions.status` values:

| State | Set when | Prep editable? | Stage behavior |
|---|---|---:|---|
| `planned` | Session created in Prepare | Yes | Not openable from Stage. |
| `ready` | GM taps `Ready for Stage` in prep | Yes | Openable. Stage previews agenda + pinned cards. No recording. |
| `started` | GM confirms `Start Session` in Stage | Yes | Active shell; consent gate available. GM may still return to prep. |
| `in_progress` | First recording starts, or GM explicitly starts without recording | No | Live session state. Prep workspace read-only. |
| `ended_pending_undo` | GM taps End Session and confirms | No | Stage shows 60s undo banner. Prep workspace remains read-only. |
| `ended` | 60s undo expires | Retrospective only | Pipeline enqueues. Stage exits to dashboard/home. |

**Schema contract:** Schema v0.8 tracks `started_at`, `went_live_at`, `ended_pending_undo_at`, `ended_at`, `sessions.status`, and computed prep-lock state for status in {`in_progress`, `ended_pending_undo`}.

**Key design point:** the Prepare → Stage transition is **not** lockingly one-way. The GM can open Stage for preview, return to prep, edit, and re-open Stage. The lock fires on `in_progress` only. When the GM leaves Stage during `started`, `in_progress`, or `ended_pending_undo`, Sanctum shows a bright `Return to Stage` affordance near the top-right controls.

---

## 5. Layout

### 5.1 Mobile app (primary surface)

One vertical scroll, no tabs. Sticky bottom action bar.

```
┌──────────────────────────────────┐
│ Session 14                     ● │  state chip (recording / offline)
│ The Thornwood Accord             │
├──────────────────────────────────┤
│ ⌕ Search saga…       [Lit ▾] │  persistent search
├──────────────────────────────────┤
│ Agenda                           │  collapsible sections
│  Objective: …                    │
│  Opening scene: …                │
│  Scene notes: …                  │
├──────────────────────────────────┤
│ Pinned                           │
│  ▣ Seraphine Valdrus     (active)│
│  ▣ The Pale Broker               │
│  ▣ The Drowning Rat              │
├──────────────────────────────────┤
│ Notes (this session)             │
│  02:14:08  "Pale Broker is real" │
│  + Quick capture                 │
│  + Quick stub                    │
└──────────────────────────────────┘
[ ● Record  |  ⚐ Mark  |  ⚀ Dice ]   sticky bottom bar, 64-72pt tall
```

**Sticky bar contents:** Record toggle · Mark Moment · Dice. These are the three actions the GM reaches for without looking. Mark Moment disabled when not recording.

**Pinned cards on mobile:** **1 per row** for collapsed cards, full-width. (Revision from v0.1, which suggested 3 per row mirroring the design system sample. Table use needs larger tap targets and clearer reading.)

### 5.2 Browser fallback / tablet (≥900px)

Same primary column, plus an **optional right side panel** for the currently-expanded entity. Toggle with chevron; collapsed by default. The main column always shows agenda + pinned + notes.

Search ⌘K opens modal. Persistent inline bar also visible. Tap result → opens in side panel (or full overlay on mobile).

**Why a side panel, not a two-column dashboard:** the Stage is clean and focused. A two-column layout encourages multi-focus, which is a Sanctum pattern. The side panel is opt-in for the GM with screen real estate who wants one entity persistent.

### 5.3 Density principles

- Larger tap targets than the design system sample suggests. Minimum 44pt × 44pt for any tappable Stage element.
- More line-height in entity meta strips than Sanctum equivalents (1.5 minimum).
- Whitespace is generous. The Stage is read at arm's length in low light.

---

## 6. Agenda

The Agenda renders the session packet authored in Prepare.

**Source of truth:** `sessions` row + linked active threads + pinned entities. Read by the Stage on session open.

**Three sections, all collapsible by tap:**

| Section | Field | Render |
|---|---|---|
| Objective | `sessions.objective` | Single line. Cormorant 18pt italic. |
| Opening scene | `sessions.opening_scene` | 2-3 sentences. Instrument Sans body. |
| Scene notes | `sessions.scene_notes` | Bullets / short prose. Instrument Sans body. |

All three default to expanded on session open. Collapse state persists per session per device.

**Prep relationship:** the Agenda is the GM's prep, which is the output of AI synthesis plus GM editing in Prepare. The Stage does not re-synthesize, summarize, or modify the agenda unless the GM invokes Relic Guide and reviews an action. If the GM wants direct prep changes, they return to Prepare while the session is still editable (`ready` or `started`).

**Why no AI summarization on Stage:** the agenda is the GM's authored prep. Compressing it is disrespectful and adds latency. The prep workspace is where AI helps shape this content. The Stage just renders it.

**Out of scope:** AI-generated mid-session agenda updates. "Scene complete, advance to next" automation. Per-scene state tracking.

---

## 7. Pinned entity cards

3–5 pinned entities from the session packet (`session_pinned_entities` table). Tap to expand, tap to collapse. (`STG-FR-5`.)

### 7.1 Collapsed state

```
▣ Seraphine Valdrus       NPC · Merchant · Present
```

- Cormorant 16pt for the name.
- Instrument Sans 11pt small-caps for the meta strip (entity type · key role · scene state).
- Amber 2pt accent stripe on the left for the **active** card. Exactly one active at a time.

**Active-card behavior:** expanding a card sets it active. Expanding a different card transfers active state. Collapsing doesn't deactivate. Active state is **Stage-session-local**, not stored in DB.

### 7.2 Expanded state — the Stage Card

A type-aware projection of canon fields, formatted for glance reading. Generated deterministically from existing schema fields. **No AI involvement.**

**Behavior on tap:**
- Tap (collapsed) → expand to Stage Card.
- Tap (expanded) → collapse.
- Long-press (500ms) → quick-actions menu: `Unpin · Open in Sanctum · Copy link`.
- Mobile "Open in Sanctum" → opens read-only Sanctum view in a modal overlay. Does not navigate out of Stage.
- Web "Open in Sanctum" → opens read-only Sanctum view in side panel. Does not navigate out of Stage.

**Why read-only-in-Stage rather than deep-link out:** the GM may be mid-recording. Navigation cost is too high. V1 deep-link to Sanctum is acceptable but should open in a new context, not replace the Stage.

### 7.3 Stage Card by entity type

Each Stage Card is a deterministic projection. The exact fields below are the V0 contract.

**Character (NPC)**
```
Seraphine Valdrus                             ← characters.name (Cormorant 22pt)
NPC · Merchant · House Valdrus                ← type + role_or_occupation + primary faction relationship

Summary       characters.summary
Status        characters.status · scene-presence (computed: pinned & active)
Voice         parsed from gm_notes tag "voice:"     ← V0, see §7.5
Knows         3 most recent canon-audit changes for this character
Wants         parsed from gm_notes tag "wants:"     ← V0, see §7.5
Links         names of related entities via mentions table, up to 5
GM notes      gm_notes column (excluding parsed tags), Verdigris tint, mono small  ← visible to GM only
```

**Place**
```
The Drowning Rat                              ← places.name
Tavern · in Lowmarket, Brassgate              ← place_kind + parent_place trail

Summary       places.summary
Status        places.status · scene-presence
Contains      child places (places.parent_place_id), up to 3
Inhabitants   characters with home_place_id = this, up to 5
Links         names of related entities via mentions, up to 5
GM notes      gm_notes column, Verdigris tint
```

**Faction**
```
House Valdrus                                 ← factions.name
Noble House · Brassgate                       ← faction_kind + seat_place_id name

Summary       factions.summary
Status        factions.status
Seat          factions.seat_place_id name (clickable link)
Members       characters via relationships kind='member-of', up to 5
Links         related entities, up to 5
GM notes      gm_notes column, Verdigris tint
```

**Artifact**
```
The Whisper Coin                              ← artifacts.name
Artifact · in play                            ← entity type + status

Summary       artifacts.summary
Held by       artifacts.current_holder_character_id name (clickable)
Located       artifacts.current_location_place_id name (clickable)
Properties    first paragraph of artifacts.narrative, truncated to 200 chars
Links         related entities, up to 5
GM notes      gm_notes column, Verdigris tint
```

**Thread**
```
The Thornwood Accord                          ← threads.name
Thread · Active                               ← type + status

Objective     threads.objective (or first line of narrative)
Status        threads.status · resolution_state
Loose since   sessions.title of last session this thread appeared in (if loose)
Connected     entities referenced via mentions, up to 5
GM notes      gm_notes column, Verdigris tint
```

**Out of scope for V0 Stage Card:**
- Stat blocks (system-agnostic; see §7.6)
- AI-generated summaries
- Player-visibility fields (no per-player views in MVP)
- Edit affordances (Stage Card is read-only on Stage; edits via "Open in Sanctum")

### 7.4 Mechanical Block — V1 prep

A V1 affordance, but **V0 schema includes the nullable column** to avoid migration pain:

```sql
-- Schema v0.8 V1-ready field (unused until V1)
alter table characters add column mechanical_block jsonb;
alter table artifacts  add column mechanical_block jsonb;
-- monsters table added in V1 with mechanical_block from creation
```

In V1, when a Game System is bound to the saga, Stage Card for Character/Monster/Artifact renders a system-aware **Mechanical Strip** above the Links row. The renderer uses `game_systems.mechanical_schema` to format the block. For generic-system sagas, the column stays null and no strip renders.

**Tracked in next-steps:** Game System table design, mechanical_schema JSON shape, `derive_system_schema` AI task for rulebook PDF import.

### 7.5 Voice / Wants tag pattern (V0)

GMs can add `voice:` and `wants:` prefixed lines anywhere in `gm_notes`. The Stage Card parser extracts these and renders them in their own fields.

**Parser contract:**
- Line-level. Each line of `gm_notes` is checked.
- Match: `^(voice|wants):\s*(.+)$` (case-insensitive).
- First match per key wins. Subsequent matches preserved in body.
- Parsed lines are *removed* from the `gm_notes` body display on the Stage Card. They render only in their typed fields.
- In Sanctum, gm_notes displays raw (no parsing). The tags are visible as authored.

**Why parser, not schema fields:** zero migration cost, GM can use freely, no enforcement burden. If usage patterns mature in V1, we promote to typed fields.

### 7.6 Stat blocks — system-agnostic stance (V0)

Relic is system-agnostic in MVP. No D&D/PF2 fields. Stat blocks go in `narrative` or `gm_notes` as Markdown.

The Stage Card shows the first paragraph of narrative by default; long-press → "Open in Sanctum" → full narrative.

**V1 plan** (see next-steps): Game Systems with rulebook-PDF-derived schemas. Pre-shipped systems (D&D 5e, PF2e, PbtA-family, ...) + AI-derived from uploaded rulebook PDFs (`derive_system_schema` task, RAG over rulebook PDFs, GM approval before binding). Stat blocks then render as system-aware Mechanical Strips on Stage Cards.

### 7.7 Mid-session pin / unpin

- From search results: tap entity → entity opens → "Pin to session" button.
- From a pinned card: long-press → "Unpin."
- 5-pin soft cap. 6th pin prompts "Replace which?" picker.
- Writes to `session_pinned_entities`. Sync as normal.

---

## 8. Search

### 8.1 Affordance

| Platform | Pattern |
|---|---|
| Mobile | Persistent bar below session header. Always one tap to focus. Inline results, no full-screen modal. |
| Web | ⌘K (Ctrl+K) opens modal. Persistent inline bar also visible. |

Inline-on-mobile decision: keeps the Stage context visible. Revisit at UI spec phase with prototypes.

### 8.2 Modes (`STG-FR-8`)

Toggle inside search bar, two states:

```
[ ⌕  Search saga…              Literal ▾ ]   ← lexical FTS only
[ ⌕  Search saga…              Hybrid  ▾ ]   ← lexical + semantic, calls search_for_ui with workspace_id, world_id, saga_id
```

**Default: Literal.** Hybrid is opt-in because Hybrid is AI, and the principle is "AI dormant unless GM-invoked." Toggle state persists per session per device.

### 8.3 Behavior

Hybrid search scope: active Saga canon first, World canon relevant to the active Saga second, no sibling Sagas. Literal search uses the same scope boundary.


- Debounced 150ms as GM types.
- Results render inline (mobile) or in modal (web ⌘K).
- Tap result → entity opens as Stage Card overlay (mobile) or side panel (web).
- Close → returns to Stage with state preserved.
- **No "did you mean" suggestions. No auto-correct. No related-entity recommendations.** (`STG-FR-8`.)

### 8.4 Empty state — Quick Stub CTA

Zero results for a typed query:

```
No matches for "Pale Broker."

+ Quick Stub: Create as Character
+ Quick Stub: Create as Faction
+ Quick Stub: Create as Place
+ Quick Stub: Create as Artifact
+ Quick Stub: Create as Thread
```

Tapping any → opens Quick Stub sheet (§10) pre-filled with the typed name.

### 8.5 Performance

- Stage p50 <300ms, p95 <500ms (Memory §6.1).
- 800ms statement timeout via `stage_query` Postgres role (Tech Arch §8).
- On timeout: fall back to lexical, show small "AI search timed out — showing literal matches" chip.

### 8.6 Offline

- Lexical: works against local SQLite FTS over cached pinned + recently-searched entities (Tech Arch §15.2).
- Hybrid: greyed in the toggle when offline, label reads "Hybrid (online only)."

---

## 9. Quick Capture

**Purpose:** one-tap free-text capture, timestamped to active session. The GM's scribble pad during play.

### 9.1 Interaction

- Tap "+ Quick capture" → bottom-sheet text field, autofocus, full keyboard.
- Type. Tap Save or Return.
- Sheet closes. Toast: "Captured · 02:14:08."

### 9.2 Schema

- Table: `notes`.
- `note_type='quick_capture'`.
- `session_id` set.
- `quick_capture_timestamp_seconds` set (relative to session start, computed at save time).
- `canon_state='canon'` (the note is real; flagged for post-session processing).
- Local SQLite first; queued to `pending_sync` (Tech Arch §15.4).

### 9.3 AI behavior

**None during session** (`STG-FR-11`). Captures are stored verbatim. No tagging, no entity extraction, no mention detection. All synthesis happens post-session in `synthesize_session` (Registry v1.0 §6).

### 9.4 The list

The Stage shows current-session captures inline (newest first, mono font, timestamp prefix). Read-only mid-session — edits happen in the Approval Queue review.

- Tap capture → full-text overlay (long captures truncate to 2 lines in list).
- Swipe left (mobile) → "Mark for review" (flag elevates this capture in post-session triage).

**No mid-session edit:** captures are raw and immutable until the pipeline. Survives app crash with zero ambiguity.

---

## 10. Quick Stubs

**Purpose:** inline entity creation for "new NPC just walked into the scene."

### 10.1 Interaction

Entry points:
- Search empty state (§8.4).
- "+ Quick stub" in Notes section.
- Swipe-up gesture sheet (§13.1).

Sheet:
```
┌──────────────────────────────┐
│ New stub                     │
│                              │
│ Type:  [Character ▾]         │
│ Name:  Erran the Quartermaster
│ Summary:                     │
│  Brassgate dockside, stocky, │
│  has the deed                │
│                              │
│            [Cancel]  [Save]  │
└──────────────────────────────┘
```

Three fields. Tap Save.

### 10.2 Schema

- Inserts a canon row in the appropriate entity table (`characters`, `places`, etc.).
- `is_stub=true` (Schema §3.1).
- `created_by='gm'` (GM-authored).
- `name` and `summary` set. `narrative` empty. Type-specific fields empty.
- Local SQLite first; `pending_sync` (Tech Arch §15.4).

### 10.3 Stub badge

When a stub appears on Stage (pinned or in search results), a small `STUB` mono pill renders next to the type:

```
▣ Erran the Quartermaster       NPC · STUB
```

Verdigris tint for the pill. Indicates "this needs fleshing post-session."

### 10.4 Type defaults

Default type: **Character** (most common at the table). All six entity types selectable.

### 10.5 AI behavior

None during session. Quick stubs are stored exactly as the GM typed them. After the session, `synthesize_session` sees the stub, transcript, quick captures, and marked moments. A GM-invoked `propose_quick_stub_fleshing` action may later produce a reviewable update draft from session evidence (Registry v1.0 §11). It never auto-runs during Stage.

---

## 11. Recording

### 11.1 Per-session consent gate (`CON-FR-1`)

**First Record tap per session triggers modal:**

```
┌──────────────────────────────────┐
│  Players consented to recording? │
│                                  │
│  Relic remembers this answer for │
│  this session only.              │
│                                  │
│        [ No ]      [ Yes ]       │
└──────────────────────────────────┘
```

| Choice | Effect |
|---|---|
| Yes | Recording enables. State logged on `sessions` row. Modal does not re-appear this session. |
| No | Recording disabled. Record button replaced by `Recording disabled · Change in saga settings` label. |

### 11.2 Record state visuals

| State | Visual |
|---|---|
| Off | Rust button, "RECORD" mono label. |
| On | Amber pulsing dot (1.4s ease loop). Elapsed time mono. Tap to stop. |
| Paused / disconnected | Dot stops pulsing. Label: "PAUSED — uploading queued." |

### 11.3 Chunked local capture

- **Mobile:** native audio APIs via Expo. ~30s chunks, written to local file.
- **Web:** MediaRecorder API. Same chunk cadence. (`STG-FR-15`.)
- Chunks queued for Supabase Storage upload; uploaded as bandwidth allows.
- Schema: `audio_chunks` rows referencing `sessions.id` and Storage path.

### 11.4 Mark Moment (`STG-FR-16`)

Sticky bottom bar button. Disabled when not recording.

- Tap -> inserts timestamp flag in `session_marked_moments` (Schema v0.8).
- Tiny haptic on mobile.
- Toast: "Marked · 02:14:08."

**Optional labels:** long-press Mark Moment → small label sheet. Freeform input + three suggested chips: `decision · lie · secret`. Skippable; defaults to unlabeled.

Marked moments surface first in post-session review (PRD §4.1).

### 11.5 Network drop recovery

- Chunks keep writing locally.
- Status indicator: "Recording · upload queued (N chunks)."
- On reconnect: chunks upload in order, FIFO.
- No data loss within local storage limits.

### 11.6 Failure cases

| Failure | Behavior |
|---|---|
| Storage full mid-recording | Recording stops. Banner: "Storage full · audio paused. Free space to resume." Partial audio preserved. |
| Mic disconnect (Bluetooth drop) | Recording pauses. Banner: "Mic disconnected — tap to resume." Captures unaffected. |
| App backgrounded | Recording continues (native background audio). Stage state preserved. Return resumes exactly where left. |

---

### 11.7 Start Session confirmation modal (`STG-FR-22`)

**Purpose.** Make the prep-lock transition deliberate and surface stale-canon risk when prior session's pipeline is unreviewed. This is the seam between "prep-flexible" and "play-committed"; the modal is the moment the GM acknowledges the boundary.

**Trigger.** GM taps "Start Session" on the Stage (status flips `ready` → `started`). On mobile this is the primary CTA in the sticky bar when status is `ready`; on web it's a header CTA.

**Modal anatomy.**

```
┌──────────────────────────────────────────────────┐
│                                                   │
│ Start Session 15?                                 │
│                                                   │
│ Once you start, prep is locked. You can return   │
│ edit prep again after the session ends.          │
│                                                   │
│ ⚠ Last session's review is still pending.        │   ← conditional
│   Some canon may not reflect what just happened.  │   ← conditional
│   [Open review first →]                            │   ← conditional
│                                                   │
│              [Cancel]   [Start session]           │
└──────────────────────────────────────────────────┘
```

Typography (per design system): modal title Cormorant 24pt ink; body Instrument Sans 15pt stone-900; warning block amber-on-cream alert variant (`prep-warning-chip` token); primary action ("Start session") amber CTA button; secondary action ("Cancel") ghost button; "Open review first" amber inline link, only present when warning block is shown.

**Conditional warning logic.** The warning block is shown if and only if the most recent `ended` session for this saga has an open `pipeline_runs` row with `state ∈ {'queued', 'transcribing', 'synthesizing', 'ready_for_review'}` and at least one `drafts` row with `state='pending'` for that run.

```ts
const mostRecentEnded = await db.sessions
  .where({ saga_id, status: 'ended' })
  .orderBy('ended_at', 'desc')
  .first();

if (mostRecentEnded) {
  const openPipeline = await db.pipeline_runs
    .where({ session_id: mostRecentEnded.id })
    .whereIn('state', ['queued', 'transcribing', 'synthesizing', 'ready_for_review'])
    .first();

  if (openPipeline) {
    const pendingCount = await db.drafts
      .where({ pipeline_run_id: openPipeline.id, state: 'pending' })
      .count();
    showWarning = pendingCount > 0;
  }
}
```

Computed on Start Session tap, not on Stage cold-load. p95 target <100ms.

**Action behavior.**

| Action | Behavior |
|---|---|
| **Start session** | Proceeds with `ready → started` transition. Modal closes. Standard consent flow (§11.1) follows on first Record tap. |
| **Cancel** | Modal closes. Status stays `ready`. Stage state preserved. |
| **Open review first** (conditional) | Routes GM to Approval Queue for that pipeline run, preserving Stage `ready` session state. GM can review, return to Stage, and tap Start Session again; modal re-evaluates warning on next open. |

**Edge cases.**

- No prior `ended` session (first-ever session): warning block hidden; modal still shown with prep-lock copy.
- Prior pipeline is `failed` or `closed`: warning block hidden (no pending drafts).
- Prior pipeline has pending drafts mid-processing (`queued`, `transcribing`, `synthesizing`): warning shown — stronger reason to wait.
- Offline: conditional query can't fire reliably; show modal without warning block. Known behavior — document for GMs.

**Telemetry events.**
- `start_session_modal_shown` (session_id, warning_shown: boolean, pending_count)
- `start_session_modal_cancelled` (session_id)
- `start_session_modal_proceeded` (session_id, warning_shown: boolean)
- `start_session_review_first_clicked` (session_id, pipeline_run_id)

**Out of scope.** Showing specifically what is pending. Forcing review before proceed. "Don't show again" dismissal — modal always shown; it's the deliberate-confirmation seam.

---

## 12. Dice

Basic dice utility. **Not entities. Ephemeral per-session history.** (`STG-FR-18`, `STG-FR-19`.)

### 12.1 Interaction

Tap Dice (sticky bottom bar) → sheet:

```
┌──────────────────────────────────┐
│ Dice                             │
│                                  │
│  Qty [2]  Die [d20 ▾]  Mod [+3]  │
│                                  │
│            [ Roll ]              │
│                                  │
│  History (this session)          │
│   2d20+3  →  17, 4  · total 24   │
│   1d6     →  3                   │
│   1d20+5  →  18 ✦ CRIT           │
│   1d20    →  1  ✦ FUMBLE         │
└──────────────────────────────────┘
```

- Dice: d4, d6, d8, d10, d12, d20, d100.
- Quantity: 1-10.
- Modifier: -99 to +99.

### 12.2 Crit/fumble flair

Visual only. No mechanical interpretation.

- **Nat 20 on a d20** → result glows amber ~600ms, "CRIT" mono pill.
- **Nat 1 on a d20** → result glows rust ~600ms, "FUMBLE" mono pill.

### 12.3 History

- Per-session, ephemeral. In-memory only (or local SQLite `session_dice_history` if needed for crash recovery — Schema team's call).
- Cleared on End Session.
- Not written to canon, not searchable, not auditable.

### 12.4 Sound

Silent. Haptic on roll (mobile). Sound is a V1 per-saga setting.

### 12.5 Out of scope for V0

- Advantage / disadvantage
- Exploding dice
- System-aware crit ranges (19-20 for some classes etc.)
- Dice macros / saved rolls
- Player-visible roll surface

---

## 13. Gestures

### 13.1 Mobile

| Gesture | Action |
|---|---|
| Swipe up from bottom edge | Open universal action sheet: `Search · Quick capture · Quick stub · Mark moment · Dice · End session` |
| Tap pinned card | Expand to Stage Card |
| Tap expanded card | Collapse |
| Long-press pinned card (500ms) | Quick actions: `Unpin · Open in Sanctum · Copy link` |
| Pull-to-refresh (not recording) | Re-sync packet from server |
| Swipe quick capture left | Mark for review (flag for pipeline) |

### 13.2 Web

| Shortcut | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Open search modal |
| `⌘.` / `Ctrl+.` | Open Quick Capture sheet |
| `⌘'` / `Ctrl+'` | Open Quick Stub sheet |
| `⌘M` / `Ctrl+M` | Mark Moment (when recording) |
| `Esc` | Close any overlay |

A `?` icon in the Stage header reveals the keymap.

---

## 14. End Session

### 14.1 Two-step confirm (`STG-FR-20`)

Tap End Session → modal:

```
End Session 14?

This stops recording, finalizes captures, and
kicks off the post-session pipeline. You can
undo for 60 seconds.

[ Cancel ]    [ End session ]
```

Confirm → state transitions to `ended_pending_undo`. Banner at top of Stage:

```
Session 14 ended. Pipeline starts in 0:57.   [ Undo ]
```

- During 60s: tap Undo → session returns to `in_progress`. Recording resumes if it was on. Captures preserved.
- At 0:00: state transitions to `ended`. Pipeline enqueues (`PSP-FR-3`). Stage returns to dashboard.

### 14.2 Prep workspace relationship during End Session

- While `ended_pending_undo`: the prep workspace remains read-only for this session (it could return to `in_progress`).
- On `ended`: the session record becomes available for retrospective notes only. Prep for the next session happens in a new Prepare workspace.

**v0.4 addition.** On the `ended` transition, the optional one-line summary card (§14.5) appears before Stage returns to dashboard. If the GM saves, the next-session prep briefing (Session Prep Flow §6.3) incorporates the new GM-authored canon summary on next generation. If the GM skips, Session Prep Flow §6.5 fallback CTA offers a second chance.

### 14.3 Saga switch blocked mid-session

Attempted saga switch while session ∈ {`in_progress`, `ended_pending_undo`}: hard block modal: "End Session N first."

### 14.4 Notifications suppressed (`STG-FR-21`)

While session ∈ {`in_progress`, `ended_pending_undo`}: no push or email notifications fire. (Tech Arch §18.9.) Stage stays silent.

### 14.5 Optional one-line summary capture (`STG-FR-23`)

**Purpose.** Capture continuity at peak information density — the moment the session ended. Solves the continuity-hole edge case where the GM ends a session without recording or pasted notes, leaving `compose_prep_briefing` (Session Prep Flow §6.3) with no canon summary to ground on.

**Trigger.** Status transitions `ended_pending_undo → ended` (60s undo expires). Before Stage returns to dashboard.

**Card anatomy.**

```
┌──────────────────────────────────────────────────┐
│                                                   │
│ Session ended.                                    │
│                                                   │
│ Optional: one-line note for next time? It'll      │
│ help the next briefing be sharper.               │
│                                                   │
│ [_________________________________________________]│
│                                                   │
│              [Skip]   [Save as summary]            │
│                                                   │
│ Auto-dismisses in 0:28                            │
└──────────────────────────────────────────────────┘
```

Typography: card title Cormorant 20pt italic ink; body Instrument Sans 14pt stone-700; text field single line, 200-char soft cap; Save amber CTA full-width on mobile; Skip ghost; countdown mono 11pt stone-500; card surface Verdigris-bordered cream card (`session-ended-card` design system token).

**Behavior.**

| Action | Result |
|---|---|
| **Save as summary** | INSERT `notes` row: `note_type='summary'`, `canon_state='canon'`, `created_by='gm'`, `session_id=<this session>`. Synthetic `sources` row `kind='gm_instruction'`. `canon_audit` row `actor_kind='gm'`, transition `— → canon`. Card dismisses. Stage returns to dashboard. |
| **Skip** | Card dismisses. No write. Stage returns to dashboard. |
| **Auto-dismiss** (30s elapsed) | Same as Skip. No write. Typed text is lost (deliberate; no committing typed-but-unsaved state). |

**Why 30 seconds.** Long enough to capture a one-liner; short enough not to feel like a wall between session-end and dashboard. The full post-session pipeline still runs regardless — this card is an optional capture, not a gate.

**Why this bypasses the Approval Queue.** The text is GM-typed (`created_by='gm'`) and writes directly as canon — same path Schema §10.1 provides for manual GM creation. No AI proposal, no editorial gap to review.

**Why this is NOT redundant with the post-session pipeline.** The pipeline produces a `synthesize_session` AI summary draft (must be approved). This card produces a separate GM-authored canon note immediately. Both can coexist. If the GM skips AND the pipeline produces nothing, Session Prep Flow §6.5 fallback offers a second chance.

**Edge cases.**

- Stage backgrounded during the 30s window: card resumes on foreground if <30s elapsed in wall-clock time; if >30s, dismisses on foreground.
- Network drop: write queues via `pending_sync` (Tech Arch §15.4). Same offline pattern as Quick Capture (§9). Writes on reconnect.
- GM types >200 chars: soft-truncated with a chip count display.
- Saga retention `delete_after_synthesis`: unaffected — summary is a separate Saga-scoped `notes` row, not a transcript.

**Telemetry events.**
- `end_session_summary_card_shown` (session_id)
- `end_session_summary_card_saved` (session_id, char_count)
- `end_session_summary_card_skipped` (session_id, was_typed: boolean)
- `end_session_summary_card_auto_dismissed` (session_id, was_typed: boolean)

**Out of scope.** Multi-line / rich text. AI auto-fill. Re-prompting on skip (Session Prep Flow §6.5 handles second chance). Showing this card on retrospective session-end flows from Sanctum.

---

## 15. Offline mode (`OFL-FR-*`)

The full Stage runs offline. (Tech Arch §15.)

### 15.1 What's cached on session start

Mobile SQLite cache (Tech Arch §15.2) hydrates with:
- Active session row + packet.
- All pinned entities (full canon record).
- Recently-searched entities (last 50).
- Saga tag dictionary and relevant World tag/context dictionary.
- All quick captures and stubs for this session (local).

### 15.2 What works offline

| Feature | Offline |
|---|---|
| Search (Literal) | ✓ Local FTS |
| Search (Hybrid) | ✗ Requires network. Toggle greyed. |
| Quick Capture | ✓ Local + queue |
| Quick Stub | ✓ Local + queue |
| Recording | ✓ Chunks local + queue |
| Mark Moment | ✓ Local + queue |
| Dice | ✓ Fully local |
| End Session | ✓ Queues pipeline; pipeline runs on reconnect |
| Open in Sanctum (read-only modal) | Partial — only cached fields render |

### 15.3 Offline state chip

Small chip in Stage header:

| Network | Queue depth | Chip |
|---|---|---|
| Online | — | Hidden (silence = good) |
| Offline | <20 items, <5min | Verdigris: "Offline · captures queued" |
| Offline | 20-100 items OR >5min | Amber: "Offline · sync pending" |
| Offline | >100 items OR storage warning | Rust: "Offline · storage filling" |
| Reconnecting | — | Amber: "Syncing · N items" |

Tap chip → panel showing what's queued.

### 15.4 Conflict handling

Per Tech Arch §15.6, last-write-wins on reconnect. Conflicts surface in Sanctum as "unsynced changes" — **not in the Stage.** The GM is playing and cannot resolve conflicts mid-scene.

### 15.5 Web offline (Tech Arch §15.8)

Web Stage uses React Query cache + Supabase real-time. Short-window offline works. Full network drop on web: recording keeps writing locally (MediaRecorder), entity cache is best-effort. Mobile is the primary and resilience-first Stage surface.

---

## 16. Failure UX consolidated table

| Failure | Behavior | Spec ref |
|---|---|---|
| Storage full mid-recording | Stop. Banner. Preserve partial audio. | §11.6 |
| App backgrounded | Recording continues, state preserved. | §11.6 |
| Mic disconnect | Recording pauses, banner, captures unaffected. | §11.6 |
| Network drop short | Stage usable. Items queue. Chip visible. | §15.3 |
| Network drop long | Same. Complete session offline; pipeline enqueues on reconnect. | §15 |
| Session crash recovery | Re-open: "Session 14 was running. Resume?" One tap → re-hydrate from SQLite. | §15 |
| End Session misclick | Two-step + 60s undo. | §14 |
| Saga switch attempt mid-session | Hard block. | §14.3 |
| Search timeout >800ms | Lexical fallback + inline note. | §8.5 |
| Hybrid search offline | Toggle greyed; "online only" label. | §8.6 |
| Consent change mid-session | GM stops recording. Existing audio per retention setting. | `CON-FR-*` |
| Stub created offline | Local row + queue. Stub badge visible. | §10 |

---

## 17. Out of scope (explicit)

### V0 Stage exclusions

- World-canon promotion from Stage.
- Cross-Saga search or timeline.
- Era editor or World dashboard.

- Initiative tracking / turn order
- Encounter HUD / combat tracker
- Tactical maps, grid overlays, fog of war
- Real-time transcription (live captions)
- Speaker diarization
- AI suggestions during play (unsolicited)
- Per-player views or visibility scopes
- VTT integration
- Stat blocks / mechanical fields (system-agnostic)
- Player character dashboards
- Random generators beyond the single Name utility (deferred to V1)
- Dice mechanics beyond basic
- Custom calendars
- Image generation
- Co-GM collaborative editing
- Music / soundboard

Anything not on this list and not in PRD §3.1 `STG-FR-*` is also out of scope.

### V1 architectural hooks (do not build now, but do not preclude)

These features are V1, but the V0 architecture must allow them to be added without breaking changes:

| V1 feature | V0 prep required | Notes |
|---|---|---|
| Game System binding | `sagas.game_system_id` nullable column; `game_systems` table | See `[[90 - Next Steps Before Coding]]` |
| Stat blocks / mechanical strips on Stage Card | Nullable `mechanical_block` jsonb on `characters`, `artifacts`, future `monsters` | Renderer is system-aware |
| Rulebook PDF RAG | Separate rulebook embeddings store; different retrieval profile | Architectural separation from saga RAG |
| Initiative scene tracker | None — pure Stage feature in V1 over existing schema | Lightweight: name list + initiative + HP. Not combat HUD. |
| Random generators (context-aware) | None at schema level; uses existing retrieval + new `generate_from_context` AI task in V1 | GM-initiated, produces candidate (not canon). Save-to-canon flows through approval. |
| Per-PC dashboard | Builds on existing `is_player_character` flag | System-aware once Game System bound |

---

## 18. Relic Guide and AI behavior summary on Stage

**V0:**
- Relic Guide is available as a collapsible live sidecar/sheet.
- Guide can answer live questions with citations, suggest prompts, draft quick captures/stubs, and prepare edits.
- Hybrid search (`search_for_ui`) remains GM-initiated.
- All capture/stub/recording content stored verbatim. No mid-session AI processing.
- Post-session pipeline begins only on `ended` state (after 60s undo).

**V1 (planned additions):**
- GM-initiated random generators (one tap → one candidate → save or dismiss).
- System-aware Mechanical Strip rendering on Stage Card (deterministic; no per-render AI).
- Continued ban on unsolicited/autonomous AI.

**Locked principle:** AI on Stage is always GM-invoked. Relic Guide can affect the project only through GM-reviewed actions. Low-risk session working-state changes can use inline preview/apply. Canon-impacting changes require inline GM-reviewed commit or Approval Queue draft with provenance. Background AI is forbidden during `in_progress` and `ended_pending_undo` states. Keep the Stage clean and focused; do not turn Guide into autonomous narration.

**Note on v0.4 additions.** The Start Session confirmation modal (§11.7) and the optional one-line summary card (§14.5) are GM-facing prompts with zero AI calls. They are not violations of the AI dormancy principle. The Start Session modal's conditional warning is computed from a database query (not AI inference). The one-line summary card accepts only GM-typed text; no AI processing happens on it during the session window — Memory Spec §6.2 still applies (captures are BM25-only until post-session synthesis).

---

## 19. Implementation notes for engineering

### 19.1 Component file structure (suggested)

```
apps/mobile/src/screens/Stage/
  StageScreen.tsx                 // Top-level container
  components/
    StageHeader.tsx               // Title + offline chip + state pill
    SearchBar.tsx                 // Persistent search with mode toggle
    Agenda.tsx                    // Three collapsible sections
    PinnedList.tsx                // List of pinned cards
    PinnedCard.tsx                // Collapsed/expanded states
    StageCard/
      CharacterCard.tsx           // Type-specific Stage Card renderers
      PlaceCard.tsx
      FactionCard.tsx
      ArtifactCard.tsx
      ThreadCard.tsx
      gmNotesParser.ts            // Extracts voice: / wants: tags
    NotesList.tsx                 // Quick capture list
    QuickCaptureSheet.tsx
    QuickStubSheet.tsx
    StickyActionBar.tsx           // Record + Mark + Dice
    DiceSheet.tsx
    EndSessionConfirm.tsx
    UndoBanner.tsx
    OfflineChip.tsx
    StartSessionConfirm.tsx        // §11.7 — Start Session modal with conditional pending-pipeline warning
    SessionEndSummaryCard.tsx      // §14.5 — optional one-line summary capture after End Session
  hooks/
    useActiveSession.ts
    useSessionCache.ts            // SQLite + Drizzle
    useRecording.ts
    usePendingSync.ts
    usePriorPipelinePending.ts    // §11.7 conditional warning query — prior pipeline state check
  state/
    stageStore.ts                 // Zustand: UI state only
```

### 19.2 Critical state contracts

```ts
// Stage UI state (Zustand, non-persistent)
type StageUIState = {
  activePinnedEntityId: string | null;  // The "active" amber-striped card
  expandedPinnedIds: string[];           // Which cards are expanded
  expandedAgendaSections: Set<'objective' | 'opening_scene' | 'scene_notes'>;
  searchMode: 'literal' | 'hybrid';
  searchQuery: string;
  searchOpen: boolean;
  quickCaptureSheetOpen: boolean;
  quickStubSheetOpen: boolean;
  diceSheetOpen: boolean;
  endSessionConfirmOpen: boolean;
  undoCountdownSeconds: number | null;  // 60..0, null when no undo active
};

// Session state (from Supabase, cached in SQLite)
type SessionState = {
  id: string;
  workspace_id: string;
  world_id: string;
  saga_id: string;
  status: 'planned' | 'ready' | 'started' | 'in_progress' | 'ended_pending_undo' | 'ended';
  title: string;
  objective: string;
  opening_scene: string;
  scene_notes: string;
  started_at: string | null;
  went_live_at: string | null;
  ended_at: string | null;
  consent_recorded: boolean | null;
};
```

### 19.3 Performance budget

- Cold load shell render: <200ms.
- Packet hydration from SQLite: <400ms.
- Search debounce: 150ms.
- Search Stage p50/p95: <300ms / <500ms.
- Search timeout: 800ms (via Postgres `stage_query` role).
- Quick Capture save (optimistic): UI updates <50ms; sync queues async.

### 19.4 Test coverage required

- Airplane mode: full session E2E (start → capture → stub → record → mark → end → reconnect → pipeline enqueue).
- Cold load from terminated app state: <2s to interactive with cached session.
- Consent gate: cannot record without explicit Yes.
- Saga switch attempt during `in_progress`: blocked.
- 60s undo: state transitions correctly on undo and on expiry.
- RLS: Stage cannot read other Workspaces, Worlds, sibling Sagas, or future cross-Saga content even with crafted queries.
- Stage Card parser: voice/wants tags extracted; remaining gm_notes rendered verbatim.

---

## 20. Open questions remaining

These are not blocking the Stage flow but require decisions in adjacent docs:

1. ~~**Marked Moment storage** — separate table vs. array column vs. notes row.~~ **Resolved:** Schema v0.8 uses a separate `session_marked_moments` table.
2. **Dice history persistence** — fully in-memory vs. local SQLite for crash recovery. Owner: [[21 - Tech Architecture]].
3. **Quick Stub on web** — same sheet as mobile or richer Sanctum-style mini-form? Owner: UI Implementation Spec after Stage mobile prototype.
4. **Stage Card link rendering** — clickable name only, or full entity peek on hover (web only)? Owner: UI spec phase.

---

*End of Stage UX Flow v0.6 vault copy. Ready for UI Implementation Spec and coding-agent consumption.*


---

## 21. Priority 7 Stage closeout

### 21.1 Alpha distribution

Stage ships first inside the web app as part of the full web Sanctum/Stage loop. The mobile implementation follows through Expo preview/EAS internal builds once the web loop is stable. TestFlight and Android internal test follow once recording, upload, offline queue, and End Session are stable. Store release is not required for private alpha.

### 21.2 Notification tap behavior

| Notification | Tap target |
|---|---|
| `session_ready_for_stage` | `/stage/:sessionId` if the packet is cached or fetchable. |
| `pipeline_ready` | Sanctum review route; on mobile, open the mobile Review layout with source sheets and conflict-safe actions. |
| `pipeline_failed` | Failed pipeline card with retry/manual-summary fallback. |
| `quota_blocked` | Settings → Usage. |

### 21.3 Stage-safe failure UX

Stage failure states must be quiet, recoverable, and non-blocking:

- Search timeout → retry BM25-only and show `Showing quick matches only` if needed.
- AI unavailable → hide/disable AI-triggering assist surfaces; never interrupt session flow.
- Recording local save failure → Rust banner, stop safely, preserve any completed chunk, offer retry.
- Upload failure → keep local chunks, show queued/offline state.
- Quota blocked after recording → allow saving audio; block transcription with manual-summary fallback.
- Sync conflict → never overwrite silently; show conflict after the live session or in Sanctum.

### 21.4 Web evidence durability contract

The web-first Stage records immutable ~30-second chunks. Each completed browser chunk is written to IndexedDB before upload begins, then uploaded directly with the authenticated Supabase client to the deterministic `audio/<workspace_id>/<world_id>/<saga_id>/<session_id>/<sequence>.<ext>` path and registered through `register_audio_chunk`. Storage upload and chunk registration may both be retried with the same sequence and idempotency key. A failed attempt never deletes the local Blob.

The fixed five-action wireframe rail remains `Record · Note · Dice · Create · End Session`. **Mark Moment lives as a recording-only secondary action inside Note** with an optional short label. This preserves the rail while keeping the evidence action discoverable in two taps.

The web Stage and its recording sheet expose the evidence queue as `queued`, `uploading`, `failed`, or `recovered`. Reconnect and later app loads resume queued uploads from IndexedDB. Recovery is session-scoped and must complete chunk registration before transcription is enqueued.

Ending a recorded session records the expected chunk count. Transcription becomes eligible only after the session is `ended` and every expected chunk is registered. `ended_pending_undo` expiry is server-owned through a scheduled database finalizer, so closing the browser cannot strand the lifecycle. Late recovered chunks remain registrable for ending/ended sessions and can complete the same idempotent transcription enqueue path.

### 21.5 Out of scope remains unchanged

No real-time transcription, speaker diarization, initiative tracker, encounter tracker, tactical map, proactive AI, or deep approval workflow during live play.




