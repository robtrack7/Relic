---
status: active
authority: secondary
scope: mvp
read_after:
  - "[[00 - Start Here]]"
depends_on:
  - "[[00 - Start Here]]"
supersedes: []
last_audited: 2026-07-30
source_file: "Sourced - Downloaded - 260518/relic-session-prep-flow-v0_2.md"
---

> [!info] How to use this spec
> Owns: Session prep workspace, packet handoff, Ready for Stage, and prep AI assists.
> Does not own: Historical rationale and superseded naming unless explicitly retained as an internal identifier.
> Read next: [[00 - Start Here]]
> Implementation-critical note: Treat this as coding input only after reading the authority order in [[00 - Start Here]].
# Relic Session Prep Flow v0.2

*Priority 7 technical closeout revision. Last updated May 2026.*

**Prep parity implementation patch (July 2026).** Home and full Prepare use the same manual editor and scoped persistence contract. An 800ms/blur autosave keeps an owner/Workspace/World/Saga/Session local draft until the exact server version succeeds, surfaces saving/saved/offline/failed/conflict/retry states, and never silently overwrites a stale row. Planned and Ready Sessions are editable; started/live/ending/ended and otherwise locked Sessions are read-only.

**Packet E4 Session Prep AI patch (July 2026).** Prep AI uses one recoverable, GM-owned, Session-scoped invocation/result boundary with frozen source snapshots and exact logical retry. Provider completion may persist only job/result/review metadata; it never updates `sessions`, pins, Threads, entities, canon, or `pending_prep_suggestions`. Every result shows its sources or explicit insufficiency. An accepted text/pin/Thread suggestion is first merged into the current local D4 editor and reaches the Session only after the existing optimistic autosave succeeds. An accepted NPC candidate or Quick Stub fleshing result routes to a pending C5-reviewed draft; it does not create or update canon inline. Reject, dismiss, provider/retrieval failure, quota denial, refresh, and restart preserve both manual Prep and unresolved suggestion state.

**Packet E9 Loom workflow patch (August 2026).** The Loom may create a planned Session, open the owning Prep/Stage/Review route, and explicitly dispatch one registered Prep task after displaying its 1/3/10-credit cost. The handoff reuses the E4 request, quota, evidence, retry, and runner boundary. The Loom does not bulk-accept Prep output: reviewed text/pin/Thread application still merges into the recoverable local editor and autosaves optimistically, Quick Stub acceptance still produces a pending Approval Queue draft, and an NPC candidate still needs a separate reviewed 3-credit draft follow-up. Prep dispatch is unavailable once the Session is live or ended.

**Source of truth inputs:** `[[11 - Product Basepoint]]`, `[[12 - MVP PRD]]`, `[[20 - Entity and Canon Schema]]`, `[[23 - AI Task Registry]]`, `[[22 - Memory and Retrieval]]`, `[[21 - Tech Architecture]]`, `[[32 - Stage UX Flow]]`, `[[34 - UI Implementation Spec]]`, `[[25 - Pricing and Rate Limits]]`, `[[13 - Design System]]`.

---

## 0. Purpose

This document defines the MVP Prepare workspace inside **The Sanctum**.

Session prep is not a third product surface. It is the Sanctum workflow, reached through the `Prepare` rail item and session context, that turns current Saga state into a practical **Session Packet** for The Stage.

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
- Open the resulting packet in The Stage from Prepare or live-session context.

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
| Left rail → Prepare | Opens the active, ready, or next planned session prep workspace; if none exists, prompts New session. |
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
- `planned_date` plus `planned_start_at` for an optional distinguishable date/time.
- `objective`.
- `opening_scene`.
- `scene_notes`.
- `prep_checklist`.
- `session_pinned_entities`.
- `session_active_threads`.
- `packet_locked_at`.
- `updated_at` as the optimistic Prep version; `archived_at` and `duplicated_from_session_id` support state-valid actions without deleting history.

Prep may reference World-canon records, but session writes remain Saga-scoped.

Entity and Thread pins retain explicit order. A pin whose target is archived or no longer readable remains a safe non-identifying recovery row: the GM may unpin it, intentionally retain a recoverable archived target, or add a valid same-Saga replacement. New cross-Saga substitutions are rejected. Missing, deleted, or permission-denied targets never break packet loading.

---

## 4. Workspace layout

Use the Sanctum shell from `[[34 - UI Implementation Spec]]`.

### Web Sanctum

Primary panels:

