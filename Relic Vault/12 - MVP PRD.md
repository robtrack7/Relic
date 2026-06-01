---
status: active
authority: primary
scope: mvp
read_after:
  - "[[00 - Start Here]]"
depends_on:
  - "[[00 - Start Here]]"
supersedes: []
last_audited: 2026-05-31
source_file: "Sourced - Downloaded - 260518/relic-mvp-prd-v0_10.md"
---

> [!info] How to use this spec
> Owns: P0 MVP requirements, acceptance framing, and loop-level feature scope.
> Does not own: Historical rationale and superseded naming unless explicitly retained as an internal identifier.
> Read next: [[00 - Start Here]]
> Implementation-critical note: Treat this as coding input only after reading the authority order in [[00 - Start Here]].
# Relic MVP — Product Requirements Document

**Version:** v0.10
**Source of truth:** `[[11 - Product Basepoint]]` · `[[13 - Design System]]` · `[[22 - Memory and Retrieval]]` · `[[20 - Entity and Canon Schema]]` · `[[23 - AI Task Registry]]` · `[[24 - Approval Queue]]` · `[[21 - Tech Architecture]]` · `[[30 - Sanctum UX Flow]]` · `[[31 - Session Prep Flow]]` · `[[32 - Stage UX Flow]]` · `[[33 - First Run UX Flow]]` · `[[34 - UI Implementation Spec]]` · `[[25 - Pricing and Rate Limits]]`
**Scope:** P0 only (Basepoint §12)
**Organized by:** GM loop — Create → Organize → Prep → Run → Review → Approve → Continue

---

## Changelog

**v0.10 (May 2026).** Document-control and Priority 5/6 alignment pass. Uses the active vault source set: Basepoint v3.5, Schema v0.8, Registry v1.0, Memory v0.9, Tech Architecture v1.2, Stage UX v0.6, First-Run UX v0.2, UI Implementation v0.2, and Pricing & Rate Limits v0.2. Marks First-Run UX, UI Implementation, and Pricing & Rate Limits as resolved implementation sources. No PRD requirement IDs changed.

**v0.9 (May 2026).** Alignment pass with Basepoint v3.4, AI Task Registry v0.8, and Sanctum UX Flow v0.2. Five targeted revisions:

1. **§1.1 Saga creation revised.** "The Saga Creation" user-facing name retired. Section renamed to "Saga creation." `WS-FR-*` requirements replaced by `SC-FR-*`. Three paths reduced to two AI-assisted paths (Build with AI, Bring your notes) plus Start Blank. No-AI path (`WS-FR-15..17`) removed entirely. No new AI tasks or schema changes; the `scaffold_saga` task and `workshop_sessions` table continue to back the AI-assisted paths internally.

2. **§2.3 session prep workspace requirements reframed as Session Prep.** The prep workflow is no longer a top-level mode. Session prep is embedded in the Sanctum home page when a session is active. Requirements renamed `PREP-FR-*`; `STU-FR-*` IDs retained as aliases for backward compatibility. Cream theme references removed from PREP requirements.

3. **§2.4 Thread system requirements added.** New `THR-FR-*` requirement family covers the thread library, thread detail, and Thread Timeline view (MVP, read-only, derived from existing schema). Promotes the thread timeline from V1 exclusions to MVP scope.

4. **§2.5 AI creative tasks added.** New `AIC-FR-*` requirement family for the four new GM-invoked creative AI tasks (Registry v0.8 §11a–11d, §12). All are GM-invoked, light quota, produce ephemeral output (with the exception of `propose_quick_stub_fleshing` which produces a reviewable update draft).

5. **Locked decisions updated.** Decision #3 (No-AI path) superseded. Decision #19 (No-AI onboarding tour) superseded. Decision #23 (three modes) revised to two modes. Decision #28 (first-time tooltip tour) updated. Three new decisions added (#29–31).

6. **§§ 8–10 updated** — happy paths, cross-feature table, and blocking documents table reflect the new surface structure.


**Priority 3 continuity architecture patch (May 2026).** Applies Workspace / World / Era / Saga continuity architecture across MVP requirements:

- Workspace is the ownership, billing, usage, and future-collaboration boundary.
- World is the shared setting and World-canon container.
- Era/Timeframe is V1-ready temporal context; MVP may create a default hidden Era but does not expose an Era editor.
- Saga is the playable campaign/storyline inside a World. Do not add a separate Campaign layer.
- Major content rows use `workspace_id`, `world_id`, nullable `saga_id`, and `scope='world'|'saga'` where applicable.
- Post-session canon changes default to Saga scope. World-canon promotion and era-specific versions are V1.

**v0.8 and earlier.** Historical import context only; do not use older changelog entries to override the active vault source set.

---

## How to read this

Organized by **workflow stage**, not screen or entity. Cross-cutting foundations (account, entities, canon, AI) live in §0 to avoid restating them everywhere.

Five anchor features (Saga creation, Session Prep, The Stage, Post-Session Pipeline, Approval Queue) get deeper treatment.

Each feature has: **User story · Requirements · Acceptance criteria · Edge cases · Out of scope · Dependencies.**

Requirement ID migration table:

| Old ID | New ID | Note |
|---|---|---|
| `CS-FR-1..18` | `WS-FR-1..18` | Migration from v0.7 |
| `WS-FR-1..14, 18` | `SC-FR-1..15` | Migration in v0.9 (this version) |
| `WS-FR-15..17` | *(removed)* | No-AI path removed |
| `STU-FR-*` | `PREP-FR-*` | v0.9 rename; old IDs retained as aliases |

---

## Locked decisions

