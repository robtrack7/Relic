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
source_file: "Sourced - Downloaded - 260518/relic-first-run-ux-flow-v0_2.md"
---

> [!info] How to use this spec
> Owns: First-run/new-saga flow, GM profile capture, help-level choice, scaffold review, and Session 1 handoff.
> Does not own: Historical rationale and superseded naming unless explicitly retained as an internal identifier.
> Read next: [[00 - Start Here]]
> Implementation-critical note: Treat this as coding input only after reading the authority order in [[00 - Start Here]].
# Relic First-Run UX Flow v0.2

**Status:** Active first-run UX specification  
**Scope:** P0 MVP  
**Source of truth inputs:** `[[11 - Product Basepoint]]`, `[[12 - MVP PRD]]`, `[[20 - Entity and Canon Schema]]`, `[[23 - AI Task Registry]]`, `[[31 - Session Prep Flow]]`, `[[32 - Stage UX Flow]]`, `[[34 - UI Implementation Spec]]`, `[[25 - Pricing and Rate Limits]]`, `[[13 - Design System]]`  
**Purpose:** Specify the first 10 to 20 minutes from account creation to a ready first session without requiring implementation agents to invent onboarding, saga creation, profile capture, scaffold review, or recovery states.

---

## Changelog

**v0.2 (May 2026).** Document-control refresh. Updates active source references to the current versioned files after Priority 5/6. No first-run flow states or acceptance criteria changed.


## 0. Locked framing

First run is not a tour. It is the GM's first real pass through the Relic loop:

> account → default Workspace → World → Saga → scaffold or blank start → Sanctum home → Plan Session 1 → Ready for Stage

The user-facing entry is **New saga**. Do not use **Saga Creation** in UI copy. `workshop_sessions`, `workshop_path`, `workshop_state`, and `workshop_input` remain valid internal names.

### First-run goals

1. A new GM creates a real Saga inside a real World.
2. Relic quietly creates the default Workspace.
3. The GM understands the World/Saga relationship without being forced into admin setup.
4. Build with AI and Bring your notes produce reviewable AI Drafts.
5. Start blank creates an empty Saga immediately.
6. The GM lands in the Sanctum with a clear next action: **Plan your first session**.
7. Session 1 can be created, prepared, and marked **Ready for Stage** without leaving the flow.

### Non-goals

- No separate tutorial Saga.
- No player setup.
- No co-GM or Workspace member setup.
- No Era editor.
- No full World dashboard.
- No PDF, Obsidian, Notion, World Anvil, Kanka, or RAG import in first-run MVP.
- No image generation.
- No autonomous canon writes.

---

## 1. Route and state map

Suggested route names are implementation guidance, not locked product copy.

| Step | Suggested route | Primary record state | Notes |
|---|---|---|---|
| Auth | `/auth` | `auth.users` | Email + password minimum. Magic link optional if already supported. |
| Bootstrap | server action after auth | `workspaces` | Create default Workspace if missing. |
| New saga | `/sanctum/new-saga` | `workshop_sessions.state='in_progress'` for AI paths | Reached from World/Saga switcher or first-login redirect. |
| Build with AI conversation | `/sanctum/new-saga/:workshop_session_id/build` | `conversation`, `draft_payload` | AI conversation backed by `scaffold_saga`. |
| Bring notes intake | `/sanctum/new-saga/:workshop_session_id/notes` | `conversation`, `draft_payload` | Paste or upload plain-text notes, then draft. |
| Scaffold review | `/sanctum/new-saga/:workshop_session_id/review` | AI Draft payload | Inline edit, regenerate, discard, commit. |
| Sanctum home | `/sanctum/:saga_id` | Canon entities after commit, or empty Saga | Shows Plan your first session card. |
| Session 1 prep | `/sanctum/:saga_id/sessions/:session_id/prep` | `sessions.status='planned'` | Inline prep workspace, full route available. |
| Stage ready | Stage route | `sessions.status='ready'` | Ready for Stage transition complete. |

### Bootstrap rule

On first authenticated app load:

1. Query `gm_profiles` by `user_id`.
2. Query active `workspaces` owned by the GM.
3. If no Workspace exists, create one named `My Workspace`.
4. If no active Saga exists, redirect to New saga.
5. If a `workshop_sessions.state='in_progress'` row exists, show a **Resume saga creation** card before starting a new flow.

---

## 2. New saga screen

The first screen is a single focused form. It should feel like a calm field-journal entry, not account administration.

