---
status: active
authority: secondary
scope: mvp
read_after:
  - "[[00 - Start Here]]"
depends_on:
  - "[[00 - Start Here]]"
supersedes: []
last_audited: 2026-07-31
source_file: "Sourced - Downloaded - 260518/relic-entity-canon-schema-v0_8.md"
---

> [!info] How to use this spec
> Owns: Data model, canon states, sources, drafts, audit, lifecycle paths, and schema-level invariants.
> Does not own: Historical rationale and superseded naming unless explicitly retained as an internal identifier.
> Read next: [[00 - Start Here]]
> Implementation-critical note: The `experience_level` values are locked by First-Run UX: `new`, `returning`, `experienced`, `veteran`.
# Relic — Entity & Canon Schema v0.8

**Source of truth:** `[[11 - Product Basepoint]]` §8–9 · `[[12 - MVP PRD]]` §0.2–0.3 · `[[22 - Memory and Retrieval]]` · `[[23 - AI Task Registry]]` · `[[21 - Tech Architecture]]` · `[[31 - Session Prep Flow]]` · `[[25 - Pricing and Rate Limits]]`
**Stack:** Supabase Postgres 15 + pgvector + Supabase Auth + RLS
**Status:** Locked spec. Engineering-ready alongside AI Task Registry + Tech Architecture Spec.

---

## Changelog

**Packet E5.2 conversational workshop patch (August 2026).** `workshop_sessions` now carries a server-owned phase, one bounded interview plan, an emerging outline, message counters, and the current task run. A private idempotency-receipt table serializes each GM turn and draft dispatch. The initial planning run may read the starting workshop input; the deep scaffold run freezes the complete normalized GM conversation before dispatch. Neither run may create canon. `sagas.creation_context` stores reviewed tone, conflict, first hook, GM secrets, and any existing-World update proposal; it is GM-private setup context and is excluded from embeddings and ordinary player-facing projections.

**Packet E5 agentic Saga workshop patch (July 2026).** `workshop_sessions` becomes the recoverable GM-owned working boundary for Build with AI and Bring your notes. A correlated `scaffold_saga` run may persist immutable input/eligible-World evidence, generation state, and a mutable review payload, but cannot create a World, Saga, entity, relationship, Session, source, draft, audit row, or canon before explicit `Commit saga`. Commit locks the workshop/version, creates the selected hierarchy and Saga-scoped records transactionally, materializes the frozen workshop inputs as `workshop_input` sources, creates approved synthetic drafts/audit provenance, and attaches the workshop to the new Saga. Exact commit replay returns the same receipt; generation/retry/review never commits automatically.

**Packet E4 Session Prep AI patch (July 2026).** Adds private Session-scoped Prep AI request and immutable evidence snapshot rows correlated to one `ai_task_run`. These rows are recoverable operational/review state, not canon or Session Prep fields. Provider completion cannot update `sessions`, pins, Threads, entities, drafts, or canon. Explicit Prep-text acceptance records the exact newer D4 autosave version; explicit NPC/Quick Stub review may create only a pending C5 draft. Idempotency keys bind task, input, Session, and Prep version, while stale completion and changed-key reuse fail closed.

**Library lifecycle patch (July 2026).** Resolves the per-record hard-delete boundary: an individual Character, Place, Faction, Artifact, Thread, or Note may be permanently deleted only after it is archived, the GM completes two confirmations, and a transaction-time dependency check proves it has no relationships, accepted/suggested mentions or backlinks, note attachments, Session pins, Thread activations, or pending draft targets. Intrinsic source/audit provenance remains as a tombstone and derived embeddings are removed. Referenced archived records remain restorable and may only disappear through the owning Saga deletion cascade.

**Hierarchy and Saga lifecycle patch (July 2026).** Adds owner-scoped Workspace/World/Saga navigation targets, scoped Saga rename, exact-name delete confirmation, live/ending Session deletion and context-switch blocks, and a staged deletion contract. Saga delete first hides the Saga and enqueues one idempotent cleanup job; the service worker removes scoped Storage objects before cleanup completion hard-deletes the Saga and cascaded database rows. Sibling hierarchies remain untouched.

**Approval Queue trust completion patch (July 2026).** Adds a route-scoped field-diff/read boundary, persisted GM edit payloads, exact-retry approval receipts, target-row locking, source-health and optimistic-version rechecks, and transactional create/update/archive/next-prep commits. Successful approval alone writes canon plus one provenance-rich `canon_audit`; reject, merge identity decisions, preview/edit, conflicts, and failed attempts write no canon/audit. Merge copies source and run/batch provenance into a separately approvable update draft.

**Session Prep parity patch (July 2026).** Adds optional `planned_start_at`, Session archival/duplication provenance, ordered active-Thread pins, optimistic `updated_at` Prep writes, and private action receipts. Prep mutations are working-state writes, accept only same-Saga targets, preserve unresolved existing pins for explicit GM recovery, and create no canon/audit/source rows or provider work.

**Citation context and drift UI patch (July 2026).** Makes the draft the browser authorization root for source inspection. `get_draft_source_context` validates the exact Workspace/World/Saga/draft/source/transcript chain and returns only display-safe evidence and authorized Session navigation. The lower-level transcript helper is internal-only; missing, broken, denied, deleted, and unsupported records never expose source or transcript identifiers.

**Source-aware synthesis writer patch (July 2026).** Adds draft batch/run/provider/Session provenance and locks `synthesize_session` persistence to one atomic, idempotent pending batch whose citations all belong to the exact evidence Session. The writer creates no canon, audit, embedding, or canonical summary row.

**Manual session evidence patch (July 2026).** Defines pasted notes and GM manual summaries as immutable Saga-scoped `sources` rows tied to one ended Session. A client-stable source UUID provides exact retry identity; an identical replay returns the same source, while key reuse with different scope, kind, or text fails closed. Saving evidence updates only pipeline input metadata and never creates notes, drafts, audit rows, or canon.

**Import Inbox patch (July 2026).** Adds `imported_text` sources with immutable Workspace/World/Saga/uploader, filename when applicable, MIME, byte size, ingestion method, SHA-256, and creation/ready timestamps. Paste, `.txt`, `.md`, and `.markdown` enter only as raw `ready_for_review` evidence; archive changes lifecycle state without deleting provenance. The source UUID is the stable delivery key, exact content deduplicates per Saga/uploader, changed key reuse fails closed, and ingestion creates no note, entity, Thread, draft, embedding, AI run, canon audit, or usage charge. `.docx` remains rejected until a trusted extraction boundary ships.

**Stage airplane-mode recovery patch (July 2026).** Extends the Stage receipt boundary to `start_session`, `record_consent`, and `go_live`, and defines conflict results as immutable receipt outcomes rather than silent lifecycle/consent overwrites. `get_stage_packet` now carries a scope-filtered literal search document set for the current Stage cache; the index is a read-model payload, not a new canon table.

**Stage non-audio recovery patch (July 2026).** Adds the private `internal.stage_write_receipts` idempotency ledger for web Quick Capture, Quick Stub, Mark Moment, End Session, and Undo replay. Receipts are operational metadata rather than canon or source rows; the scoped RPC remains the only authenticated access path.

**Stage evidence recovery patch (July 2026).** Adds `sessions.audio_chunk_count_expected` and `recording_finalized_at` so late retry-safe chunk registration cannot enqueue an incomplete transcription, and records scheduled server-owned undo expiry as the lifecycle implementation.

**v0.8 (May 2026).** Priority 6 and document-control alignment. Adds usage-metering tables for Pricing & Rate Limits v0.2 (`usage_events`, `usage_monthly_rollups`, `quota_overrides`) and refreshes active source references. Usage rows are Workspace-owned, may carry World/Saga attribution, and survive Saga deletion for billing, abuse review, and cost analysis.

**Priority 3 continuity architecture patch (May 2026).** Adds the Workspace / World / Era / Saga hierarchy before coding. `workspaces`, `worlds`, and `world_eras` become structural tables. `sagas` now belongs to a World. Major canon, source, draft, embedding, note, relationship, and audit rows carry `workspace_id`, `world_id`, nullable `saga_id`, and `scope='world'|'saga'` where applicable. Post-session outputs default to Saga scope. World-canon promotion, era-specific entity versions, cross-Saga graph/timeline, and temporal contradiction detection remain V1.

**v0.7 (May 2026).** Alignment pass with Session Prep Flow v0.2 and AI Task Registry v0.8. All changes additive. `sessions` gets three new columns (`prep_briefing`, `prep_briefing_generated_at`, `pending_prep_suggestions`) supporting auto-generated continuity briefings and persisted prep-suggestion state. `gm_profiles` gets two columns (`session_prep_intro_dismissed_at`, `synthesize_nudge_dismissed`) for first-run session prep state. `actor_kind` enum adds `'gm_via_ai_suggestion_accept'` for prep-suggestion accept actions (working-state writes, lighter than `gm_via_ai_approval` which marks canon mutations). Lifecycle path table (§10.1) adds a row for Session Prep AI Quick Stub. New §10.5 documents the session prep suggestion acceptance write path.

**v0.6 (May 2026).** Alignment pass with Stage UX Flow v0.2 and Next Steps. Adds the six-state session status machine (`planned`, `ready`, `started`, `in_progress`, `ended_pending_undo`, `ended`), timestamp columns, and `session_prep_lock` view. Renames saga-creation-related source/session schema from `legacy_creation_flow_*` to `workshop_*` and `workshop_input`. Adds V1-prep nullable fields: `sagas.game_system_id`, `characters.mechanical_block`, `artifacts.mechanical_block`. Adds `session_marked_moments` as the selected Mark Moment storage path.