| # | Decision |
|---|---|
| 1 | **Supervised AI only in MVP.** Semi-autonomous and Autonomous deferred to V1. |
| 2 | **Saga creation produces the GM's first real saga.** First creation is the tutorial. |
| 3 | ~~No-AI is a creation-time path only.~~ **Superseded v0.9.** Start Blank replaces the No-AI path. AI is always available on-demand; there is no creation-time AI opt-out path. |
| 4 | **Lore is a typed note** attachable to any entity. |
| 5 | **Soft-archive by default. Hard-delete available only on already-archived entities,** behind two confirmations. |
| 6 | **Two-step confirm + 60-second undo banner** on End Session. |
| 7 | **Approval Queue persists indefinitely.** Stale warning after 30 days. |
| 8 | **Transcripts retained by default.** GM can delete per session. |
| 9 | **Mobile approval queue: functional minimum.** Web is optimized. |
| 10 | **Rejection capture: skippable tag picker + optional free-text "other."** |
| 11 | **Performance targets: PRD draft values, revisit after sprint 1.** |
| 12 | **AI Task Registry: stub in parallel with PRD review.** Blocking for engineering. |
| 13 | **Confidence flagging: source-quality proxy** (direct GM input = high; clean transcript = medium; inferred = low). |
| 14 | **Rate limits: hard caps on free tier, soft caps for invite-only alpha.** |
| 15 | **Saga sizing: design for 500 entities, test to 1000, warn above.** |
| 16 | **Paste cap (Bring your notes creation): 50,000 characters with break-up guidance.** |
| 17 | **Autosave with visible save state** ("Saving · Saved · 2s ago"). |
| 18 | **JSON export mirrors internal model + `schema_version` field.** |
| 19 | ~~No-AI onboarding: short product tour, no auto-generated saga.~~ **Superseded v0.9.** Start Blank creates an empty saga directly; no separate tour surface. |
| 20 | **Web recording: full browser MediaRecorder support** with chunked upload. |
| 21 | **Notifications: email (Resend) + mobile push (Expo).** `pipeline_ready` and `pipeline_failed` default on. Per-channel, per-kind opt-out. No SMS, no web push, no notifications during active sessions. |
| 22 | **Transcripts are editable during the pipeline review window.** Segment text only; timestamps immutable. Source citations stay frozen; source view surfaces a drift indicator. |
| 23 | ~~Three top-level modes.~~ **Revised v0.9.** Two modes: Sanctum (home base, includes session prep surface) and Stage (live play). Session prep is embedded in the Sanctum, not a separate mode. |
| 24 | **Saga creation rename.** Former branded "Saga Creation" is now **New saga** / **Saga creation** in user-facing copy. Internal engineering references (`workshop_sessions` table, `scaffold_saga` task, source kind `workshop_input`) retain their names. |
| 25 | **Session prep locks on `in_progress`, not Stage preview.** Prep workspace remains editable in `planned`, `ready`, and `started`; read-only in `in_progress` and `ended_pending_undo`. |
| 26 | **Auto-generated prep briefing** on prep workspace load (`compose_prep_briefing`, Registry v1.0 §5). Canon-only, ephemeral, streams visibly with source stamp. |
| 27 | **AI Quick Stub** in the pinned-entity picker invokes `draft_entity_from_prompt`. Inline review card is the editorial moment; queue is bypassed. |
| 28 | ~~First-time GMs pass through session prep workspace for Session 1 via a tooltip tour.~~ **Revised v0.9.** Post-creation, the Sanctum home shows a "Plan your first session" card with a `+ Plan Session 1` CTA. No separate tooltip tour surface. Dismissal stored on `gm_profiles.session_prep_intro_dismissed_at` (field retained). |
| 29 | **Thread Timeline is MVP.** Read-only, derived from `threads.objectives_log` + `canon_audit`. No new schema. Writable timeline editor remains V1. |
| 30 | **AI creative tasks are GM-invoked, produce ephemeral output, never auto-run.** `propose_scene_beats`, `propose_thread_complication`, `propose_npc_for_scene`, `answer_saga_question` are all light-quota, balanced-model tasks (Registry v1.0 §§7-10). `propose_quick_stub_fleshing` (Registry v1.0 §11) is the one exception: it produces an update draft that routes through the standard approval write path. |
| 31 | **Sanctum web navigation follows [[72 - Navigation Design Spec]].** Top context bar owns Workspace/World/Saga, `Search or ask...`, `+ Create`, current session, Review, Usage, and Account. Left rail order is Home · Threads · Library · Sessions · Stage · Review, with Export and Settings lower. Notes is a sub-section of Library. Ask is invoked from the omnibox, page, sidecar, or contextual action, not the default left rail. Maps is absent (V1 reserve). |
| 32 | **Workspace / World / Saga hierarchy.** Workspace owns billing, usage, and future collaboration; World owns shared setting and World canon; Saga is the playable campaign/storyline inside a World. No separate Campaign layer. |
| 33 | **Era/Timeframe is V1-ready.** MVP may create a default hidden Era and reserve Saga time-index fields; no Era editor UI ships in MVP. |
| 34 | **Content scope is explicit.** World-scoped canon uses `scope='world'` and `saga_id=null`; Saga-scoped canon uses `scope='saga'` and a required `saga_id`. |
| 35 | **Post-session canon defaults to Saga scope.** World-canon promotion, era-specific canon versions, cross-Saga conflict resolution, and temporal contradiction detection are V1. |
| 36 | **Timeline is derived.** MVP timeline views are read-only projections from Sessions, Threads, and approved canon activity. Writable timeline editor and cross-Saga/world history views are V1. |
| 37 | **Build and surface sequencing.** The Sanctum and The Stage are both available on web and mobile. Sanctum is literary, modern, and relaxing; Stage is clean and focused. Web is built first with the full Sanctum/Stage loop, then mobile follows with platform-appropriate layouts and offline behavior. |