### Layout

- Parchment page background.
- Cream cards for form groups.
- Cormorant page title: **New saga**.
- Instrument Sans for inputs and helper text.
- DM Mono for small state labels such as `DRAFT`, `WORLD`, `PROFILE`.
- Amber primary CTA.
- Rust only for destructive or blocked states.
- Verdigris only for successful or confirmed states.

### Fields

| Field | Required | Writes to | Behavior |
|---|---:|---|---|
| Saga name | Yes | `sagas.name` on commit or blank create | 1 to 120 chars. Validate before next step. |
| Game system | No | `sagas.game_system`, `gm_profiles.default_game_system` when first profile saved | Free text. Placeholder: `D&D 5e, Pathfinder, Cairn, homebrew...` |
| World choice | Yes | `worlds`, `sagas.world_id` | Hidden-simple if no World exists. Picker if at least one World exists. |
| Help level | Yes | `workshop_sessions.path` or immediate blank create | Build with AI, Bring your notes, Start blank. |
| GM profile | Required on first use | `gm_profiles`; optional snapshot to `sagas.gm_profile_override` | Compact card, defaults preselected for low friction. |

### World choice behavior

If the GM has **no active World**:

- UI copy: `Relic will create a World for this saga.`
- Default World name: `[Saga name] World` until edited.
- Advanced link: `Edit world name`.
- On create, insert `worlds` and a hidden default `world_eras` row.

If the GM has **one or more active Worlds**:

- Show a compact picker:
  - `Use an existing World`
  - `Create a new World`
- Default to the most recently used World.
- Show helper text: `Use the same World when sagas share a setting. Create a new World for a different setting.`
- Do not expose full World settings.

### Duplicate World/Saga handling

| Case | Behavior |
|---|---|
| Saga name duplicates another Saga in the same World | Non-blocking Amber warning: `A saga named this already exists in this World.` CTA remains enabled. Suggest `Saga name II` or `Saga name: New Arc`. |
| Saga name duplicates a Saga in another World | No warning unless the picker is showing that World. |
| World name duplicates another World | Non-blocking warning with `Use existing World instead` option. |
| AI proposes an entity name that already exists in the selected World/Saga | Review card shows `Possible duplicate`. GM can rename, discard, or keep separate. Do not auto-merge. |

---

## 3. GM profile capture

The profile is required because `gm_profiles` fields are non-null. First-run captures it in a compact card on New saga, with sensible defaults already selected. Returning users can use the saved default or customize per Saga.

### Exact enums

These values are locked for MVP and should replace the schema warning that they need confirmation.

#### `experience_level`

| Stored value | User-facing label | Meaning for AI density |
|---|---|---|
| `new` | New GM | More structure, fuller guidance, clearer checklists, fewer assumed terms. |
| `returning` | Returning GM | Balanced structure, helpful prompts, moderate explanation. Default. |
| `experienced` | Experienced GM | Sharper hooks, fewer basics, more room to improvise. |
| `veteran` | Veteran GM | Sparse, evocative, minimal handholding, high respect for GM authorship. |

#### `improv_comfort`

| Stored value | User-facing label | Meaning for AI density |
|---|---|---|
| `planner` | I like to plan | More concrete scenes, likely paths, prep decisions, and contingencies. |
| `mixed` | A bit of both | Balanced prep and open space. Default. |
| `improv_first` | I improvise a lot | Looser scenes, prompts, tensions, and reusable anchors. |

#### `prep_style`

| Stored value | User-facing label | Meaning for AI density |
|---|---|---|
| `heavy` | Detailed prep | More complete scene notes, NPC motives, and decision checklists. |
| `mixed` | Practical prep | Enough to run, not a wall of text. Default. |
| `light` | Light prep | Short hooks, bullets, and fast table utility. |

### Profile scope

| Situation | Behavior |
|---|---|
| First ever Saga | Create `gm_profiles` with selected values. Also snapshot profile into `workshop_sessions.gm_profile_snapshot`. |
| Later Saga, no customization | Use `gm_profiles` default. `sagas.gm_profile_override=null`. |
| Later Saga, customized | Save override to `sagas.gm_profile_override` and snapshot to `workshop_sessions.gm_profile_snapshot`. |
| Start blank on first run | Still saves profile values, but copy frames it as `This shapes future suggestions.` |

### Profile card copy

Title: `How should Relic help you?`  
Helper: `This shapes the density of drafts and prep. You can change it later.`

---

## 4. Help-level choice