**v0.5 historical note (May 2026).** Earlier alignment pass with the then-current Tech Architecture draft; current source references are normalized in this v0.7 file. Three data-model additions: notification system tables and enums (§1.1 new enums, §2.3 `push_devices`, §2.1 `notification_preferences` column on `gm_profiles`); transcript editing support (§8.3 new `original_segments` jsonb and `edited_at` timestamptz columns) per Tech Arch §7.9 frozen-citation policy; `rejection_reason_tag` promoted from text array to proper enum and gains `stale_bulk_archive` value per Approval Queue Spec §11. Four open items in §14 closed by Tech Arch v1.0 with pointers added. §11 saga cascade updated to include notification queue cleanup note. No changes to existing column shapes; all additions are forward-compatible.

**v0.4 (May 2026).** Cross-doc alignment pass. Five fixes from alignment review: `actor_kind` documentation corrected — no longer claims confidence-calibration role (§1.3, fix A2); `confidence_reason` promoted from free text to enum matching Registry §0.4 (§4.1, fix B5); §4.4 conflict abort now correctly cites Schema §4.1 optimistic-locking origin rather than AQ-FR-12 (fix A3); `workshop_input` `raw_excerpt` content documented (§8.1, fix C1); `is_loose_thread` clear-conditions resolved (§14, fix B4). No data-model changes beyond the `confidence_reason` enum.

**v0.3 (May 2026).** Alignment pass against Memory & Retrieval Spec v0.2. Three changes: `embeddings.chunk_text` storage policy now selective (populated for entity/note sources, NULL for transcript sources) per Memory Spec §3.5; §12.2 retrieval pseudocode replaced with pointer to Memory Spec §5 to prevent shadow HNSW implementations; added player-visibility documentary note on `notes.search_tsv` for future player wiki gating. No data-model changes.

**v0.2.** All 15 decisions resolved. Material changes from v0.1: collapsed `approvals` into `drafts` (Q5); split `canon_state` into `entity_canon_state` + `draft_canon_state` (Q7); moved archive from `status` to `canon_state` (Q8); dropped in-saga hard-delete (Q9); replaced `current_snapshot` with `expected_version` timestamp (Q10); junction tables for session pinned entities + active threads (Q14); separate `embeddings` table with multi-embedding per entity (Q15).

**v0.1.** First draft.

---

## 1. Conventions

- **IDs:** UUID v7. Time-ordered, sortable, no separate `seq` columns needed.
- **Timestamps:** `timestamptz` with `default now()`. Every row has `created_at` and `updated_at`.
- **Tenancy:** Every row except `gm_profiles` carries the narrowest applicable scope: `workspace_id` for ownership/billing, `world_id` for shared setting, and nullable `saga_id` for playable storyline scope. RLS scopes by Workspace/World/Saga ownership, not prompt instructions.
- **Soft-archive only.** No in-saga hard-delete. Hard-delete happens via saga deletion (cascades).
- **Naming:** `snake_case_plural` tables, `snake_case_singular` columns.

### 1.1 Enums

```sql
create type entity_type as enum ('character', 'place', 'faction', 'artifact', 'thread', 'session');

-- Q7: split state enums by domain
create type entity_canon_state as enum ('canon', 'archived');
create type draft_canon_state as enum ('raw_input', 'ai_draft');

create type draft_state as enum ('pending', 'approved', 'rejected', 'merged', 'superseded');
create type change_kind as enum ('create', 'update', 'merge', 'archive_request');
create type approval_action as enum ('approve', 'edit_and_approve', 'reject', 'merge');
create type confidence_band as enum ('high', 'medium', 'low');
create type confidence_reason as enum (
  'direct_gm_input',
  'multiple_strong_sources',
  'single_clear_segment',
  'cross_session_consistency',
  'inferred_from_context',
  'ambiguous_source',
  'tonal_or_genre_match'
);  -- structured enum per AI Task Registry v1.0 §0.4. Band derives from reason server-side.
create type relationship_kind as enum ('member-of', 'located-at', 'owns', 'allied-with', 'opposed-to', 'related-to');
create type note_type as enum ('lore', 'gm_note', 'quick_capture', 'summary');
create type mention_state as enum ('suggested', 'accepted', 'dismissed', 'snoozed');
create type source_kind as enum ('transcript_segment', 'note', 'pasted_text', 'gm_manual_summary', 'existing_entity', 'workshop_input', 'gm_instruction', 'imported_text');
create type content_scope as enum ('world', 'saga');
create type session_status as enum ('planned', 'ready', 'started', 'in_progress', 'ended_pending_undo', 'ended');
create type workshop_path as enum ('build_with_ai', 'bring_your_notes', 'start_blank');
create type workshop_state as enum ('in_progress', 'committed', 'abandoned');
create type pipeline_state as enum ('queued', 'transcribing', 'synthesizing', 'ready_for_review', 'closed', 'failed');
create type transcript_state as enum ('pending', 'transcribing', 'complete', 'failed');
create type actor_kind as enum (
  'gm',                              -- Direct GM action: manual create, manual edit, GM-authored summary
  'gm_via_ai_approval',              -- GM approved an AI draft into canon (saga creation commit, Approval Queue,
                                     -- Session Prep AI Quick Stub Pin)
  'gm_via_ai_suggestion_accept'      -- v0.7: GM accepted an AI-proposed prep suggestion into a session
                                     -- working-state field. NOT a canon mutation in the entity-table sense.
);

-- v0.5: rejection_reason_tag promoted from free text[] to enum; adds 'stale_bulk_archive'
-- per Approval Queue Spec §5.1 stale-banner bulk-archive flow.
create type rejection_reason_tag as enum (
  'hallucinated',
  'wrong_tone',
  'redundant',
  'ambiguous_source',
  'gm_already_changed',
  'stale_bulk_archive'
);

-- v0.5: notification system per Tech Arch Spec §18.
create type notification_kind as enum (
  'pipeline_ready',
  'pipeline_failed',
  'pipeline_stale_30d',
  'pipeline_stale_90d',
  'transcription_complete',
  'synthesis_in_progress'
);
create type notification_channel as enum ('email', 'push');
create type push_platform as enum ('ios', 'android', 'web');
```

### 1.2 The canon invariant

Q3 locked: entity tables only contain canon. Drafts live in a separate `drafts` table.

> Rows in `characters`, `places`, `factions`, `artifacts`, `threads`, `sessions` always have `canon_state ∈ {canon, archived}`. The `raw_input` and `ai_draft` states exist only in `drafts`. **There is no code path that INSERTs into entity tables outside §5.4 (the approval write path) or direct GM action.**


### 1.2b Canon scope invariant (Priority 3)

Content that can belong to either the shared setting or the active storyline carries:

```sql
workspace_id uuid not null references workspaces(id) on delete cascade,
world_id     uuid not null references worlds(id) on delete cascade,
saga_id      uuid references sagas(id) on delete cascade,
scope        content_scope not null,
check (
  (scope = 'world' and saga_id is null)
  or
  (scope = 'saga' and saga_id is not null)
)
```

**World canon** is true for the shared setting. **Saga canon** is true for one playable campaign/storyline inside that World. Post-session pipeline drafts default to `scope='saga'`. World-canon promotion and era-specific versions are V1 workflows.

### 1.3 Authorship

Every entity row carries `created_by actor_kind` — `'gm'` for direct creation, `'gm_via_ai_approval'` for entities born from approved drafts. Used by the audit trail and entity-detail UI to show authorship provenance. **Not consumed by AI confidence scoring** — confidence derives from `confidence_reason` (source quality), per AI Task Registry v1.0 §0.4.

**v0.7 addition.** The `actor_kind` enum now includes `'gm_via_ai_suggestion_accept'` for accept-to-add actions on `generate_session_prep` suggestions (Session Prep Flow v0.2 §7.3). These actions write to session-row fields and junction tables but do NOT create new entity rows; they record AI involvement at a lighter level than `gm_via_ai_approval` (which marks canon-mutation approvals from the queue, saga creation commit, or Session Prep AI Quick Stub Pin). This distinction is documentary; it does not change confidence scoring or retrieval.

---

## 2. Account tables

### 2.1 `gm_profiles`

User-level GM profile (Basepoint §6). One row per user.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `user_id` | uuid unique → `auth.users.id` | |
| `experience_level` | text not null | `'new' \| 'returning' \| 'experienced' \| 'veteran'` — locked by First-Run UX Flow v0.2 |
| `improv_comfort` | text not null | `'planner' \| 'mixed' \| 'improv_first'` |
| `prep_style` | text not null | `'heavy' \| 'mixed' \| 'light'` |
| `default_game_system` | text | Free text |
| `notification_preferences` | jsonb not null default `'{...}'` | v0.5: see §2.4 for default shape and semantics. Per-channel, per-kind opt-out. |
| `session_prep_intro_dismissed_at` | timestamptz | v0.7: When the GM completed or skipped the first-run session prep workspace tour (Session Prep Flow §16). User-level, not per-saga. Null = tour has not been shown. |
| `synthesize_nudge_dismissed` | boolean not null default `false` | v0.7: True when the GM has dismissed (or accepted from) the one-time empty-state Synthesize nudge (Session Prep Flow §8.2). User-level, persists across all sagas. |
| `created_at`, `updated_at` | timestamptz | |

### 2.2 `workspaces` (Priority 3)

Ownership, billing, usage, and future collaboration boundary. MVP creates one default Workspace per GM and exposes only lightweight settings.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `owner_gm_id` | uuid → `auth.users.id` | Tenancy root for MVP |
| `name` | text not null | Default can be GM display name or "My Workspace" |
| `billing_customer_id` | text | V1/billing-ready; nullable in MVP |
| `usage_limits` | jsonb not null default `'{}'` | Rate/quota configuration |
| `ai_provider_defaults` | jsonb not null default `'{}'` | Provider/model defaults, not BYOK UI |
| `created_at`, `updated_at`, `deleted_at` | timestamptz | |