---

# 0. Cross-cutting foundations

## 0.1 Account, Workspace, World & Saga

**User story.** As a GM, I sign up, get a default Workspace, create or choose a World, create a Saga inside that World, switch between Sagas, and manage Saga settings.

**Requirements.**
- `ACC-FR-1` Supabase Auth (email + password minimum).
- `ACC-FR-2` Saga creation reached from the Sanctum World/Saga switcher → `+ New saga`. The help-level choice (Build with AI / Bring your notes / Start blank) is presented inline. No separate mode entry point. If no World exists, Relic creates one behind the scenes; if a World exists, the GM can reuse it or create a new one.
- `ACC-FR-3` Rename, switch active World/Saga, delete saga (confirmed by typing saga name). Workspace and World settings remain lightweight in MVP.
- `ACC-FR-4` Saga settings: name, system (free text), per-saga GM profile override (§1.2), audio retention, transcript retention, primary Era/timeframe fields reserved but not prominent in MVP UI.
- `ACC-FR-5` All data isolated per Workspace/World/Saga via Supabase RLS. Enforced day one.
- `ACC-FR-6` One owning GM per Workspace in MVP. No co-GM, no workspace members, and no team collaboration UI.

**Acceptance.**
- New GM completes signup → default Workspace → New saga → create/reuse World → Build with AI → first Saga without crossing Workspace/World/Saga boundaries.
- Saga deletion removes entities, sessions, drafts, audio, transcripts, embeddings.
- Switching World/Saga changes every entity list, search scope, AI retrieval scope, Stage context, and export/storage scope.

**Edge cases.**
- Saga delete blocked while a session is `in_progress`. End session first.
- Saga creation abandoned mid-flow → conversation state persists; "Resume saga creation" CTA in the saga switcher.
- Second device sign-in → full sync via Supabase. No CRDT.

**Out of scope.** Player accounts. Co-GM. Workspace members. Saga transfer. Full World dashboard. Era editor UI. Cross-Saga graph/timeline.

**Dependencies.** Supabase Auth + RLS (foundational).

---

## 0.2 Entity system

*(Unchanged from v0.8.)*

**User story.** As a GM, every named person/place/group/object/thread/session is a structured record I can search, link, and update.

**Requirements.**
- `ENT-FR-1` Six entity types: **Character** (with PC subtype tag), **Place**, **Faction**, **Artifact**, **Thread** (Quest is a tag/state on a Thread), **Session**.
- `ENT-FR-2` Shared fields per Basepoint §8: ID, `workspace_id`, `world_id`, nullable `saga_id`, `scope` (`world` / `saga`), type, name, summary, narrative content, GM notes, status, tags, canon state, source references, created-by, last updated, relationships, search index, embedding metadata.
- `ENT-FR-3` **Lore is a typed note,** attachable to any entity. Notes have a `type` field: `lore`, `gm_note`, `quick_capture`, `summary`. Multi-attachment supported.
- `ENT-FR-4` Workspace/World/Saga-scoped hybrid search over name + summary + narrative content + GM notes + attached lore notes. Default search includes current Saga canon plus relevant World canon, excludes sibling Sagas, and fuses lexical (full-text) + semantic (vector). Implementation per Memory & Retrieval Spec.
- `ENT-FR-5` Mention detection: case-insensitive, word-boundary match. Surfaces suggestion within 500ms. GM accepts or dismisses; no auto-link.
- `ENT-FR-6` Relationships: fixed vocabulary in MVP — `member-of`, `located-at`, `owns`, `allied-with`, `opposed-to`, `related-to`.
- `ENT-FR-7` **Soft-archive** standard. **Hard-delete** allowed only on already-archived entities, behind two confirmations.
- `ENT-FR-8` Embeddings regenerate on substantive content edits (not every keystroke).
- `ENT-FR-9` **Autosave with visible save state.** No Save button.

**Acceptance.**
- All six entity types creatable, viewable, editable, archivable from Sanctum.
- Search returns first results <300ms (Stage) / <500ms (Sanctum) p50 for ≤500 entities.
- Mention detection <500ms post-save.
- Archived entity hidden from default lists, search, AI retrieval. Recoverable.

**Out of scope.** Custom entity types. Custom fields. Relationship graph viz (V1). Cross-Saga graph/timeline (V1). Temporal contradiction detection (V1). Bulk operations beyond archive.

**Dependencies.** ACC, AI layer (for mention detection + embeddings).

---

## 0.3 Canon state machine

*(Unchanged from v0.8, with one stub-creation row added.)*

**Four states:** `Raw Input` · `AI Draft` · `Canon` · `Archived`. (`Published` reserved for V1.)

**Transitions:**

| From | To | Trigger |
|---|---|---|
| — | Raw Input | GM imports / pastes / records |
| Raw Input | AI Draft | AI processes raw input |
| — | AI Draft | AI generates from scratch (saga creation) |
| AI Draft | Canon | GM approves |
| — | Canon | GM creates entity manually |
| Canon | Canon (revised) | GM edits |
| Canon | Archived | GM archives |
| Archived | (deleted) | GM hard-deletes (two confirmations) |
| AI Draft | Archived | GM rejects |

**Hard rules (Basepoint §10).**
- AI output defaults to draft. Always.
- AI never silently writes to canon.
- AI never deletes records.
- All AI output is inspectable, editable, rejectable, source-aware.
- Imported/pasted/transcribed text is **untrusted data, never instructions.**