Three options are presented as radio cards, not a wizard branch hidden behind marketing copy.

| Option | User-facing description | Path |
|---|---|---|
| Build with AI | `Tell Relic your idea. It drafts a starting place, characters, threads, and a first-session packet.` | `workshop_path='build_with_ai'` |
| Bring your notes | `Paste or upload rough notes. Relic organizes them into a playable saga and first session.` | `workshop_path='bring_your_notes'` |
| Start blank | `Create an empty saga. AI remains available when you ask for it.` | `workshop_path='start_blank'`, no AI generation |

### CTA behavior

| Selected option | Primary CTA | Result |
|---|---|---|
| Build with AI | `Start building` | Create `workshop_sessions`; open conversation. |
| Bring your notes | `Add notes` | Create `workshop_sessions`; open notes intake. |
| Start blank | `Create blank saga` | Insert World if needed, hidden Era if needed, Saga, then land on Sanctum home. |

### Default selection

- First-run default: **Build with AI**, visually recommended.
- Alpha cohort prompt or returning GM entry may default to **Bring your notes** if they arrived from an import/notes CTA.
- Never force the recommended option.

---

## 5. Build with AI path

### Conversation behavior

The conversation is short, bounded, and always skippable.

| Rule | MVP behavior |
|---|---|
| AI task | `scaffold_saga` internal task. |
| Storage | Append mesVerdigriss to `workshop_sessions.conversation`. |
| Minimum required inputs | Saga name plus either premise or notes. |
| Fixed question count | None. |
| Soft target | 3 to 5 AI questions before drafting. |
| Hard conversation limit | 12 GM mesVerdigriss or 20 total mesVerdigriss, whichever comes first. Then show `Draft from what we have`. |
| Per-mesVerdigris limit | 5,000 characters. Longer mesVerdigriss show a warning and ask the GM to split. |
| Total conversation guidance | If accumulated GM input exceeds 50,000 characters, route to Bring your notes guidance. |
| Escape hatch | Persistent `Draft it now` button after the first GM answer. |
| State saving | Autosave after every mesVerdigris and after every generated draft update. |

### AI question strategy

AI should ask only for information that materially improves the first playable packet.

Priority order:

1. Premise.
2. Tone and genre.
3. Central conflict.
4. Starting place.
5. Party situation or first-session hook.
6. Known NPCs, factions, or threats.
7. GM secrets or reveals, if the GM has them.

AI must not ask rules-heavy setup questions in MVP. Game system is free text only.

### Conversation UI

- Split layout on desktop: conversation left, emerging scaffold outline right.
- Mobile: single-column with `Outline` drawer.
- Emerging outline shows placeholders, not canon.
- State label: `DRAFTING`, not `CANON`.
- Primary actions:
  - `Send`
  - `Draft it now`
  - `Save and leave`

---

## 6. Bring your notes path

Bring your notes is the wedge path for the alpha cohort. It should support messy material without implying a full import product.

### Input modes

| Input mode | MVP support | Notes |
|---|---:|---|
| Paste text | Yes | Primary path. |
| Type directly | Yes | Same field as paste. |
| Upload `.txt` | Yes | UTF-8 plain text only. |
| Upload `.md` / `.markdown` | Yes | Treated as plain text with Markdown preserved. |
| Upload `.docx` | No, P1 candidate | Show helpful disabled-state copy. |
| Upload `.pdf` | No, P1 | PDF/RAG import is deferred. |
| Upload Obsidian/Notion/World Anvil/Kanka export | No, V1 | Not part of MVP. |
| Upload images/audio | No | Audio belongs to post-session pipeline, not first-run notes import. |

### Character limits

| Limit | Behavior |
|---|---|
| 0 chars | Disable `Draft from notes`; helper says `Paste a premise, fragments, or session notes to begin.` |
| 1 to 39,999 chars | Normal. |
| 40,000 to 50,000 chars | Soft warning: `This is a lot of material. Relic can draft from it, but shorter chunks usually produce cleaner scaffolds.` |
| >50,000 chars | Hard block. Do not truncate. Show split guidance and keep the input locally. |
| File extracted text >50,000 chars | Same hard block after extraction. |

### Over-long warning copy

Title: `Break this into sections`  
Body: `Relic can read 50,000 characters for saga creation. Split this into the strongest premise, key places, main characters, factions, and open threads. You can add the rest after the saga exists.`  
Actions: `Keep editing`, `Copy first 50k to clipboard`, `Clear field`