### 2.3 `worlds` (Priority 3)

Shared setting and World-canon container. A World may contain multiple Sagas over time; MVP keeps the UI lightweight and may create a World behind the scenes during New Saga.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `workspace_id` | uuid → `workspaces.id` on delete cascade | Indexed |
| `owner_gm_id` | uuid → `auth.users.id` | Denormalized for simple RLS/indexing |
| `name` | text not null | 1–120 chars |
| `summary` | text | Shared setting summary |
| `default_game_system` | text | Free text; Saga can override |
| `world_ai_context` | text | Shared tone/lore context for retrieval and generation |
| `source_import_defaults` | jsonb not null default `'{}'` | Import defaults for World-scoped sources |
| `schema_version` | int default 1 | Mirrored in export |
| `status` | text default `'active'` | `'active' \| 'archived'` |
| `created_at`, `updated_at`, `deleted_at` | timestamptz | |

### 2.4 `world_eras` (Priority 3, V1-ready)

Optional World-history periods. MVP may create a default hidden Era but does not expose an Era editor.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `workspace_id` | uuid → `workspaces.id` on delete cascade | Indexed |
| `world_id` | uuid → `worlds.id` on delete cascade | Indexed |
| `name` | text not null | e.g. "Age of Ash" |
| `summary` | text | Retrieval context |
| `sort_order` | int default 0 | UI order |
| `starts_at_index` | bigint | Machine-sortable chronology, nullable |
| `ends_at_index` | bigint | Machine-sortable chronology, nullable |
| `display_date_range` | text | Lore-facing date string |
| `created_at`, `updated_at` | timestamptz | |

### 2.5 `sagas`

Playable campaign/storyline inside a World.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `workspace_id` | uuid → `workspaces.id` on delete cascade | Indexed |
| `world_id` | uuid → `worlds.id` on delete cascade | Indexed |
| `owner_gm_id` | uuid → `auth.users.id` | Denormalized tenancy helper |
| `name` | text not null | 1–120 chars |
| `premise` | text | Saga-specific playable premise |
| `game_system` | text | Free text; overrides World default when set |
| `game_system_id` | uuid nullable | V1 prep: FK target `game_systems` table added in V1. Unused by V0 logic. |
| `primary_era_id` | uuid → `world_eras.id` on delete set null | Hidden/minimal in MVP |
| `starts_at_index` | bigint | V1-ready machine chronology start |
| `display_start_date` | text | Lore-facing start date string |
| `gm_profile_override` | jsonb | Null = use user default. Same shape as `gm_profiles`. |
| `creation_context` | jsonb not null default `'{}'` | Reviewed private setup: `tone`, `central_conflict`, `first_session_hook`, `gm_secrets`, and optional `world_update_proposal`. Excluded from embeddings, ordinary search, and player-facing projections. |
| `audio_retention` | text default `'delete_after_transcription'` | or `'retain'` |
| `transcript_retention` | text default `'retain'` | or `'delete_after_synthesis'` |
| `entity_count_cache` | int default 0 | Maintained by trigger. 500 soft / 1000 hard warning thresholds. Saga-scoped count. |
| `schema_version` | int default 1 | Mirrored in JSON export |
| `status` | text default `'active'` | `'active' \| 'archived'` |
| `created_at`, `updated_at`, `deleted_at` | timestamptz | |

Saga delete cascades Saga-scoped child rows only. World-scoped canon remains unless the World is deleted. Saga delete is blocked while any session is `in_progress` or `ended_pending_undo`.

### 2.6 `push_devices` (v0.5)

Mobile (and eventually web) devices registered for push notifications. User-scoped, not saga-scoped.

```sql
create table push_devices (
  id              uuid primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  expo_push_token text not null,
  platform        push_platform not null,
  device_name     text,                                      -- optional friendly label
  last_seen_at    timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  unique (user_id, expo_push_token)
);
create index on push_devices (user_id);
```

RLS scopes by `user_id = auth.uid()` (see Tech Arch Spec §2 for the policy template; this table follows the user-scoped variant used by `gm_profiles`, not the saga-scoped pattern).

Token lifecycle: registered on first mobile launch with notification permission granted; refreshed on app open via Expo's `getExpoPushTokenAsync()`; removed on uninstall (stale-sweep weekly) or explicit GM removal from settings. Web platform reserved for V1 web push.

### 2.7 `notification_preferences` default shape

The default jsonb on `gm_profiles.notification_preferences`. Per Tech Arch Spec §18.1, kinds default to "on" only when they close the loop on the review workflow:

```json
{
  "email": {
    "pipeline_ready":      true,
    "pipeline_failed":     true,
    "pipeline_stale_30d":  true,
    "pipeline_stale_90d":  true
  },
  "push": {
    "pipeline_ready":           true,
    "pipeline_failed":          true,
    "transcription_complete":   false,
    "synthesis_in_progress":    false
  },
  "paused": false
}
```

The `paused` master switch silences everything when true. Per-channel/per-kind toggles are honored at dispatch time (Tech Arch §18.4), so a GM toggling a preference between enqueue and dispatch sees the latest preference applied.

---

## 3. The six entity tables

Q1 locked: six typed tables, not polymorphic. Shared shape plus type-specific columns.

### 3.1 Shared columns (every entity table has these)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `workspace_id` | uuid → `workspaces.id` on delete cascade | Indexed |
| `world_id` | uuid → `worlds.id` on delete cascade | Indexed |
| `saga_id` | uuid → `sagas.id` on delete cascade, nullable | Required for `scope='saga'`; null for `scope='world'` |
| `scope` | content_scope not null default `'saga'` | `world` or `saga`; see §1.2b |
| `valid_from_index`, `valid_to_index` | bigint nullable | V1-ready temporal validity; unused in MVP |
| `name` | text not null | 1–200 chars. Duplicates allowed; warn at creation (Q2). |
| `summary` | text | ≤500 chars |
| `narrative` | text | Markdown allowed |
| `gm_notes` | text | Excluded from semantic retrieval; included in full-text search |
| `status` | text default `'active'` | Type-specific in-world status. **Not used for archive.** |
| `tags` | text[] default `'{}'` | Lowercase, hyphenated |
| `canon_state` | entity_canon_state default `'canon'` | Archive lives here (Q8) |
| `is_stub` | boolean default false | Q6: dedicated column for Stage Quick Stubs |
| `created_by` | actor_kind default `'gm'` | |
| `created_at`, `updated_at`, `last_edited_by_gm_at` | timestamptz | |
| `search_tsv` | tsvector generated | Over `name + summary + narrative + gm_notes` |

**Shared indices** (each table):
```sql
create index on <table> (workspace_id, world_id, scope, canon_state);
create index on <table> (workspace_id, world_id, saga_id, updated_at desc) where canon_state = 'canon';
create index on <table> (saga_id, canon_state) where scope = 'saga';
create index on <table> using gin (search_tsv);
create index on <table> using gin (tags);
```

Embeddings are stored separately (§7).

### 3.2 `characters`

```
+ is_player_character  boolean default false
+ pronouns             text
+ species_or_ancestry  text
+ role_or_occupation   text
+ home_place_id        uuid → places.id on delete set null
+ mechanical_block     jsonb  -- nullable V1 prep; ignored in V0
```

`status` values: `'alive' | 'deceased' | 'missing' | 'unknown'`.

### 3.3 `places`

```
+ parent_place_id      uuid → places.id on delete set null
+ place_kind           text   -- 'region' | 'settlement' | 'building' | 'room' | 'wilderness' | 'other'
```

`status` values: `'active' | 'destroyed' | 'lost'`.
App-layer cycle check on `parent_place_id`.
Index `(saga_id, parent_place_id)` for tree traversal.

### 3.4 `factions`

```
+ faction_kind         text   -- 'noble_house' | 'guild' | 'cult' | 'government' | 'other'
+ seat_place_id        uuid → places.id on delete set null
```

`status` values: `'active' | 'dissolved' | 'defeated'`.
Membership modeled via `relationships` (`kind='member-of'`), not denormalized.

### 3.5 `artifacts`

```
+ current_holder_character_id  uuid → characters.id on delete set null
+ current_location_place_id    uuid → places.id on delete set null
+ mechanical_block              jsonb  -- nullable V1 prep; ignored in V0
```

`status` values: `'in_play' | 'lost' | 'destroyed' | 'returned_to_origin'`.
History reconstructable from `canon_audit`. No `artifact_provenance` table in MVP.

### 3.6 `threads`

```
+ thread_kind          text default 'narrative'  -- 'narrative' | 'quest' | 'mystery' | 'political' | 'personal' | 'other'
+ objective            text
+ objectives_log       jsonb default '[]'        -- [{id, text, state, completed_at, source_id}]
+ resolution_state     text default 'active'     -- 'active' | 'dormant' | 'resolved' | 'failed'
+ resolution_details   text                      -- Required explanation when resolved or failed
+ is_loose_thread      boolean default false     -- Set by post-session synthesis; clears on approved resolution_state flip
```

**Thread lifecycle implementation patch (July 2026).** Objective entries have stable IDs, explicit `order_index`, `state='open'|'completed'`, and nullable `completed_at`. Completion sets `completed_at`; reopening clears it. Thread title, summary, visible state (`active`, `loose`, `dormant`, `failed`, `resolved`), resolution explanation, and objective mutations use Saga-scoped optimistic writes. Each explicit GM mutation writes a manual source plus `canon_audit` operation, optionally linked to a validated Session. The MVP timeline is derived from this audit/source evidence plus `session_active_threads` and Thread rows in `session_pinned_entities`; there is no timeline-event table or writable timeline path.