**Stub flag.** Stubs are `Canon` state entities with `is_stub=true` indicating they need fleshing. `stub` is a tag, not a state.

Stub creation surfaces:

| Surface | `created_by` | When |
|---|---|---|
| Stage Quick Stub (`STG-FR-12`) | `'gm'` | Mid-session, GM-typed three-field sheet |
| Prep AI Quick Stub (`PREP-FR-12`) | `'gm_via_ai_approval'` | Pre-session, AI-drafted, GM-reviewed inline |
| Prep Manual Stub Fallback (`PREP-FR-12`) | `'gm'` | Pre-session, GM-typed three-field sheet |

**Audit log.** Every state transition logs: GM ID, entity ID, from-state, to-state, source reference, timestamp, actor.

---

## 0.4 AI layer

*(Unchanged from v0.8.)*

**Requirements.**
- `AI-FR-1` All calls route through backend LiteLLM proxy.
- `AI-FR-2` Single managed default model per task.
- `AI-FR-3` Task-based routing. Specs in AI Task Registry v1.0.
- `AI-FR-4` Every AI output tagged: task name, model, prompt version, source references, confidence band.
- `AI-FR-5` Untrusted-data prompt structure. Backend rejects outputs attempting commands outside declared schema.
- `AI-FR-6` Workspace/World/Saga-aware retrieval. Top-k pgvector queries scoped via RLS. Current Saga canon is prioritized, relevant World/Era canon is included, sibling Sagas are excluded unless an explicit future workflow allows them.
- `AI-FR-7` **Rate limits.** Hard caps on free tier. Soft caps for alpha.

**Out of scope (P0).** BYOK UI. Local models. Image generation. Speaker diarization. Real-time transcription. Contradiction detection. Temporal contradiction detection. World-canon promotion workflow. Custom AI tone per saga.

---

# 1. CREATE

## 1.1 Saga creation

**v0.9 change: Replaces "The Saga Creation" (§1.1 in v0.8). User-facing name is now "New saga" / "Saga creation." Internal engineering references (`workshop_sessions`, `scaffold_saga`, `workshop_input`) unchanged.**

**User story.**
> *"I have rough notes and an idea. In 20 minutes, I want a saga I could run Saturday — opening scene, NPCs, the conflict, and a list of what I still need to decide."*

**Requirements.**

*Entry*
- `SC-FR-1` Saga creation reached from the Sanctum World/Saga switcher → `+ New saga`. Not a top-level mode entry point. The flow includes a lightweight World choice: reuse existing World or create one behind the scenes.
- `SC-FR-2` First app launch: new users create their first real saga through this flow. The scaffold output becomes their first saga — there is no separate tutorial saga.
- `SC-FR-3` Three options presented at creation: **Build with AI** · **Bring your notes** · **Start blank**.

**Alpha-cohort note.** Per Basepoint §3, the alpha cohort is *returning GMs starting a new saga within 30 days*. **Bring your notes** is the wedge path for this cohort — they have existing material. Build with AI is optimized for new or improv-shy GMs. Start Blank is for GMs who want to begin empty and build manually.

*GM profile intake (Build with AI and Bring your notes)*
- `SC-FR-4` Captures: experience level, improv comfort, prep style, game system.
- `SC-FR-5` Two scopes: user-default at first creation, per-saga override at each subsequent creation.
- `SC-FR-6` Profile shapes scaffold density (new/improv-shy → fuller scenes + dialogue; experienced → sharper hooks, more gaps). Mapping defined in AI Task Registry.

*Build with AI*
- `SC-FR-7` AI-led conversation producing: premise, tone, genre, central conflict, starting place, initial Characters/Factions/Threads, first-session hook, GM secrets, prep checklist.
- `SC-FR-8` No fixed question count. Ends when AI has enough or GM says "let's see it."
- `SC-FR-9` Review screen: every entity editable inline, regeneratable per-item, rejectable. First-session packet draft visible.
- `SC-FR-10` "Commit saga" promotes drafts to canon, lands GM on Sanctum home.

*Bring your notes*
- `SC-FR-11` GM provides any input (paste, type, list). AI responds adaptively — brainstorm, expand, redirect, summarize.
- `SC-FR-12` No fixed structure. GM controls when to commit.
- `SC-FR-13` Same review screen as Build with AI.
- `SC-FR-14` **Paste cap: 50,000 characters.** Above cap → "break this into sections" guidance.

*Start blank*
- `SC-FR-15` Empty saga created immediately. Sanctum home renders with a friendly empty state. No scaffold. All AI features available on-demand from any screen post-creation.

*Activation target*
- `SC-FR-16` Scaffold-to-runnable in 10–20 min via Build with AI.

**v0.8 → v0.9 requirement migration.**

| v0.8 ID | v0.9 ID | Change |
|---|---|---|
| `WS-FR-1` | `SC-FR-1` | "Saga Creation" → "Saga creation" |
| `WS-FR-2` | `SC-FR-2` | "Tutorial-as-saga" → "first real saga" |
| `WS-FR-3` | `SC-FR-3` | Three paths renamed; No-AI removed |
| `WS-FR-4..6` | `SC-FR-4..6` | Unchanged semantics |
| `WS-FR-7..10` | `SC-FR-7..10` | "Guided" → "Build with AI" |
| `WS-FR-11..14` | `SC-FR-11..14` | "Freeform" → "Bring your notes" |
| `WS-FR-15..17` | *(removed)* | No-AI path removed |
| `WS-FR-18` | `SC-FR-16` | Unchanged |