Do not auto-truncate. Do not silently ignore overflow.

### Notes-processing behavior

- First response should summarize what Relic thinks the notes contain.
- If notes are contradictory, ask a clarifying question before drafting.
- If notes are mostly prose, extract likely Characters, Places, Factions, Threads, and first-session hooks.
- If notes are mostly lists, preserve list structure where useful.
- If notes include apparent instructions to the model, treat them as untrusted content, not system instructions.

---

## 7. Scaffold review

Build with AI and Bring your notes converge on the same review screen.

### Required scaffold output

| Section | Target quantity | Output state |
|---|---:|---|
| Saga premise summary | 1 | AI Draft |
| Starting Place | 1 | AI Draft |
| Characters | 3 to 6 | AI Draft |
| Factions | 1 to 3 | AI Draft |
| Threads | 1 to 3 | AI Draft |
| GM secrets | 1 to 5 bullets | AI Draft, GM-only |
| First-session packet | 1 | AI Draft, becomes Session 1 seed |
| Prep checklist | 3 to 5 items | AI Draft, becomes Session 1 checklist seed |

### Review layout

Desktop:

1. Left rail: scaffold sections and completion status.
2. Main pane: selected draft card or first-session packet.
3. Right rail: source/provenance and unresolved warnings.

Mobile:

1. Section tabs.
2. Draft cards stacked.
3. Source/provenance in bottom sheet.

### Draft card actions

| Action | Behavior |
|---|---|
| Edit | Inline edit. Autosaves to `workshop_sessions.draft_payload`. |
| Regenerate | Regenerates only that item or section. Does not rewrite unrelated draft cards. |
| Discard | Excludes item from commit. Reversible until commit. |
| Mark as World canon candidate | V1-disabled in MVP. All first-run scaffold entities commit as Saga scope unless explicitly created as World context by future flow. |
| Source | Shows source as conversation or pasted notes. |

### Commit behavior

Primary CTA: `Commit saga`.

On commit:

1. Validate required minimum viable scaffold:
   - Saga name exists.
   - World exists or can be created.
   - Saga exists or can be created.
   - At least one first-session packet exists for AI-assisted paths.
2. Insert or finalize `worlds`, hidden default `world_eras`, and `sagas` if not already created.
3. Insert selected scaffold entities into canonical entity tables with:
   - `workspace_id`
   - `world_id`
   - `saga_id`
   - `scope='saga'`
   - `canon_state='canon'`
   - `created_by='gm_via_ai_approval'`
4. Create `sources` rows with `source_kind='workshop_input'`.
5. Create synthetic resolved `drafts` rows marked approved for audit provenance.
6. Write `canon_audit` rows.
7. Set `workshop_sessions.state='committed'` and attach `workspace_id`, `world_id`, `saga_id`.
8. Redirect to Sanctum home.

The review screen is the approval moment. The committed scaffold does not go to the Approval Queue again.

### Empty scaffold handling

If AI returns no usable scaffold:

- Show blocking error: `Relic could not draft a usable saga from this.`
- Preserve all GM input.
- Actions:
  - `Try again`
  - `Add more detail`
  - `Create blank saga with this name`
- Do not show `Commit saga` for an empty AI-assisted scaffold.

---

## 8. Start blank path

Start blank is the fastest path and should not feel like a penalty for not using AI.

### Behavior

On `Create blank saga`:

1. Create default Workspace if missing.
2. Create or select World.
3. Create hidden default Era if the World has no Era.
4. Create Saga with `sagas.primary_era_id` set to the hidden/default Era when available.
5. Create or update `gm_profiles` values.
6. Redirect to Sanctum home.

### Empty Sanctum home copy

Title: `Your saga is ready.`  
Body: `Start with a character, place, faction, thread, or plan your first session.`  
Primary CTA: `Plan your first session`  
Secondary CTAs: `Create character`, `Create place`, `Create thread`, `Open Relic Guide`

AI must be available on-demand, but no AI generation fires automatically.

---

## 9. Hidden/default Era assignment

Era/Timeframe is V1-ready but not a first-run UI concept.

### MVP rule

When a World is created and has no `world_eras` rows, create one hidden/default Era:

| Field | Value |
|---|---|
| `name` | `Default Era` |
| `summary` | `Default timeframe for this world.` |
| `sort_order` | `0` |
| `starts_at_index` | `null` |
| `ends_at_index` | `null` |
| `display_date_range` | `null` |

