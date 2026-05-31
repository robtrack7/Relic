---
status: active
authority: secondary
scope: mvp
read_after:
  - "[[00 - Start Here]]"
depends_on:
  - "[[00 - Start Here]]"
supersedes: []
last_audited: 2026-05-20
source_file: "Sourced - Downloaded - 260518/relic-session-prep-flow-v0_2.md"
---

> [!info] How to use this spec
> Owns: Session prep workspace, packet handoff, Ready for Stage, and prep AI assists.
> Does not own: Historical rationale and superseded naming unless explicitly retained as an internal identifier.
> Read next: [[00 - Start Here]]
> Implementation-critical note: Treat this as coding input only after reading the authority order in [[00 - Start Here]].
# Relic Session Prep Flow v0.2

*Priority 7 technical closeout revision. Last updated May 2026.*

**Source of truth inputs:** `[[11 - Product Basepoint]]`, `[[12 - MVP PRD]]`, `[[20 - Entity and Canon Schema]]`, `[[23 - AI Task Registry]]`, `[[22 - Memory and Retrieval]]`, `[[21 - Tech Architecture]]`, `[[32 - Stage UX Flow]]`, `[[34 - UI Implementation Spec]]`, `[[25 - Pricing and Rate Limits]]`, `[[13 - Design System]]`.

---

## 0. Purpose

This document defines the MVP session-prep workspace inside **The Sanctum**.

Session prep is not a third top-level product mode. It is the Sanctum workflow that turns current Saga state into a practical **Session Packet** for The Stage.

**Core promise:**

> The GM can prep the next session from current canon, active threads, loose consequences, pinned entities, and conservative AI suggestions, then send a quiet, usable packet to The Stage.

---

## 1. Scope

### MVP

- Create and edit a planned session.
- Add objective, opening scene, scene notes, prep checklist, active threads, known consequences, and pinned entities.
- Generate conservative prep suggestions from approved canon and selected raw/session material.
- Review AI suggestions inline before saving them.
- Mark the session **Ready for Stage**.
- Open the resulting packet in The Stage.

### P1

- Broader offline prep packet management beyond the current Stage-ready session.
- Better prep templates by game system.
- Richer Thread Timeline integration.

### V1 / deferred

- Full custom calendars.
- Initiative or encounter tracking.
- Tactical scene maps.
- VTT export/integration.
- Automated rules mechanics.
- Autonomous prep generation.

---

## 2. Entry points

| Entry | Behavior |
|---|---|
| Sanctum home → Prep next session | Opens next planned session or creates one. |
| First-run commit → Plan Session 1 | Creates Session 1 with scaffolded context. |
| Session list → New session | Creates blank planned session. |
| Approval Queue completion → Prep from consequences | Opens next session with newly approved changes available as context. |
| Stage End Session → post-session complete | Routes to prep workspace after review/approval when the GM chooses to continue. |

---

## 3. Data contract

Session prep writes to `sessions` and related junction tables.

Required MVP fields:

- `workspace_id` through parent World/Saga tenancy.
- `world_id` through parent Saga.
- `saga_id`.
- `session_id`.
- `name`.
- `session_number`.
- `planned_date`.
- `objective`.
- `opening_scene`.
- `scene_notes`.
- `prep_checklist`.
- `session_pinned_entities`.
- `session_active_threads`.
- `packet_locked_at`.

Prep may reference World-canon records, but session writes remain Saga-scoped.

---

## 4. Workspace layout

Use the Sanctum shell from `[[34 - UI Implementation Spec]]`.

### Web Sanctum

Primary panels:

1. **Session brief** — title, date, objective, opening scene.
2. **Agenda / scenes** — editable notes, beats, reminders.
3. **Context rail** — active threads, pinned entities, recent canon changes, loose threads.
4. **AI assist drawer** — GM-invoked only, quota-gated.
5. **Ready for Stage panel** — packet preview, missing items, send/open in Stage.

### Mobile Sanctum / narrow layout

- Single-column stacked cards.
- Editing remains possible through a mobile-appropriate layout with sheets and stacked sections.
- Mobile follows after the web app, but it carries the same Sanctum/Stage product model rather than a reduced support-only mode.

---

## 5. Session packet

The Session Packet is the stable handoff from Sanctum to Stage.

Packet includes:

- Session title and number.
- Objective.
- Opening scene.
- Scene notes.
- Prep checklist.
- Active threads.
- Pinned NPCs, locations, factions, items, notes, and thread cards.
- Key reminders.
- Consent/recording setting state.

Packet generation does not copy canon into a separate permanent fork. Stage reads current canonical entities by ID plus session-specific order and notes.

---

## 6. AI assists

All AI assists are explicit GM actions. No assist auto-runs during live play.

| Assist                      | Registry task                 | Retrieval profile        | Output state          | Commit behavior                      |
| --------------------------- | ----------------------------- | ------------------------ | --------------------- | ------------------------------------ |
| Generate prep checklist     | `generate_session_prep`       | `session_prep_grounding` | Ephemeral proposal    | GM inserts selected items.           |
| Compose briefing            | `compose_prep_briefing`       | `session_prep_grounding` | Read-only cached briefing | Cached on session; GM may copy manually. |
| Suggest scene beats         | `propose_scene_beats`         | `session_prep_grounding` | Ephemeral cards       | GM inserts selected beats.           |
| Suggest thread complication | `propose_thread_complication` | `sanctum_grounding` | Ephemeral cards       | GM inserts or discards.              |
| Suggest NPC for scene       | `propose_npc_for_scene`       | `session_prep_grounding` | Candidate cards       | Selected candidate routes through `draft_entity_from_prompt`. |
| Flesh quick stub            | `propose_quick_stub_fleshing` | `post_session_synthesis` | Draft update proposal | Routes through draft/approval path.  |

AI output must show source context and uncertainty. Prep assists may be discarded without audit because they are not canon until inserted/saved by the GM.

---

## 7. Quota and failure behavior

Before any AI prep assist, call quota preflight from `[[25 - Pricing and Rate Limits]]`.

Failure states:

| Failure | UX |
|---|---|
| `quota_blocked` | Show quota card and preserve current prep form state. |
| `provider_failed` | Show retry action and keep last successful prep state. |
| `partial_output` | Show partial cards with warning; GM may keep, discard, or retry. |
| `validation_failed` | Show safe fallback: create/edit manually. |
| `network_failed` | Save local form state and retry sync when available. |

Failures never delete existing prep.

---

## 8. Ready for Stage

The GM can mark a session Ready for Stage when at minimum:

- Session has a title.
- Session has an objective or opening scene.
- At least one agenda/scene note, pinned entity, active thread, or checklist item exists.

On Ready for Stage:

1. Save all session fields.
2. Set `packet_locked_at = now()`.
3. Confirm Stage packet preview.
4. Route to mobile deep link if available, or show “Open this session in Stage.”

`packet_locked_at` is informational. GMs may still edit after locking.

---

## 9. Acceptance criteria

- A GM can create Session 1 from first-run in under two minutes after scaffold commit.
- A GM can create a blank planned session without AI.
- A GM can pin/unpin entities and active threads.
- AI prep suggestions are never committed automatically.
- Ready for Stage produces a readable Stage packet.
- Quota and provider failures never erase manual prep.
- Session prep uses `workspace_id`/`world_id`/`saga_id` boundaries consistently through parent records.

---

*End Session Prep Flow v0.2. Active MVP implementation source.*