**Acceptance.**
- Saga creation launches from the saga switcher, not a top-level mode.
- Build with AI produces in ≤20 min: saga summary, 1 starting Place, 3–6 Characters, 1–3 Factions, 1–3 Threads, first-session packet.
- All scaffold output = AI Draft until commit.
- Regenerating one entity doesn't regenerate the rest.
- Review screen is inline-editable. GM never leaves it to fix a name.
- Start Blank creates an empty saga immediately with no AI generation.

**Edge cases.**
- Mid-flow close → conversation state persists; "Resume saga creation" in saga switcher.
- Contradictory inputs → AI asks clarifying question, doesn't pick silently.
- Paste >50k chars → break-up guidance.
- AI-generated name collides with GM-typed name → propose rename, don't auto-merge.
- AI failure → preserve state, retry. Never lose typed input.
- Prompt injection in pasted notes → per AI-FR-5.

**Out of scope.** PDF import (P1). docx beyond plain text. Image generation. Multi-GM creation. Full World dashboard. Era editor UI. World Anvil / Notion / Obsidian import (V1).

**Dependencies.** ACC, ENT, AI, Canon state. Produces First-Session Packet (§2.1).

---

## 1.2 GM Profile

*(Unchanged from v0.8. Field reference now `SC-FR-4` instead of `WS-FR-4`.)*

**Requirements.**
- `GMP-FR-1` User-level default at onboarding.
- `GMP-FR-2` Per-saga override at creation.
- `GMP-FR-3` Editable post-creation from saga settings.
- `GMP-FR-4` Fields per SC-FR-4.
- `GMP-FR-5` Input to every AI task producing GM-facing output.

---

# 2. ORGANIZE & PREP

## 2.1 First-Session Packet

*(Unchanged from v0.8. "Saga Creation" replaced with "saga creation.")*

**Requirements.**
- `FSP-FR-1` Contains: opening scene (2–3 likely paths), Characters/Places per path, session objective + active Threads, 3–5 pinned entities, pre-prep checklist of 3–5 decisions.
- `FSP-FR-2` Depth scales with GM profile.
- `FSP-FR-3` Fully editable (text, pinned entities, checklist).
- `FSP-FR-4` Sticky to Session entity. One packet per session.
- `FSP-FR-5` Loaded by The Stage at session start (§3.1). Offline-cacheable.

**Acceptance.** Saga creation produces a packet meeting FSP-FR-1 with no further GM input. Subsequent packets generated from prior session outcomes, not from scratch. Renders on web and mobile. Offline-cacheable.

**Out of scope.** Tactical maps. Initiative. Encounter stat blocks.

**Dependencies.** ENT, Saga creation, Session Prep, The Stage.

---

## 2.2 Entity Management (Sanctum)

*(Unchanged from v0.8.)*

**Requirements.**
- `ESM-FR-1` List view per type. Filter (canon state, tags, status), sort (last updated, name, created).
- `ESM-FR-2` Detail view shows all shared fields (ENT-FR-2).
- `ESM-FR-3` Inline edit. Autosave with visible save state.
- `ESM-FR-4` Soft backlinks panel: bidirectional. Click to jump.
- `ESM-FR-5` Mention chips inline. Accept creates link, dismiss snoozes.
- `ESM-FR-6` Creation surfaces: entity list (+), backlink suggestion (stub), Stage Quick Stub (§3.1), Approval Queue (approve-as-new), session prep AI quick stub (§2.3).

**Acceptance.** Any entity reachable in ≤2 clicks (global search from nav). Backlinks update <1s after mention saved.

---

## 2.3 ⚓ Session Prep (within Sanctum)

**v0.9 change: Renamed from "The session prep workspace." Session prep is embedded in the Sanctum home page when a session is active, not a separate mode. Requirements renamed `PREP-FR-*`; `STU-FR-*` aliases retained for backward compatibility.**

**User story.** Spin up a new session in 5 minutes by leveraging saga state and last session's outcomes, then confirm a packet that moves cleanly into The Stage.

**Requirements.**
- `PREP-FR-1` / `STU-FR-1` GM creates a Session entity from the session prep workspace or from a Sanctum dashboard CTA.
- `PREP-FR-2` / `STU-FR-2` Multiple sessions can be in `planned` simultaneously. Only one session may be `started` or `in_progress` per saga.
- `PREP-FR-3` / `STU-FR-3` Fields: number/title, planned date, objective, opening scene, scene notes, active Threads (linked), pinned entities (linked), prep checklist, packet.
- `PREP-FR-4` / `STU-FR-4` Agenda editor supports objective, opening scene, scene notes, active threads, pinned entities, and prep checklist without leaving the prep workspace.
- `PREP-FR-5` / `STU-FR-5` Packet preview renders the exact agenda and pinned-card set Stage will load.
- `PREP-FR-6` / `STU-FR-6` AI prep synthesis is **GM-initiated**, not auto-run. CTA: "Draft this session" or "Regenerate" with targeted scopes.
- `PREP-FR-7` / `STU-FR-7` AI-generated prep checklist (3–5 items) comes from saga state + prior session outcomes.
- `PREP-FR-8` / `STU-FR-8` AI-suggested pinned entities (top 3–5 by relevance to objective + active threads) are accept-to-add working state, not canon drafts.
- `PREP-FR-9` / `STU-FR-9` Loose threads from prior session appear as suggested objectives/scenes.
- `PREP-FR-10` / `STU-FR-10` "Ready for Stage" transitions session status from `planned` to `ready`. Prep workspace remains editable until the session becomes `in_progress`.
- `PREP-FR-11` / `STU-FR-11` Prep workspace displays an AI-generated **prep briefing** (`compose_prep_briefing`, Registry v1.0 §5) on session open. Auto-generated, canon-only, ephemeral. Streams visibly with a "Composed HH:MM · N sources" stamp. Cached on `sessions.prep_briefing` and regenerated when source canon changes. NOT a draft.
- `PREP-FR-12` / `STU-FR-12` Prep workspace supports **AI Quick Stub** in the pinned-entity picker. Output is reviewed inline on a prep card. On Pin, the entity writes through Schema §10.1 with `created_by='gm_via_ai_approval'`, `is_stub=true`. Does NOT route through the Approval Queue.
- `PREP-FR-13` / `STU-FR-13` Post-creation, the Sanctum home shows a "Plan your first session" card with `+ Plan Session 1` CTA. No tooltip tour. Dismissal stored on `gm_profiles.session_prep_intro_dismissed_at`.
- `PREP-FR-14` / `STU-FR-14` Prep workspace displays an **archived-pinned-entity banner** on load if any pinned entity or active thread has `canon_state='archived'`. Per-entity inline actions: Unpin or Restore.
- `PREP-FR-15` / `STU-FR-15` Session **actions menu**: Reset prep, Archive session, Duplicate as new planned. Hidden when `in_progress` or `ended_pending_undo`.
- `PREP-FR-16` / `STU-FR-16` When the most recent `ended` session has no approved summary, the prep workspace surfaces a **GM-authored one-line summary CTA** writing a canon summary note directly (`created_by='gm'`).