Set `sagas.primary_era_id` to this row for first-run Saga creation. Do not expose Era UI unless a future V1 feature enables it.

### Copy rule

Do not mention Era in first-run UI. If surfaced in debugging/admin tools, label it `Default timeframe`.

---

## 10. Post-commit Sanctum home

After commit or blank creation, the GM lands on the Sanctum home for the active Saga.

### Home states after first-run

| Saga state | Sanctum home priority |
|---|---|
| AI-assisted Saga, no Session 1 created | `Plan your first session` card using scaffold packet. |
| Blank Saga, no Session 1 created | Empty-state card plus `Plan your first session`. |
| Session 1 `planned` | Inline prep workspace preview. |
| Session 1 `ready` | `Session 1 ready` card with `Open in Stage`. |
| Any pipeline ready | Approval Queue summary appears above planning card. Not expected in first 20 minutes but follows global home rule. |

### Plan your first session card

Title: `Plan your first session`  
Body for AI-assisted path: `Relic drafted a first-session packet from your saga. Turn it into a session you can open on The Stage.`  
Body for blank path: `Create a light session packet now. You can fill in details yourself or ask Relic for help.`  
Primary CTA: `+ Plan Session 1`

Dismissal:

- Dismiss writes `gm_profiles.session_prep_intro_dismissed_at=now()` only if the card is dismissed intentionally.
- Creating Session 1 also writes the dismissal timestamp.

---

## 11. Session 1 creation and prep handoff

### `+ Plan Session 1` behavior

On click:

1. Create `sessions` row with:
   - `session_number=1`
   - `status='planned'`
   - `canon_state='canon'`
   - `created_by='gm'`
   - `workspace_id`, `world_id`, `saga_id`
2. If first-session packet exists, map fields:
   - session objective → `sessions.objective`
   - opening scene → `sessions.opening_scene`
   - scene/path notes → `sessions.scene_notes`
   - prep checklist → `sessions.prep_checklist`
   - active Threads → `session_active_threads`
   - pinned Characters/Places/Factions/Artifacts → `session_pinned_entities`
3. Open the inline prep workspace.
4. Compose the prep briefing if supported by the prep spec. For first session, briefing grounds only against committed Saga and World canon.

### Prep workspace first-run behavior

Required visible areas:

1. Objective.
2. Opening scene.
3. Active Threads.
4. Pinned entities.
5. Prep checklist.
6. Stage packet preview.
7. `Draft this session` or `Regenerate` for GM-invoked AI prep.
8. `Ready for Stage`.

The GM can edit all fields before readiness. AI prep synthesis is GM-initiated, not automatic.

### Ready for Stage

On `Ready for Stage`:

1. Validate session has at least:
   - objective or opening scene
   - one packet section visible in Stage preview
2. Set `sessions.status='ready'`.
3. Clear pending prep suggestions.
4. Show `Session 1 · Ready` card with `Open in Stage`.

Do not start recording or ask for recording consent until the GM starts the session in Stage.

---

## 12. Failure and recovery states

### Model or network failure

| Failure | UX |
|---|---|
| AI request timeout | Inline error: `Relic could not finish that draft.` Actions: `Retry`, `Save and leave`, `Create blank saga`. |
| Model parse failure | Silent retry once. If still failing, show `Relic generated something it could not safely read.` |
| Provider outage | Show fallback retry if configured; otherwise preserve state and show `Try again later` plus blank option. |
| Streaming interruption | Preserve partial conversation, discard incomplete AI mesVerdigris, allow retry. |

Never lose typed input. Never commit partial AI output without GM review.

### Browser close or navigation away

- Autosave `workshop_sessions` after each meaningful change.
- On return, saga switcher shows `Resume saga creation`.
- New saga screen also shows resumable sessions above the blank form.
- Resume card shows Saga name, World name if chosen, path, last updated time, and actions:
  - `Resume`
  - `Discard draft`
- Discard sets `workshop_sessions.state='abandoned'` after confirmation.

### Empty or low-quality scaffold

- Empty scaffold blocks commit.
- Low-quality scaffold does not block commit if minimum fields exist, but shows warnings:
  - `Few entities`
  - `No active thread`
  - `No first-session hook`
- Each warning has a targeted action: `Regenerate threads`, `Add hook`, `Create blank and continue`.

### Duplicate records

- Duplicate warnings are non-blocking except exact internal ID conflict, which should be impossible in normal UI.
- Never auto-merge first-run generated content.
- Merging remains Approval Queue behavior, not first-run behavior.