### 3.7 `sessions`

Sessions diverge more from the shared shape.

| Column | Type | Notes |
|---|---|---|
| `id`, `saga_id`, `name`, `summary`, `narrative`, `gm_notes`, `tags`, `canon_state`, `is_stub`, `created_by`, timestamps, `search_tsv` | (shared) | |
| `session_number` | int not null | Unique `(saga_id, session_number)` |
| `planned_date` | date | |
| `planned_start_at` | timestamptz | Optional scheduled date/time used to distinguish future Sessions; `planned_date` remains the compatibility date. |
| `started_at` | timestamptz | Set when status flips to `started` |
| `went_live_at` | timestamptz | Set when status flips to `in_progress` |
| `ended_pending_undo_at` | timestamptz | Set when status flips to `ended_pending_undo` |
| `ended_at` | timestamptz | Set when status flips to `ended` after undo window |
| `status` | session_status default `'planned'` | See §3.8 lifecycle |
| `objective` | text | |
| `opening_scene` | text | |
| `scene_notes` | text | |
| `prep_checklist` | jsonb default `'[]'` | `[{id, text, done}]` |
| `packet_locked_at` | timestamptz | Informational; GMs can still edit |
| `archived_at` | timestamptz | Soft-hides a planned/ready Session from active future-session reads. |
| `duplicated_from_session_id` | uuid → sessions.id on delete set null | Provenance for an explicit Duplicate as new planned action. |
| `consent_state` | text default `'unset'` | `'unset' \| 'granted' \| 'denied'` |
| `audio_chunk_count_expected` | int nullable | Total immutable chunks declared by the client when recording ends; transcription waits until this count is registered. |
| `recording_finalized_at` | timestamptz nullable | Set by the idempotent audio-upload finalization RPC after the expected count is durably known. |
| `transcript_deleted_at` | timestamptz | Per-session retention opt-out |
| `prep_briefing` | jsonb | v0.7: Cached output of `compose_prep_briefing` (Registry v1.0 §5). Shape: `{body: string, bullets: [string], sources: [uuid]}`. Null until first generation. |
| `prep_briefing_generated_at` | timestamptz | v0.7: When `prep_briefing` was last written. Used for cache invalidation (regenerate when any cited source's `updated_at` exceeds this). Null when `prep_briefing` is null. |
| `pending_prep_suggestions` | jsonb not null default `'[]'` | v0.7: Persisted accept-to-add / dismissed state from `generate_session_prep`. See §3.7.1 for shape. Cleared on Ready for Stage. |

**§3.7.1 `prep_briefing` shape** (app-validated, Postgres holds jsonb):

```ts
{
  body: string,                 // 150-250 word GM-facing markdown paragraph
  bullets: string[],            // 3-5 carry-forward items, each ≤120 chars
  sources: string[]             // uuid[] — source_ids cited in the briefing
}
```

**§3.7.2 `pending_prep_suggestions` shape:**

```ts
{
  id: string,                   // uuid (generated server-side per suggestion)
  scope: 'objective'            // matches generate_session_prep regenerate_scope
        | 'opening_scene'
        | 'scene_notes'
        | 'pinned_entities'
        | 'active_threads'
        | 'prep_checklist',
  payload: jsonb,               // Shape varies per scope; mirrors the matching field in
                                // generate_session_prep output (rationale + sources included)
  status: 'pending' | 'dismissed',
  generated_at: timestamptz,
  ai_prompt_version: string     // e.g. 'generate_session_prep@1.0.0'
}[]
```

**Lifecycle of `pending_prep_suggestions`:**

- After `generate_session_prep` returns: server appends new entries with `status='pending'`. De-dup against existing pending/dismissed entries by payload-signature hash (suppresses duplicate re-surfacing on regenerate).
- GM "accept" action: server writes the payload to the appropriate session field or junction table, then REMOVES the entry from the array (not flipped to "accepted").
- GM "dismiss" action: server flips `status='dismissed'` on the entry. The entry stays in the array.
- "Ready for Stage" transition: server clears the array (`UPDATE sessions SET pending_prep_suggestions = '[]' WHERE id = ?`).
- Session Reset Prep action (Session Prep Flow §12): server clears the array as part of the broader reset.

**Pinned entities and active threads** live in junction tables (Q14):

```sql
create table session_pinned_entities (
  id            uuid primary key,
  saga_id       uuid not null references sagas(id) on delete cascade,
  session_id    uuid not null references sessions(id) on delete cascade,
  entity_type   entity_type not null,
  entity_id     uuid not null,
  order_index   int not null,
  created_at    timestamptz default now(),
  unique (session_id, entity_type, entity_id)
);
create index on session_pinned_entities (saga_id, entity_type, entity_id);

create table session_active_threads (
  id            uuid primary key,
  saga_id       uuid not null references sagas(id) on delete cascade,
  session_id    uuid not null references sessions(id) on delete cascade,
  thread_id     uuid not null references threads(id) on delete cascade,
  created_at    timestamptz default now(),
  unique (session_id, thread_id)
);
create index on session_active_threads (saga_id, thread_id);
```

These power the "where is X pinned/active" backlink queries.

### 3.8 Session lifecycle

```
planned ──Session Prep: Ready for Stage──▶ ready
ready ──Stage: Start session──▶ started
started ──consent + first record OR Start without recording──▶ in_progress
in_progress ──End (2-step confirm)──▶ ended_pending_undo
  · recording stops
  · 60s undo timer starts
ended_pending_undo ──undo within 60s──▶ in_progress
ended_pending_undo ──60s elapsed──▶ ended
  · pipeline_runs row created (state='queued')
  · transcription begins
```

Session prep remains editable only in `planned` and `ready`. It is read-only in `started`, `in_progress`, `ended_pending_undo`, and `ended`; retrospective evidence belongs to Review, and future-session prep belongs to a separate planned Session.

The 60s flip is server-enforced (Edge Function or scheduled job), not client-only.

The scheduled Stage finalizer creates the queued pipeline row exactly once. Recorded sessions become transcription-eligible only when `recording_finalized_at` is set and registered `audio_chunks` meet `audio_chunk_count_expected`; this lets late IndexedDB-recovered chunks complete after the Session is already `ended` without starting an incomplete transcription.

```sql
create view session_prep_lock as
  select id, (status in ('in_progress', 'ended_pending_undo')) as prep_locked
  from sessions;
```

---

## 4. Drafts, approvals, and audit

Q5 locked: approvals collapsed into `drafts`. One terminal decision per draft = one row.

### 4.1 `drafts`

The only path from AI proposal to canon.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `workspace_id` | uuid → `workspaces.id` on delete cascade | |
| `world_id` | uuid → `worlds.id` on delete cascade | |
| `saga_id` | uuid → `sagas.id` on delete cascade, nullable | Required for Saga-scoped drafts; null for World-scoped drafts |
| `scope` | content_scope not null default `'saga'` | Post-session drafts default to Saga scope |
| `target_entity_type` | entity_type or `'note'` | What this proposes to change |
| `target_entity_id` | uuid | Null on `change_kind='create'` |
| `change_kind` | change_kind | `'create' \| 'update' \| 'merge' \| 'archive_request'` |
| `proposed_payload` | jsonb | Shape rules in §4.2 |
| `expected_version` | timestamptz | Q10: target entity's `updated_at` at draft creation. Conflict check at approval. |
| `canon_state` | draft_canon_state | `'raw_input' \| 'ai_draft'` |
| `confidence_band` | confidence_band | `'high' \| 'medium' \| 'low'`. **Application-computed from `confidence_reason`** per AI Task Registry v1.0 §0.4. Not directly written by the model. |
| `confidence_reason` | confidence_reason | Enum: source-quality category that drives the band. Model returns this; band derives server-side. |
| `ai_task_name` | text | From AI Task Registry, e.g. `'synthesize_session'` |
| `ai_model` | text | E.g. `'claude-sonnet-4'` |
| `ai_provider` | text | Resolved provider route that produced the accepted validated output. |
| `ai_prompt_version` | text | E.g. `'synthesize_session@1.0.0'` |
| `ai_task_run_id` | uuid → internal AI run ledger | Immutable task-run identity for retries and provenance. |
| `draft_batch_id` | uuid → internal AI draft-batch ledger | Groups every artifact written atomically from one synthesis result. |
| `pipeline_run_id` | uuid → `pipeline_runs.id` on delete set null | |
| `session_id` | uuid → `sessions.id` on delete set null | Evidence Session that produced the draft; a prep draft may target a different next Session. |
| **Resolution fields (filled on approve/reject/merge):** | | |
| `state` | draft_state default `'pending'` | |
| `action` | approval_action | Null while pending |
| `committed_payload` | jsonb | Differs from `proposed_payload` on Edit & Approve |
| `merge_target_id` | uuid | For `action='merge'`: existing entity merged into |
| `gm_edit_diff` | jsonb | Diff between proposed and committed (Edit & Approve only) |
| `rejection_reason_tags` | rejection_reason_tag[] default `'{}'` | v0.5: typed enum array; includes `'stale_bulk_archive'` for the Approval Queue Spec §5.1 stale-banner bulk-archive flow |
| `rejection_reason_text` | text | Optional "other" |
| `resolved_at` | timestamptz | |
| `resolved_by_gm_id` | uuid → `auth.users.id` | |
| `created_at`, `updated_at` | timestamptz | |

**Indices:**
```sql
create index on drafts (saga_id, state);
create index on drafts (saga_id, target_entity_id) where state = 'pending';
create index on drafts (saga_id, pipeline_run_id);
```

**Source-aware synthesis batches.** A validated `synthesize_session` result writes its pending summary, entity, Thread, and next-session prep artifacts in one database transaction. Every row shares one batch ID and preserves the AI task run, pipeline, evidence Session, task, prompt, resolved model, and provider. An exact redelivery returns the existing complete batch. A changed redelivery, incomplete batch, malformed artifact, or source outside the run's immutable Workspace/World/Saga/Session allowlist fails closed. `draft_sources` is populated only from those verified Session sources. The writer does not insert canon rows, `canon_audit`, embeddings, or a canonical summary note.

### 4.2 `proposed_payload` shape rules

App-layer validated (Zod or equivalent). Postgres holds jsonb.

| `change_kind` | Payload shape |
|---|---|
| `create` | Full entity shape minus system fields (`id`, `created_at`, etc.) |
| `update` | Sparse patch — only changed fields |
| `merge` | `{merge_target_id, fields_to_carry_over: [field_names]}` |
| `archive_request` | `{}` |

### 4.3 `canon_audit`

Append-only log of every state transition on canonical entities. Survives entity hard-delete (saga delete cascades; otherwise audit persists).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid pk | |
| `workspace_id` | uuid → `workspaces.id` on delete cascade | |
| `world_id` | uuid → `worlds.id` on delete cascade | |
| `saga_id` | uuid → `sagas.id` on delete cascade, nullable | Null for World-canon audit events |
| `scope` | content_scope not null | `world` or `saga` |
| `entity_type` | entity_type | |
| `entity_id` | uuid | Loose reference — not FK; may dangle after saga delete |
| `from_state` | text | `entity_canon_state` value or `'none'` for creation |
| `to_state` | text | |
| `change_summary` | jsonb | `{fields: {field: {old, new}, ...}, provenance: {draft_batch_id, ai_task_run_id, pipeline_run_id, session_id, ai_task_name, ai_prompt_version, ai_model, ai_provider, source_drift_acknowledged}}` |
| `draft_id` | uuid → `drafts.id` on delete set null | If from approval |
| `source_ids` | uuid[] default `'{}'` | FK array → `sources.id` |
| `actor_gm_id` | uuid → `auth.users.id` | |
| `actor_kind` | actor_kind | |
| `created_at` | timestamptz | |

```sql
create index on canon_audit (saga_id, entity_type, entity_id, created_at desc);
-- App role: GRANT INSERT only. No UPDATE, no DELETE.
```

### 4.4 The approval write path

**The only sequence that mutates entity tables.** Manual GM edits use the same code path with a synthetic source.

```
BEGIN;
  -- 1. Lock target if updating
  IF change_kind != 'create' THEN
    SELECT updated_at FROM <entity_table> WHERE id = target_entity_id FOR UPDATE;
    IF live_updated_at != draft.expected_version THEN
      ABORT → return conflict to UI (per §4.1 optimistic locking; conflict UX in Approval Queue Spec; PRD AQ-FR-15);
    END IF;
  END IF;

  -- 2. Apply
  CASE change_kind:
    'create'           → INSERT INTO <entity_table> (committed_payload)
    'update'           → UPDATE <entity_table> SET (committed_payload) WHERE id = target_entity_id
    'archive_request'  → UPDATE <entity_table> SET canon_state = 'archived' WHERE id = target_entity_id
    'merge'            → UPDATE the merge_target, mark the new-entity draft 'merged'
                         (then enqueue a new 'update' draft for the merge_target — must be approved separately)
  END CASE;

  -- 3. Mark draft resolved
  UPDATE drafts SET state='approved', action=..., committed_payload=..., resolved_at=now(), resolved_by_gm_id=...
    WHERE id = draft.id;

  -- 4. Write audit
  INSERT INTO canon_audit (entity_type, entity_id, from_state, to_state, change_summary, draft_id, source_ids, actor_gm_id, actor_kind);

  -- 5. Supersede sibling drafts that conflict
  UPDATE drafts SET state='superseded' WHERE target_entity_id = ... AND state = 'pending' AND id != draft.id AND conflicts_with(...);
COMMIT;

-- Async post-commit:
-- · enqueue embedding refresh for changed entity
-- · enqueue mention re-detection
```

**Reject path:** `UPDATE drafts SET state='rejected', action='reject', ...`. No `canon_audit` row (audit records changes; rejection is a non-change).

**C5 transaction and retry rules.** The scoped commit RPC locks both the pending draft and any existing target before checking `updated_at`, `canon_state`, source drift/breakage, target existence, and applicable Session state. It accepts only allowlisted fields for the draft's entity/change kind. A private `approval_action_receipts` ledger records the exact scoped request hash and result; browser roles have no table access. An exact replay returns the original result and cannot duplicate canon or audit effects. A mismatched replay, cross-Saga target/reference, missing/archived target, stale version, broken source, or incompatible Session state fails closed. `save_draft_edit` persists the GM's allowlisted edit before commit so a later conflict/failure does not discard work.

**Bulk approval rule.** Approve one, explicitly selected, and visible all-compatible actions invoke the same per-draft scoped transaction. Bulk UI excludes conflicts, broken sources, dirty edits, merge decisions, and archive confirmations. Partial progress is visible; a later conflict cannot roll back or overwrite an earlier successful explicit approval.

**Manual GM edit path:** Same as above, but synthesize a `sources` row with `kind='gm_instruction'` and a draft with `change_kind='update'`, `confidence_band='high'`, `ai_task_name='gm_direct_edit'`, then immediately resolve it as `approved`. Keeps the audit uniform.

---

## 5. Relationships and mentions

### 5.1 `relationships`

Fixed-vocabulary directed edges (PRD `ENT-FR-6`).

```sql
create table relationships (
  id                 uuid primary key,
  saga_id            uuid not null references sagas(id) on delete cascade,
  from_entity_type   entity_type not null,
  from_entity_id     uuid not null,
  to_entity_type     entity_type not null,
  to_entity_id       uuid not null,
  kind               relationship_kind not null,
  notes              text,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now(),
  unique (saga_id, from_entity_type, from_entity_id, to_entity_type, to_entity_id, kind)
);
create index on relationships (saga_id, from_entity_type, from_entity_id);
create index on relationships (saga_id, to_entity_type, to_entity_id);
```

`allied-with` / `opposed-to` are symmetric concepts but stored as one row; app layer renders both directions.


### 5.1b `relationship_sources` (Priority 3)

Relationship provenance is explicit. Mentions remain automatic text detections; relationships are meaningful GM-approved or GM-created connections.

```sql
create table relationship_sources (
  relationship_id uuid not null references relationships(id) on delete cascade,
  source_id       uuid not null references sources(id) on delete cascade,
  created_at      timestamptz not null default now(),
  primary key (relationship_id, source_id)
);
```

### 5.2 `mentions`

Detected entity references inside narrative text. Backlinks = "mentions pointing *to* entity X" — no separate backlinks table.

```sql
create table mentions (
  id                       uuid primary key,
  saga_id                  uuid not null references sagas(id) on delete cascade,
  source_text_kind         text not null,  -- 'character_narrative' | 'place_narrative' | 'note' | 'session_scene_notes' | etc.
  source_entity_type       entity_type not null,
  source_entity_id         uuid not null,
  mentioned_entity_type    entity_type not null,
  mentioned_entity_id      uuid not null,
  mention_offsets          int4range[] default '{}',
  state                    mention_state default 'suggested',
  snoozed_until            timestamptz,  -- For state='snoozed'. Default 7 days from snooze action.
  created_at               timestamptz default now(),
  updated_at               timestamptz default now(),
  unique (source_entity_type, source_entity_id, mentioned_entity_type, mentioned_entity_id)
);
create index on mentions (saga_id, mentioned_entity_type, mentioned_entity_id, state);
```

Detection runs server-side on entity save, debounced ~5s. **Never during a session** (PRD `STG-FR-11`). Rename of an entity triggers re-detection across the saga (debounced, batched).

---

## 6. Notes

Q12 locked: notes with optional N-to-N attachments. Free-floating lore (no attachments) is valid.

### 6.1 `notes`

```sql
create table notes (
  id                                uuid primary key,
  saga_id                           uuid not null references sagas(id) on delete cascade,
  title                             text,
  body                              text not null,
  note_type                         note_type not null,
  tags                              text[] default '{}',
  canon_state                       entity_canon_state default 'canon',
  created_by                        actor_kind default 'gm',
  session_id                        uuid references sessions(id) on delete set null,  -- For quick_capture
  quick_capture_timestamp_seconds   int,
  search_tsv                        tsvector generated always as (to_tsvector('english', coalesce(title,'') || ' ' || body)) stored,
  created_at                        timestamptz default now(),
  updated_at                        timestamptz default now()
);
create index on notes (saga_id, note_type);
create index on notes using gin (search_tsv);
```

**Note types:**

| Type | Purpose | Semantically retrievable? |
|---|---|---|
| `lore` | Worldbuilding prose, attachable to entities | ✓ |
| `gm_note` | Multi-entity or free-floating GM-only notes (distinct from per-entity `gm_notes` column) | ✗ |
| `quick_capture` | Stage capture, timestamped, raw | ✓ |
| `summary` | Session summary from post-session pipeline (approved) | ✓ |

**Player-visibility note.** `note_type='gm_note'` is fully FTS-indexed (the `search_tsv` doesn't filter by type), but retrieval surfaces must filter `note_type != 'gm_note'` for any player-role query. Enforced by the player-role RLS policy when player wiki ships (V1). See Memory & Retrieval Spec §2 principle 4.

### 6.2 `note_attachments`

```sql
create table note_attachments (
  id            uuid primary key,
  saga_id       uuid not null references sagas(id) on delete cascade,
  note_id       uuid not null references notes(id) on delete cascade,
  entity_type   entity_type not null,
  entity_id     uuid not null,
  created_at    timestamptz default now(),
  unique (note_id, entity_type, entity_id)
);
create index on note_attachments (saga_id, entity_type, entity_id);
```

Zero rows = free-floating note. N rows = multi-attached.

---

## 7. Embeddings (separate, multi-version)

Q15 locked: separate `embeddings` table supporting multiple embeddings per entity (chunked, multi-model).

### 7.1 `embeddings`

```sql
create table embeddings (
  id                  uuid primary key,
  saga_id             uuid not null references sagas(id) on delete cascade,
  source_kind         text not null,                -- 'entity' | 'note' | 'transcript_chunk'
                                                    -- Note: this is a local text column, NOT the top-level source_kind enum
                                                    -- used by the sources table (§8.1). Different domains, different values.
  source_entity_type  entity_type,                  -- When source_kind='entity'
  source_entity_id    uuid,                         -- entity id, note id, or transcript id depending on source_kind
  chunk_index         int not null default 0,       -- 0 for whole-record; >0 for chunked long lore or transcript windows
  chunk_text          text,                         -- The text actually embedded (debugging/reranking).
                                                    -- NULL for source_kind='transcript_chunk'; reconstruct from transcripts.segments + source bounds.
                                                    -- Populated for source_kind='entity' and source_kind='note'.
  vector              vector(1536) not null,
  model               text not null,                -- e.g. 'text-embedding-3-small'
  model_version       text not null,                -- e.g. '2024-01-25'
  is_current          boolean not null default true,  -- Multiple versions coexist during migration; only current ones served
  created_at          timestamptz default now(),
  unique (source_kind, source_entity_id, chunk_index, model, model_version)
);
create index on embeddings (saga_id, source_kind, source_entity_id) where is_current;
create index on embeddings using hnsw (vector vector_cosine_ops) where is_current;
```

**Generation rules:**
- Triggered async on substantive content change to source: `name`, `summary`, `narrative`, attached lore note bodies. NOT on `gm_notes`-only edits.
- Long notes (`note_type='lore'`, body > ~2000 chars) chunked. Other entities single-chunk.
- Transcripts chunk at 60s windows with 10s overlap (Memory Spec §4.3). Each chunk embedded with `source_kind='transcript_chunk'`, `source_entity_id=<transcripts.id>`, and a `sources` row carrying `start_seconds`/`end_seconds` for citation.
- Migration to a new model: insert new rows with `is_current=false`, backfill, atomic flip via UPDATE.
- Entity hard-delete (via saga cascade) removes embeddings via FK cascade. Otherwise embeddings outlive content edits — old rows can be cleaned async, no rush.

**`chunk_text` storage policy.** Populated for `source_kind='entity'` and `source_kind='note'`. NULL for `source_kind='transcript_chunk'` — the `transcripts.segments` jsonb plus the source row's `start_seconds`/`end_seconds` are sufficient to reconstruct, and storing duplicates inflates the table on transcript-heavy sagas. See Memory & Retrieval Spec §3.5.

**Retrieval:** Do not query `embeddings` directly from application code. Retrieval flows through the `search_for_ui` and `retrieve_for_task` SQL functions defined in Memory & Retrieval Spec §5. See §12.2 below.

**GM-only content excluded:** `gm_notes` and `note_type='gm_note'` are not embedded. Full-text searchable, not semantically retrievable.

---

## 8. Sources, sessions, and pipeline

### 8.1 `sources`

Citations. Immutable after creation. Every AI proposal cites ≥1; manual GM edits cite a synthetic `gm_instruction` source.

```sql
create table sources (
  id                       uuid primary key,
  saga_id                  uuid not null references sagas(id) on delete cascade,
  kind                     source_kind not null,
  session_id               uuid references sessions(id) on delete set null,
  transcript_id            uuid references transcripts(id) on delete set null,
  start_seconds            int,
  end_seconds              int,
  note_id                  uuid references notes(id) on delete set null,
  referenced_entity_type   entity_type,
  referenced_entity_id     uuid,
  raw_excerpt              text,                -- Q13: frozen excerpt; survives source deletion.
                                                -- Content per kind:
                                                --   'transcript_segment'   → ≥10s of surrounding transcript text
                                                --   'note'                 → the note body (or first 2000 chars)
                                                --   'pasted_text'          → the pasted chunk that grounded the proposal
                                                --   'gm_manual_summary'    → the GM's summary text
                                                --   'existing_entity'      → entity name + summary at time of citation
                                                --   'workshop_input'       → the pasted chunk OR a digest of relevant conversation turns
                                                --   'gm_instruction'       → the GM's typed prompt verbatim
  created_at               timestamptz default now()
);
create index on sources (saga_id, kind);
create index on sources (transcript_id, start_seconds) where transcript_id is not null;
```

**Manual Session evidence.** `pasted_text` and `gm_manual_summary` sources are Saga-scoped, carry the exact Workspace/World/Saga/Session hierarchy, and store the submitted text in `raw_excerpt`. The Session must already be `ended`. These rows are immutable evidence inputs, not `notes`, and do not enter canon search/retrieval until a later approved output creates the owning canon record. The client supplies the source UUID before delivery so a save retry is exactly-once; the scoped RPC returns an existing row only when every immutable field matches.

The latest `pipeline_runs.inputs_summary` records the source IDs/counts and `gm_summary_present` flag. This metadata says that synthesis has a surviving input; it is not itself an invocation, usage charge, proposal, or approval.

### 8.2 `draft_sources`

Junction: drafts ↔ sources (many-to-many).

```sql
create table draft_sources (
  id          uuid primary key,
  saga_id     uuid not null references sagas(id) on delete cascade,
  draft_id    uuid not null references drafts(id) on delete cascade,
  source_id   uuid not null references sources(id) on delete cascade,
  created_at  timestamptz default now(),
  unique (draft_id, source_id)
);
```

### 8.3 `transcripts`

One per session that has recording. Whisper output.

```sql
create table transcripts (
  id                  uuid primary key,
  saga_id             uuid not null references sagas(id) on delete cascade,
  session_id          uuid not null unique references sessions(id) on delete cascade,
  whisper_model       text not null,
  language            text,
  duration_seconds    int,
  state               transcript_state default 'pending',
  failure_reason      text,
  segments            jsonb default '[]',     -- [{start, end, text, deleted?}] — current (possibly edited) version
  original_segments   jsonb,                  -- v0.5: nullable; populated on first edit with verbatim Whisper output
  edited_at           timestamptz,            -- v0.5: nullable; null = never edited; set on every edit pass
  deleted_at          timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);
```

Per-session deletion (`PSP-FR-12`) sets `deleted_at` on the transcript row AND `transcript_deleted_at` on the session. `sources.raw_excerpt` already frozen — citations survive transcript deletion or edit.

**v0.5 — Transcript editing.** GMs can edit individual segment text during the pipeline review window (PRD v0.10 `PSP-FR-12`, Tech Arch §7.9). Edit rules:

- Edits change segment `text` only. `start`, `end`, and segment boundaries are immutable.
- Soft-delete a segment by setting `deleted=true` in the jsonb. Hidden from rendered transcripts; `start`/`end` retained so citations don't break.
- New segments cannot be added in MVP. (V1 may allow inline clarification notes.)
- On the **first** edit to any segment in a transcript, the verbatim Whisper output is copied to `original_segments` for diffing. Subsequent edits keep building on `segments`; `original_segments` stays frozen.
- `edited_at` is updated on every edit pass; consumers use it to detect drift cheaply.

**Citation drift.** Sources captured during pipeline synthesis store `raw_excerpt` (Schema §8.1). That field is **frozen** — it does not update when the underlying transcript is edited. The source-view UI in the Approval Queue compares `sources.raw_excerpt` against the live segment text at the same `(start_seconds, end_seconds)` range. When they differ after whitespace normalization, the surface shows a drift indicator with a "Show both" toggle. Tech Arch Spec §7.9 owns the comparison logic and the indicator's data contract.

**C4 read boundary.** Browser surfaces resolve citations by draft, never by an arbitrary source identifier. The authenticated `get_draft_source_context(workspace_id, world_id, saga_id, draft_id)` read rechecks the complete draft/source/transcript scope and returns display-safe records only. Transcript records include the frozen excerpt, current segment text, immutable timestamp range, authorized evidence Session ID, and `exact | edited | deleted | unavailable` state. Pasted notes and GM manual summaries return frozen untimestamped evidence. Missing links, soft-deleted sources, mismatched transcript relationships, permission denial, and unsupported kinds collapse to safe UI states without source/transcript IDs or sibling data. `get_transcript_source_context(source_id)` is an internal helper and is not callable by browser roles.

**Re-embedding.** Edited segments re-embed at pipeline close via the `transcript-edit-reembed` Edge Function (Tech Arch §6.6). Only segments whose text changed are re-embedded; chunk-overlap windows touched by edits are also refreshed. Edits made after pipeline close (rare) trigger a 30s-debounced re-embed pass.

### 8.4 `audio_chunks`

Chunked recording uploads.

```sql
create table audio_chunks (
  id                  uuid primary key,
  saga_id             uuid not null references sagas(id) on delete cascade,
  session_id          uuid not null references sessions(id) on delete cascade,
  sequence            int not null,
  storage_path        text not null,
  bytes               int,
  duration_seconds    numeric,
  client_recorded_at  timestamptz not null,
  uploaded_at         timestamptz,
  deleted_at          timestamptz,
  created_at          timestamptz default now(),
  unique (session_id, sequence)
);
```

Deleted per saga's `audio_retention` setting after successful transcription.


### 8.5 `session_marked_moments`

Separate table for Mark Moment flags captured during recording. This is the selected V0 storage path from the Stage UX §20 options because moments need their own labels, timestamps, sync state, and post-session review ordering without mutating audio chunk rows.

```sql
create table session_marked_moments (
  id                 uuid primary key,
  saga_id            uuid not null references sagas(id) on delete cascade,
  session_id         uuid not null references sessions(id) on delete cascade,
  audio_chunk_id     uuid references audio_chunks(id) on delete set null,
  occurred_at        timestamptz not null,
  offset_seconds     numeric,                    -- optional offset from session recording start
  label              text,                       -- freeform; UI suggests decision · lie · secret
  created_at         timestamptz default now(),
  synced_at          timestamptz
);
create index on session_marked_moments (saga_id, session_id, occurred_at);
```

Marked moments are Raw Input cues for review, not canon. They may cite an `audio_chunk_id` when known, but remain valid if audio is later deleted under the saga retention policy.

### 8.5b `internal.stage_write_receipts`

Private idempotency ledger for short-window Stage write recovery. This table is not exposed through the Data API and is not a canon, source, or audit surface.

```sql
create table internal.stage_write_receipts (
  id                 uuid primary key,
  gm_id              uuid not null references auth.users(id) on delete cascade,
  workspace_id       uuid not null references workspaces(id) on delete cascade,
  world_id           uuid not null references worlds(id) on delete cascade,
  saga_id            uuid not null references sagas(id) on delete cascade,
  session_id         uuid not null references sessions(id) on delete cascade,
  idempotency_key    text not null,
  intent_kind        text not null,        -- start_session | quick_capture | quick_stub | record_consent | go_live | mark_moment | end_session | undo_end_session
  payload            jsonb not null,
  result             jsonb not null,
  created_at         timestamptz not null default now(),
  unique (gm_id, idempotency_key)
);
create index on internal.stage_write_receipts (session_id, created_at);
create index on internal.stage_write_receipts (workspace_id);
create index on internal.stage_write_receipts (world_id);
create index on internal.stage_write_receipts (saga_id);
```

`apply_stage_write_intent` authenticates the GM, rechecks Workspace/World/Saga/Session scope, serializes delivery by `(gm_id, idempotency_key)`, and writes the product row plus receipt in one transaction. A repeated key returns the recorded result only when scope, kind, and canonicalized JSON payload match; key reuse with different input fails closed. Successful results record `outcome='applied'`. If a queued lifecycle or consent intent no longer matches the server state it expected, the RPC records `outcome='conflict'` with the local intent and current server value and performs no domain overwrite. Replaying that conflict returns the same receipt. This ledger never substitutes for `sources` or `canon_audit` where those are required by the owning write path.

### 8.6 `pipeline_runs`

Each execution of post-session synthesis.

```sql
create table pipeline_runs (
  id                      uuid primary key,
  saga_id                 uuid not null references sagas(id) on delete cascade,
  session_id              uuid not null references sessions(id) on delete cascade,
  state                   pipeline_state default 'queued',
  failure_reason          text,
  inputs_summary          jsonb default '{}',   -- {transcript_id, note_ids, gm_summary_present, capture_count}
  summary_note_id         uuid references notes(id) on delete set null,
  staleness_warned_at     timestamptz,           -- v0.4: 30-day stale warning surfaced
  staleness_nudge_90_at   timestamptz,           -- v0.5: 90-day softer nudge surfaced (Tech Arch §14)
  created_at              timestamptz default now(),
  updated_at              timestamptz default now(),
  closed_at               timestamptz
);
create index on pipeline_runs (saga_id, state);
```

Re-running synthesis (`PSP-FR-10`) creates a new `pipeline_runs` row and supersedes the prior run's pending drafts.

---

## 9. Auxiliary tables

### 9.1 `dice_rolls` (ephemeral, per session)

```sql
create table dice_rolls (
  id                  uuid primary key,
  saga_id             uuid not null references sagas(id) on delete cascade,
  session_id          uuid not null references sessions(id) on delete cascade,
  expression          text not null,        -- '2d6+3'
  result_total        int not null,
  result_breakdown    int[] not null,
  label               text,
  created_at          timestamptz default now()
);
create index on dice_rolls (session_id, created_at desc);
```

Not entities. Not searchable. Not in AI retrieval.

### 9.2 `consent_log`

Recording consent trail per session.

```sql
create table consent_log (
  id            uuid primary key,
  saga_id       uuid not null references sagas(id) on delete cascade,
  session_id    uuid not null references sessions(id) on delete cascade,
  granted       boolean not null,
  prompted_at   timestamptz not null,
  decided_at    timestamptz not null,
  created_at    timestamptz default now()
);
```

Current state on `sessions.consent_state`; trail here (append on changes).

### 9.3 `workshop_sessions`

Pre-commit saga-creation state. RLS scopes by `user_id` until `workspace_id`, `world_id`, and `saga_id` are set on commit.

```sql
create table workshop_sessions (
  id                      uuid primary key,
  user_id                 uuid not null references auth.users(id),
  workspace_id            uuid references workspaces(id) on delete cascade,
  world_id                uuid references worlds(id) on delete cascade,
  saga_id                 uuid references sagas(id) on delete cascade,
  path                    workshop_path not null,
  gm_profile_snapshot     jsonb not null,
  conversation            jsonb default '[]',   -- [{role, content, timestamp}]
  interview_plan          jsonb default '{}',   -- one validated 3-5-question plan
  emerging_outline        jsonb default '{}',   -- deterministic answer-to-field projection
  workshop_phase          text default 'planning', -- planning | conversation | drafting | review | committed
  conversation_step       int default 0,
  gm_message_count        int default 0,
  total_message_count     int default 0,
  ai_task_run_id          uuid,
  draft_payload           jsonb default '{}',   -- accumulating entities
  state                   workshop_state default 'in_progress',
  created_at              timestamptz default now(),
  updated_at              timestamptz default now()
);
create index on workshop_sessions (user_id, state);
create index on workshop_sessions (workspace_id, world_id, saga_id) where saga_id is not null;
```

`internal.workshop_turn_receipts` stores `(workshop_id, user_id, idempotency_key, action, input_hash, result)` with one unique receipt per user/workshop key. It is not Data API-visible. Turn RPCs lock only the owning workshop row, validate expected phase/version and all message budgets, write the conversation/outline change plus receipt atomically, and keep transactions short. Exact replay returns the first result; changed-input key reuse fails closed.

The planning and deep-scaffold runs are separate `ai_task_runs`; `workshop_sessions.ai_task_run_id` points to the current run. A workshop therefore has a non-unique run-history index rather than a one-run uniqueness constraint. The complete normalized GM conversation becomes immutable `workshop_input` evidence at the deep-draft dispatch boundary. Later review edits do not rewrite evidence.

**Commit flow:** The review screen IS the approval moment. On commit, entities are INSERTed directly into entity tables with `created_by='gm_via_ai_approval'`, synthetic `sources` rows (`kind='workshop_input'`), and synthetic `drafts` (immediately resolved as `approved`) for the audit trail. Reviewed tone/conflict/hook/secrets are written to `sagas.creation_context`, never embedded. A newly created World may initialize its reviewed summary/context from the scaffold; for an existing World, the same fields remain only as `creation_context.world_update_proposal` and do not mutate shared World canon. No second queue.

---

## 10. Lifecycle paths (summary)

### 10.1 Entity creation

| Path | `created_by` | Source kind | Notes |
|---|---|---|---|
| Manual Sanctum create | `'gm'` | `'gm_instruction'` | Direct INSERT + synthetic audit |
| Stage Quick Stub | `'gm'` | `'gm_instruction'` | Same, but `is_stub=true` |
| Session Prep AI Quick Stub (v0.7) | `'gm_via_ai_approval'` | `'gm_instruction'` + retrieved `session_prep_grounding` sources | `is_stub=true`. Synthetic resolved draft row written for audit (same pattern as saga creation commit). Accepted suggested relationships inserted in same transaction. Auto-pinned to active prep session. |
| saga creation commit | `'gm_via_ai_approval'` | `'workshop_input'` | Synthetic resolved drafts for audit |
| Post-session approval | `'gm_via_ai_approval'` | Pipeline-sourced | §4.4 approval write path |

### 10.2 Entity update

| Path | Trigger |
|---|---|
| Direct edit (autosave) | UPDATE + synthetic source + audit + async embedding regen + async mention re-detection |
| Approval pipeline | §4.4 approval write path |

### 10.3 Archive (the only destructive action in-saga)

```
UPDATE <entity_table> SET canon_state = 'archived' WHERE id = ?
INSERT INTO canon_audit (from_state='canon', to_state='archived', ...)
```

Reversible: same path, `'canon'` ← `'archived'`.

Archived entities:
- Hidden from default lists, default search, AI retrieval
- Backlinks still resolve; render with `[archived]` marker
- Source citations still work (entity still exists)

### 10.4 Hard-delete (archived, unreferenced records only)

Characters, Places, Factions, Artifacts, Threads, and Notes may be hard-deleted individually only when all of the following remain true inside the deletion transaction:

- `canon_state='archived'`;
- the GM completed the UI's initial destructive-action confirmation and exact-name/title confirmation;
- no relationship, mention/backlink, note attachment, Session pin, active-Thread link, or pending draft target still references the record.

If any dependency exists, deletion fails closed and the archived record remains recoverable. The UI identifies that references must be removed first; it does not silently cascade or orphan them. On successful deletion, current embeddings are removed and the record's own synthetic sources/audit rows remain as historical tombstones without a live entity link. Saga deletion remains the only bulk hard-delete path and uses the staged cleanup contract in §11.

### 10.4b Session prep suggestion acceptance (v0.7)

When the GM accepts a `generate_session_prep` suggestion (Session Prep Flow §7.3), the write goes to either a session-row field or a junction table — never to an entity row directly. Pattern:

```
BEGIN;
  -- 1. Write the accepted payload
  CASE scope:
    'objective' / 'opening_scene' / 'scene_notes'
         → UPDATE sessions SET <field> = <payload value> WHERE id = ?
    'pinned_entities'
         → INSERT INTO session_pinned_entities (saga_id, session_id, entity_type, entity_id, order_index)
    'active_threads'
         → INSERT INTO session_active_threads (saga_id, session_id, thread_id)
    'prep_checklist'
         → UPDATE sessions SET prep_checklist = prep_checklist || <new item> WHERE id = ?
  END CASE;

  -- 2. Remove the suggestion from pending_prep_suggestions
  UPDATE sessions
    SET pending_prep_suggestions = (
      SELECT jsonb_agg(elem)
      FROM jsonb_array_elements(pending_prep_suggestions) elem
      WHERE elem->>'id' != $suggestion_id
    )
    WHERE id = $session_id;

  -- 3. Write audit (for session-row updates, not junction inserts)
  INSERT INTO canon_audit (
    entity_type='session', entity_id=$session_id,
    from_state='canon', to_state='canon',
    change_summary={...},
    actor_kind='gm_via_ai_suggestion_accept',
    source_ids=<from the suggestion's payload.sources>
  );
COMMIT;
```

No `drafts` row is created. No `draft_sources`. The suggestion's source citations are captured directly on the `canon_audit` row.

Dismissal is a `UPDATE pending_prep_suggestions[i].status = 'dismissed'` only. No audit row (no canon transition).

**Post-session next-prep implication approval (C5).** A C3 `entity_type='session'`, `change_kind='update'` draft may append one source-linked `scene_notes` suggestion to `pending_prep_suggestions` only when its exact target Session is still `planned`. The commit validates same-Saga related Thread/entity references, preserves the draft/source/run provenance in `canon_audit`, and deduplicates by `draft_id`. It does not directly rewrite objective, scene notes, pins, Threads, or checklist state; the normal acceptance path above remains a separate GM action.

### 10.5 Rename

Normal field update. References hold IDs, not names — no cascade needed. Triggers:
- Embedding regen (name is in embedded text)
- Mention re-detection across the saga (other entities may reference the old name)

### 10.6 Merge

1. GM selects "merge" on a new-entity draft, picks target entity
2. Mark the new-entity draft `state='merged'`, `action='merge'`, `merge_target_id=target`
3. Enqueue a *new* draft with `change_kind='update'`, `target_entity_id=target`, payload = fields-to-carry-over
4. That update draft goes back to the queue for explicit approval

Two-step is deliberate (per `AQ-FR-12`): merge decides identity; the resulting canon change still requires approval.

---

## 11. Saga delete cascade

Deletion is staged so database finalization cannot orphan Storage. The scoped delete RPC verifies the exact Workspace/World/Saga, requires the GM to type the current Saga name, rejects `in_progress` and `ended_pending_undo` Sessions, sets `deleted_at`, and enqueues one `cleanup:saga:<saga_id>` job. The hidden Saga is no longer switchable or readable through browser scope.

The service-role-only `cleanup-saga` worker discovers and removes every object under the exact `<workspace_id>/<world_id>/<saga_id>/` prefix in `audio`, `attachments`, and `exports`. Only after all Storage API removals succeed may cleanup completion hard-delete `sagas`, which drives the database cascade:

```
sagas (deleted) ──CASCADE──▶
  characters, places, factions, artifacts, threads, sessions
  notes, note_attachments
  relationships, mentions
  drafts, draft_sources, sources, canon_audit
  transcripts, audio_chunks, session_marked_moments, pipeline_runs
  session_pinned_entities, session_active_threads
  dice_rolls, consent_log
  embeddings
  workshop_sessions (where saga_id matches)
```

**Non-FK operational cleanup.** Saga-attributed embedding, transcription, export, notification, stale-warning, and superseded cleanup jobs are removed during finalization because these `internal.*` tables do not all FK-cascade to `public.sagas`. The completed Saga cleanup receipt remains as operational evidence.

**`push_devices` is NOT cascaded.** Push device registrations are user-scoped, not saga-scoped — they survive saga deletion. They cascade only on `auth.users` deletion (not an MVP path).

Blocked while any session is `in_progress` or `ended_pending_undo`.

---

## 12. Search and retrieval

### 12.1 Full-text search (`ENT-FR-4`)

Per-entity-table GIN on `search_tsv`. Saga-scoped query unions across entity tables + attached lore notes:

```sql
-- Pseudocode
SELECT id, type, ts_rank(search_tsv, q) AS rank
FROM (
  SELECT id, 'character' AS type, search_tsv FROM characters WHERE saga_id = $1 AND canon_state = 'canon'
  UNION ALL ...  -- each entity type
  UNION ALL
  SELECT n.id, 'note', n.search_tsv FROM notes n WHERE n.saga_id = $1
) all_searchable, websearch_to_tsquery($2) q
WHERE search_tsv @@ q
ORDER BY rank DESC LIMIT 50;
```

Target: <300ms for ≤500 entities (PRD `ENT-FR-4`).

### 12.2 Semantic retrieval (`AI-FR-6`)

Semantic retrieval is one half of the hybrid retrieval algorithm specified in **Memory & Retrieval Spec §5**. The HNSW index defined in §7 backs the semantic arm; the lexical arm uses the `search_tsv` indexes defined per-table. Both arms are fused via Reciprocal Rank Fusion in the `retrieve_for_task` and `search_for_ui` SQL functions.

**Do not implement direct HNSW queries from application code.** All retrieval — GM search, AI grounding, post-session synthesis — flows through the two SQL functions above. The functions inherit RLS from the calling user; sibling-Saga retrieval is structurally excluded by default at the query level. Future cross-Saga tools must opt in explicitly and still remain inside the same Workspace/World boundary.

### 12.3 Embedded text

Entities: `name + summary + narrative` + attached lore note bodies.
Notes (`lore`, `quick_capture`, `summary`): title + body.
Excluded: `gm_notes` column, `gm_note` note type.

---

## 13. RLS sketch (full policies in Tech Architecture Spec v1.2 §2)

This is a quick reference. The locked policies now use Workspace/World/Saga helper functions rather than a saga-only predicate.

Required helper functions:

```sql
public.user_owns_workspace(workspace_id uuid)
public.user_is_workspace_member(workspace_id uuid) -- owner-only in MVP, member-ready for V1
public.world_belongs_to_workspace(world_id uuid, workspace_id uuid)
public.saga_belongs_to_world(saga_id uuid, world_id uuid)
public.user_owns_world(world_id uuid)
public.user_owns_saga(saga_id uuid)
```

Table policy pattern:

```sql
-- World-scoped or mixed-scope content
using (
  public.user_owns_workspace(workspace_id)
  and public.world_belongs_to_workspace(world_id, workspace_id)
  and (
    (scope = 'world' and saga_id is null)
    or
    (scope = 'saga' and saga_id is not null and public.saga_belongs_to_world(saga_id, world_id))
  )
)
with check (same predicate);
```

Saga-only tables (`sessions`, `transcripts`, `audio_chunks`, `session_pinned_entities`, `session_active_threads`, `session_marked_moments`, `pipeline_runs`, `dice_rolls`, `consent_log`) require `saga_id` and validate that the Saga belongs to the row's World and Workspace.

`workshop_sessions` remains user-scoped until commit. Once a Saga is attached, the row must also satisfy Workspace/World/Saga checks.

## 14. Open questions for downstream docs

Not blocking this schema. Resolve in next docs:

- ~~Exact `experience_level` enum values (→ First-Run UX Flow)~~ **Resolved in vault finalization:** locked as `new`, `returning`, `experienced`, `veteran`.
- ~~Confidence-band thresholds — the proxy is locked, cut points aren't (→ AI Task Registry)~~ **Resolved v0.4:** `confidence_reason` enum drives band deterministically per Registry §0.4.
- ~~Embedding generation queue mechanism — Edge Function on trigger vs cron (→ Tech Architecture Spec)~~ **Resolved v0.5:** Tech Arch §6 — trigger-driven via `pg_net` with cron watchdog.
- ~~Schedule for 30-day stale warning on pipeline runs (→ Tech Architecture Spec)~~ **Resolved v0.5:** Tech Arch §14 — daily `pg_cron` at 03:00 UTC; flips `staleness_warned_at` AND `staleness_nudge_90_at` (this revision); enqueues notifications.
- ~~JSON export shape per `EXP-FR-2` (→ Tech Architecture Spec)~~ **Resolved v0.5:** Tech Arch §13.2 — curated default with `include_audit` toggle.
- ~~Mention detection algorithm (Postgres function vs app code) (→ Tech Architecture Spec)~~ **Resolved v0.5:** Tech Arch §11 — Stage 1 Postgres trigger, Stage 2 Edge Function.
- ~~`is_loose_thread` clear-conditions beyond "approved resolution_state flip" (→ Approval Queue Spec)~~ **Resolved v0.4:** `is_loose_thread` is cleared by any approved UPDATE draft that flips `resolution_state` to a non-`active` value (`resolved`, `failed`, or `dormant`). Per-edge cases (manual GM override, re-opening a resolved thread) handled in Approval Queue Spec.

**New in v0.5 (no open questions; for documentary clarity).** Notification system tables (`push_devices`, `gm_profiles.notification_preferences`, notification enums) and transcript editing columns (`transcripts.original_segments`, `transcripts.edited_at`) are fully specified in Tech Arch Spec v1.0 §7.9, §14, §18. The schema additions in this revision are the data-model commitments behind those mechanisms.

---

*End Entity & Canon Schema v0.8 vault copy. Consumed by AI Task Registry, Approval Queue, and Tech Architecture specs.*