**v0.9 surface change.** The prep workspace is rendered inline within the Sanctum home page when a session is `planned` or `ready`. A "Open full editor" link routes to the expanded per-session editor (`/saga/<id>/sessions/<id>/prep`). Both surfaces write to the same data. The Cream surface treatment referenced in v0.8 is removed; the prep workspace uses the Parchment background with Amber-forward accents.

**Acceptance.**
- With ≥1 prior session, a runnable packet for session N+1 produced in ≤10 min.
- Opening the prep workspace never auto-runs AI synthesis (`PREP-FR-6` preserved).
- A GM can keep multiple planned future sessions without making any active on Stage.
- A `ready` or `started` session can be previewed in Stage and then edited again in the prep workspace.
- Post-creation flow: saga creation → Sanctum home → "Plan Session 1" card → prep workspace works end-to-end.
- With pending pipeline on the prior session, the prep briefing renders against canon only, surfaces the pending warning, and links to the Approval Queue.

**Edge cases.** No prior sessions → first session uses saga creation first-session packet logic. Two sessions in parallel → both can remain `planned`; only one becomes `started` or `in_progress`. Session is `in_progress` or `ended_pending_undo` → prep workspace renders read-only.

**Out of scope.** Recurring templates. Multi-GM prep. VTT export.

**Dependencies.** ENT, AI, FSP, Session entity, Stage state machine.

---

## 2.4 ⚓ Thread System

**v0.9 addition. Thread requirements were previously implicit in the entity system (`ENT-FR-1`). Explicit `THR-FR-*` requirements added here.**

**User story.** *"Between sessions, I need to see at a glance which threads are live, which are hanging, and how they've evolved across the whole saga."*

**Requirements.**
- `THR-FR-1` Threads nav link is the first item in the Sanctum web nav. Thread library is the first sub-section on mobile's top tab strip.
- `THR-FR-2` Thread list view groups threads by resolution state: Active, Loose, Dormant, Resolved, Failed. Default filter shows Active + Loose combined.
- `THR-FR-3` Thread row shows: name, kind badge, objective count (with completed count), last-touched session number, 2-line summary. Canon state indicator per v0.1 scheme (◆ active, ◈ loose, ○ dormant, ✓ resolved).
- `THR-FR-4` Thread detail page shows: narrative (inline-editable, autosave), objectives log (inline-editable checkboxes), resolution state (enum dropdown), related entities, session-pin history, AI assist panel.
- `THR-FR-5` Objectives are inline-editable. `+ Add objective` appends to `threads.objectives_log`. Toggling a checkmark sets `state='completed'` and `completed_at=now()`. All autosaved.
- `THR-FR-6` **Thread Timeline view.** Read-only. Toggled from the thread list header. Renders a vertical session axis with threads as horizontal lanes. Thread state transitions (objective completions, resolution state changes, loose flags) plotted at the session where they occurred. Derived from `threads.objectives_log` + `canon_audit` + `sessions`. No new schema required.
- `THR-FR-7` Thread Timeline loads in <300ms p50 for a saga with ≤15 sessions and ≤20 threads.
- `THR-FR-8` Thread carry-forward section on the Sanctum home page (prep workspace) lists all Active + Loose threads. Database query only; no AI task, no quota cost.

**Acceptance.**
- Thread timeline renders correctly for a saga with ≥5 sessions and ≥5 threads. All state transitions plotted at the correct session.
- Thread list default filter (Active + Loose) renders in <300ms p50.
- Objectives log writes correctly: `completed_at` set, `state='completed'`, autosaved.
- Thread carry-forward section on the dashboard populates from the database without an AI call.

**Out of scope.** Writable timeline editor (V1). Relationship graph / Constellation (V1). Cross-Saga timeline (V1). World History / Era Timeline (V1). Timeline events not derived from thread/session/canon activity (V1).

**Dependencies.** ENT (Thread entity type), Schema §3.6 (`objectives_log`, `resolution_state`, `is_loose_thread`), Canon state machine.

---

## 2.5 AI Creative Tasks

**v0.9 addition. New GM-invoked creative AI tasks (now specified in Registry v1.0 §§7-11).**