### Commit failure

Commit must be idempotent.

- Client sends an idempotency key tied to `workshop_sessions.id`.
- If the commit request succeeds but redirect fails, reload detects `state='committed'` and routes to the active Saga.
- If the transaction fails, keep `state='in_progress'`, preserve `draft_payload`, and show `Commit failed. Nothing was written to canon.`

---

## 13. Data writes summary

| Moment | Tables touched | Notes |
|---|---|---|
| Signup | `auth.users` | Supabase Auth. |
| First app load | `workspaces` | Create default if missing. |
| Profile save | `gm_profiles` | Exact enum values from §3. |
| Start AI path | `workshop_sessions` | User-scoped until commit. |
| Conversation | `workshop_sessions.conversation` | Append-only UI history. |
| Draft scaffold | `workshop_sessions.draft_payload` | Mutable draft workspace. |
| Create World | `worlds` | At commit or blank create. |
| Create hidden Era | `world_eras` | Default hidden Era if needed. |
| Create Saga | `sagas` | Set `world_id`, optional `primary_era_id`, profile override if used. |
| Commit scaffold | entity tables, `sources`, `drafts`, `canon_audit` | Synthetic resolved draft pattern. |
| Plan Session 1 | `sessions`, `session_pinned_entities`, `session_active_threads` | Uses first-session packet seed when available. |
| Ready for Stage | `sessions.status='ready'` | No consent flow yet. |

---

## 14. Analytics and activation events

Track these events for alpha activation analysis.

| Event | Required properties |
|---|---|
| `signup_completed` | `user_id` |
| `workspace_created_default` | `workspace_id` |
| `new_saga_started` | `workspace_id`, `world_choice`, `path` |
| `gm_profile_saved` | enum values, `is_default`, `has_override` |
| `notes_input_added` | `char_count`, `input_mode`, `file_type` |
| `scaffold_requested` | `path`, `conversation_turns`, `char_count` |
| `scaffold_generated` | entity counts, latency, model, retry_count |
| `scaffold_item_regenerated` | section, item_type |
| `saga_committed` | path, entity counts, had_warnings |
| `blank_saga_created` | world_choice |
| `session1_plan_clicked` | path |
| `session1_created` | seeded_from_packet boolean |
| `session_ready_for_stage` | session_id, packet_completeness |
| `first_run_abandoned` | last_step |
| `first_run_resumed` | elapsed_since_updated |

---

## 15. Acceptance criteria

Priority 4 is done when the following can be implemented without additional product invention:

1. New user signs up and gets a default Workspace automatically.
2. New user reaches `+ New saga` without seeing a separate tutorial or Saga Creation surface.
3. GM can create or reuse a World from the New saga flow.
4. New World creation creates a hidden/default Era and assigns it to the Saga where applicable.
5. `experience_level` values are locked as `new`, `returning`, `experienced`, `veteran`.
6. `improv_comfort` and `prep_style` are captured with the schema-defined enums.
7. Build with AI conversation has clear soft and hard limits.
8. Bring your notes supports paste plus `.txt`, `.md`, `.markdown`, with a 50,000 character cap.
9. Unsupported file types have clear copy and do not pretend to import.
10. Scaffold review supports edit, regenerate per item, discard, source/provenance, and commit.
11. Commit writes canon through the synthetic resolved draft/audit pattern and does not route to Approval Queue again.
12. Start blank creates an empty Saga immediately and lands on the Sanctum home.
13. Post-commit home shows **Plan your first session**.
14. `+ Plan Session 1` creates a planned Session and opens the prep workspace.
15. `Ready for Stage` transitions Session 1 to `ready` without triggering recording consent.
16. Model failure, empty scaffold, duplicate World/Saga, browser close, resume, and commit failure states are specified.

---

## 16. MVP/P1/V1 boundaries

| Item | Status |
|---|---|
| New saga with three help levels | MVP |
| GM profile capture | MVP |
| Hidden/default Era assignment | MVP backend scaffolding, hidden UI |
| Paste notes | MVP |
| `.txt`, `.md`, `.markdown` note upload | MVP |
| `.docx` import | P1 candidate if straightforward |
| PDF/RAG import | P1/V1, not first-run MVP |
| Obsidian/Notion/World Anvil/Kanka import | V1 |
| Full World dashboard | Deferred |
| Era editor | V1 |
| World-canon promotion during first-run | V1 |
| Player setup | Deferred beyond MVP |
| Image generation | Excluded |