1. **Session brief** — title, date, objective, opening scene.
2. **Agenda / scenes** — editable notes, beats, reminders.
3. **Context rail** — active threads, pinned entities, recent canon changes, loose threads.
4. **Relic Guide sidecar/sheet** — GM-invoked, quota-gated, cited prep help and reviewed actions.
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

Ready first flushes the current local editor state and proceeds only after that exact version is persisted. Stage therefore reads the latest successfully saved relational packet; it does not consume an unsaved browser draft.

---

## 6. AI assists

All AI assists are explicit GM actions. No assist auto-runs during live play.

| Assist                      | Registry task                 | Retrieval profile        | Output state          | Commit behavior                      |
| --------------------------- | ----------------------------- | ------------------------ | --------------------- | ------------------------------------ |
| Generate prep checklist     | `generate_session_prep`       | `session_prep_grounding` | Ephemeral proposal    | GM inserts selected items.           |
| Compose briefing            | `compose_prep_briefing`       | `session_prep_grounding` | Recoverable read-only result | Stored outside the Session; GM may dismiss or copy manually. |
| Suggest scene beats         | `propose_scene_beats`         | `session_prep_grounding` | Ephemeral cards       | GM inserts selected beats.           |
| Suggest thread complication | `propose_thread_complication` | `sanctum_grounding` | Ephemeral cards       | GM inserts or discards.              |
| Suggest NPC for scene       | `propose_npc_for_scene`       | `session_prep_grounding` | Candidate cards       | Selected candidate separately preflights `draft_entity_from_prompt` and creates only a pending reviewed draft. |
| Flesh quick stub            | `propose_quick_stub_fleshing` | `post_session_synthesis` | Ephemeral update proposal | Explicit acceptance creates a pending update draft for the Approval Queue. |

AI output must show source context and uncertainty. Prep assists may be discarded without audit because they are not canon until inserted/saved by the GM.

E4 generation results are immutable provider outputs. Edit-before-accept is stored as review metadata, not written back into the provider result. Accepting a Session-field suggestion uses the live editor value and current optimistic version, so a result generated against older Prep can never overwrite newer GM edits. The result becomes `accepted` only after the D4 autosave confirms the exact merged version. A failed or stale save leaves the result pending and the local editor draft recoverable.

**Post-session implication handoff (C5).** Approval of a C3 next-prep implication appends a source-linked pending `scene_notes` suggestion only to the exact next Session while it remains `planned`. Approval does not directly alter the briefing, objective, scene notes, pins, active Threads, or checklist. The GM still accepts or dismisses the pending suggestion through the normal Session Prep path, and all related entity/Thread IDs must resolve inside the same Saga.

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

Manual Prep never invokes an AI provider. The prior-session card reads the latest approved ended-Session summary when present and otherwise shows a concise safe fallback from already-authorized Session context. It does not generate text or write canon.

---

## 8. Ready for Stage

The GM can mark a session Ready for Stage when at minimum:

- Session has a title.
- Session has an objective or opening scene.
- At least one agenda/scene note, pinned entity, active thread, or checklist item exists.

On Ready for Stage:

1. Flush and confirm the latest autosave of all session fields.
2. Set `packet_locked_at = now()`.
3. Confirm Stage packet preview.
4. Show `Open this session in Stage`; route to mobile deep link if available.

Stage is not a default navigation rail destination. It is opened from this Ready/Open Stage handoff, the current session pill, Home next-action cards, notification/deep link, app/crash resume, or `Return to Stage` while live.

`packet_locked_at` is informational. GMs may still edit after locking.

---

## 9. Acceptance criteria

- A GM can create Session 1 from first-run in under two minutes after scaffold commit.
- A GM can create a blank planned session without AI.
- A GM can pin/unpin entities and active threads.
- A GM can add, remove, reorder, refresh, and safely recover entity and Thread pins without losing order or leaking sibling-Saga targets.
- Home and full Prepare expose the same shared fields and actions and converge after successful save/refresh.
- Multiple future Sessions may coexist and remain distinguishable by title, number, and optional scheduled date/time.
- Reset, Archive, and Duplicate actions appear only for states where the existing Session state machine permits them.
- Each saved active-Thread selection remains Session-scoped evidence. Thread detail may project that row as read-only pin/carry-forward history; Prep does not edit timeline entries or mutate Thread state implicitly.
- AI prep suggestions are never committed automatically.
- Ready for Stage produces a readable Stage packet.
- Quota and provider failures never erase manual prep.
- Session prep uses `workspace_id`/`world_id`/`saga_id` boundaries consistently through parent records.

---

*End Session Prep Flow v0.2. Active MVP implementation source.*