**User story.** *"I'm prepping a session and I want three rough ideas for what could go wrong at the docks. I'm on a thread detail page and I want to brainstorm a complication. I need a quick NPC for an unplanned scene. I have a stub who was mentioned in three sessions; I want to flesh her out."*

**Requirements.**
- `AIC-FR-1` **Scene beats.** Prep workspace agenda editor exposes a "Brainstorm beats" button. Invokes `propose_scene_beats` (Registry v1.0 §7). Returns exactly 3 beat sketches. Each beat shows summary, narrative, entities involved, thread implication, sources. No auto-commit; GM copies text into scene notes if desired.
- `AIC-FR-2` **Thread complication.** Thread detail page exposes a "Propose a complication" button. Invokes `propose_thread_complication` (Registry v1.0 §8). Returns 1–3 complication cards. GM copies text into thread narrative if desired. No auto-commit.
- `AIC-FR-3` **NPC for scene.** Prep workspace and entity creation expose a "Draft an NPC for this scene" button. GM describes the role. Invokes `propose_npc_for_scene` (Registry v1.0 §9) to return 1–3 candidates. On candidate selection, candidate is passed to `draft_entity_from_prompt` (Registry v1.0 §3) for full entity creation with standard inline review. No direct canon write from this task.
- `AIC-FR-4` **Saga question.** GM invokes Ask from the top `Search or ask...` omnibox, a contextual action, sidecar, or fallback page. Invokes `answer_saga_question` (Registry v1.0 §10). Answer renders with mandatory inline citations. If retrieval is insufficient, renders "I don't have enough information about that." No answer without citations.
- `AIC-FR-5` **Stub fleshing.** Stub entity detail page (where `is_stub=true` AND transcript evidence exists) exposes "Flesh out from session evidence." Invokes `propose_quick_stub_fleshing` (Registry v1.0 §11). **Unlike other creative tasks, this produces an AI Draft update** that routes through the standard approval write path (Schema §10.1). Approval clears `is_stub=false`.

**Universal rules for all `AIC-FR-*` tasks.**
- All are GM-invoked. None auto-run.
- `AIC-FR-1..4` produce ephemeral output (no `drafts` rows, no `canon_audit` entries). Displayed in UI until dismissed.
- `AIC-FR-5` produces an update draft (canon-mutating; requires GM approval).
- All use `light` quota tier. None fire during an active Stage session.

**Acceptance.**
- `AIC-FR-1`: Returns exactly 3 beats. No entity names absent from saga canon. Renders within 14s p95.
- `AIC-FR-2`: Returns 1–3 complications that do not resolve the thread. Renders within 14s p95.
- `AIC-FR-3`: Returns 1–3 candidates with no name collision against existing entities. On selection, routes to `draft_entity_from_prompt` inline review.
- `AIC-FR-4`: Answer never renders without citations. `no_answer` path renders standard message.
- `AIC-FR-5`: CTA only shown when `is_stub=true` AND transcript evidence exists. Approval writes update draft, clears `is_stub=false`.

**Out of scope.** Auto-suggestion of beats, complications, or NPCs (all GM-invoked). Stage creative tasks (V1). Contradiction detection (V1 exclusion).

**Dependencies.** AI Task Registry v1.0, Memory & Retrieval Spec v0.9, Schema `threads.objectives_log`, `is_stub`.

---

# 3. RUN — The Stage

## 3.1 ⚓ The Stage

*(Unchanged from v0.8. Session state machine table updated: "session prep workspace editable?" column renamed "Prep editable?" for consistency.)*

**User story.**
> *"Players are at the table, recorder running, someone just asked who Seraphine is. I need her open in three seconds."*

**Design.** Clean, focused, dark, and high-contrast for mobile live play. The Stage consumes the packet prepared in the session prep workspace. Unsolicited AI stays dormant.

**Session state machine.**

| Status | Trigger | Prep editable? | Stage behavior |
|---|---|---:|---|
| `planned` | Session created in prep workspace | Yes | Not openable from Stage. |
| `ready` | GM taps "Ready for Stage" | Yes | Preview agenda + pinned cards; no recording. |
| `started` | GM taps "Start session" in Stage | Yes | Active shell; consent gate available. |
| `in_progress` | Consent + first record tap, or "Start without recording" | No | Live play; recording/capture/search available. |
| `ended_pending_undo` | GM ends session; 60s undo window | No | Undo banner; notifications suppressed. |
| `ended` | Undo window expires | Yes, retrospective only | Pipeline enqueues; Stage exits. |

**Requirements.** `STG-FR-1` through `STG-FR-23` unchanged from v0.8.

One wording update: `STG-FR-2` — "Loads the `ready`, `started`, or `in_progress` session packet. No openable session → prompt to open the session prep workspace or resume an active session." (Replaced "session prep workspace" reference.)

*(All other Stage requirements are verbatim from v0.8.)*

---

# 4–6. REVIEW, APPROVE, CONTINUE

*(Unchanged from v0.8. Post-Session Pipeline `PSP-FR-*`, Approval Queue `AQ-FR-*`, Continue `CNT-FR-*` requirements are all unchanged.)*

---

# 7. Foundations

*(Unchanged from v0.8. Security, Trust & Data, Notifications `NTF-FR-*` are all unchanged.)*

---

# 8. End-to-end loop sanity check

## 8.1 Day-1 GM, v0.9

1. Sign up. → New saga → **Build with AI.** Profile intake. ~15-min conversation. Review screen with 5 NPCs, 2 Places, 1 Faction, 2 Threads, first-session packet.
2. Commit. Land on Sanctum home with "Plan your first session" card.
3. Tap `+ Plan Session 1`. Prep workspace opens inline. Briefing composes (8s). Thread carry-forward shows 2 active threads.
4. Edit opening scene. Tap "Draft this session." AI proposes objective, 4 pinned entities, prep checklist. Accept 3 pins, swap 1.
5. Tap Ready for Stage. Sanctum home shows `Session 1 · Ready` workspace with `Open in Stage →`.
6. Session day: open Stage on phone. Start session confirmation modal. Consent gate → Yes. Record.
7. During play: Quick Capture twice. Quick Stub for new NPC. Mark Moment on a big choice.
8. End session. 60s undo banner. One-line summary card → type a note, save.
9. Next day: notification — Pipeline ready. Open Approval Queue on laptop.
10. 8 items. Approve 5, edit-and-approve 2, reject 1. Commit batches.
11. Sanctum home now shows `Plan Session 2`. Thread carry-forward includes 1 loose thread from the pipeline.

The loop closes.

## 8.2 Day-2 GM, v0.9 creative tasks

12. Prepping Session 15 in the prep workspace. Briefing lands. See "The Pale Broker" still active in thread carry-forward.
13. Tap "Brainstorm beats." 3 beat ideas appear in 6s. Copy one into scene notes.
14. Navigate to The Pale Broker thread. Tap "Propose a complication." 2 complication cards appear. Copy one into the thread narrative.
15. Need an informant for the dockside scene. Tap "Draft an NPC for this scene." Describe "a dock worker who owes Seraphine." 2 candidate cards appear. Pick one → inline review pane opens → accept → entity written to canon as stub, pinned to session.
16. Open The Pale Broker entity — it's a stub. Transcript evidence found in 2 sessions. Tap "Flesh out from session evidence." Proposal renders with 3 paragraphs and 2 suggested relationships. Accept → update draft in Approval Queue.
17. Open Ask. Type "What's the current state of the Thornwood Accord?" → sourced answer in 8s. Tap a citation → transcript segment opens.

---

# 9. Cross-feature integration

| From → To | Channel |
|---|---|
| Saga creation → Sanctum | Commits scaffold to canon entities |
| Saga creation → First-Session Packet | Generates packet for Session 1 |
| Saga creation → Sanctum home | "Plan your first session" card → prep workspace |
| Sanctum → Stage | Loads active session packet |
| Stage → Sanctum (post-End) | One-line summary card writes GM-authored canon summary |
| Stage → Post-Session Pipeline | Submits audio + notes + captures |
| Pipeline → Approval Queue | Produces proposed updates + new entities |
| Approval Queue → Library | Approved drafts become canon |
| Approval Queue → Prep workspace (next session) | Loose threads + carry-forward |
| Sanctum canon → Prep briefing | `compose_prep_briefing` auto-generates on prep workspace load |
| Prep workspace → Stage | Next session packet |
| Prep AI Quick Stub → Library | Direct canon stub via synthetic resolved draft |
| Thread detail → Approval Queue | `propose_quick_stub_fleshing` produces update draft (via Queue) |
| Session prep → Scene beats | `propose_scene_beats` → ephemeral cards in prep workspace |
| Thread detail → Complications | `propose_thread_complication` → ephemeral cards |
| Prep workspace → NPC creation | `propose_npc_for_scene` → `draft_entity_from_prompt` → inline review |
| Sanctum Ask → Answer | `answer_saga_question` → sourced answer |
| Every stage → AI Layer | Retrieval scoped via RLS + Workspace/World/Saga IDs; current Saga + relevant World canon by default |
| Every stage → Audit Log | State transitions logged |

---

# 10. Blocking documents

**Locked and engineering-ready:**

1. ~~**Basepoint**~~ — `[[11 - Product Basepoint]]`.
2. ~~**Entity & Canon Schema**~~ — `[[20 - Entity and Canon Schema]]`.
3. ~~**AI Task Registry**~~ — `[[23 - AI Task Registry]]` is standalone for MVP task contracts after the v1.0 base-contract rewrite. AI task surfaces still require implementation-plan review before coding.
4. ~~**Approval Queue Spec**~~ — `[[24 - Approval Queue]]`.
5. ~~**Technical Architecture Spec**~~ — `[[21 - Tech Architecture]]`.
6. ~~**Memory & Retrieval Spec**~~ — `[[22 - Memory and Retrieval]]`.
7. ~~**Stage UX Flow**~~ — `[[32 - Stage UX Flow]]`.
8. ~~**Sanctum UX Flow**~~ — `[[30 - Sanctum UX Flow]]`.
9. ~~**Session Prep Flow**~~ — `[[31 - Session Prep Flow]]`.
10. ~~**First-Run UX Flow**~~ — `[[33 - First Run UX Flow]]`.
11. ~~**UI Implementation Spec**~~ — `[[34 - UI Implementation Spec]]`.
12. ~~**Pricing & Rate Limits**~~ — `[[25 - Pricing and Rate Limits]]`.

**Still required before full MVP scope expansion:**

13. **AI implementation-plan review** — required before coding AI task surfaces from `[[23 - AI Task Registry]]`.
14. **Game System Spec** — V1 deliverable, not an MVP blocker.

---

*End of PRD v0.10. Aligned with Basepoint v3.5, Memory & Retrieval Spec v0.9, Entity & Canon Schema v0.8, AI Task Registry v1.0, Approval Queue Spec v0.5, Tech Architecture Spec v1.2, Sanctum UX Flow v0.2, Session Prep Flow v0.2, Stage UX Flow v0.6, First-Run UX Flow v0.2, UI Implementation Spec v0.2, and Pricing & Rate Limits Spec v0.2.*
