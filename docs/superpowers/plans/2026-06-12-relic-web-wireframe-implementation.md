# Relic Web Wireframe Implementation Plan

Date: 2026-06-12
Primary design reference: `Claude Design - Relic Design System/Relic Wireframes (standalone).html`
Scope: web UI only

## Authority And Adoption Rules

The standalone wireframe is implementation input, not product canon. The active `Relic Vault` notes remain authoritative. Adopt the new web visual direction and screen states where they preserve the active MVP loop: Create -> Organize -> Prep -> Run -> Review -> Approve -> Continue.

Normalize these wireframe conflicts during implementation:

- Use `Relic Guide` for the AI affordance. Do not ship user-facing `Loom` naming unless the vault is updated later.
- Exclude Stage `GM Screen` / rules search from MVP. That implies deferred rulebook RAG support.
- Keep Review grouped by affected entity/draft trust work, not session-first queue grouping.
- Do not collapse AI drafts into ambiguous `Save to library` canon writes. AI output is ephemeral, draft-backed, or canon-only with citations.
- Replace stale `Campaign`, `Solo Campaign`, and `publish` language with Saga/World/canon review language.
- Ignore bundled mobile/tablet wireframes for this pass except as responsive references.

## Screen And Route Inventory

Adopt for web:

- Shell: top context bar, scoped search, Relic Guide entry, create menu, current session pill, review badge, usage chip, left rail.
- Home: empty saga, no session, planned/prepping, ready, active, and review-ready states.
- Threads: list by active/loose/dormant/resolved, detail, objective log, read-only timeline.
- Library: overview filters, archived state, entity detail/edit, new manual entity, source/provenance placeholder, disabled/gated AI draft path.
- Prepare: packet editor, briefing/status cards, pinned entities, active threads, ready state, locked live state.
- Sessions: session lifecycle list, create session, review/pipeline state entry.
- Stage: dark live surface, agenda, pinned cards, scoped search, quick capture, quick stub, consent/record state, dice, mark moment, end session, undo/finalize.
- Review: pending drafts, grouped review work, source/provenance dock, approve/reject/merge/supersede actions, conflict/low-confidence states where backend data exists.
- Search: scoped literal/hybrid search with empty/error states.
- Guide: cited search/answer fallback using existing retrieval/search contracts; no autonomous canon mutation.
- Export: Markdown/JSON export request and status using existing export RPCs.
- Settings: Saga/World/Workspace readouts, usage meters, notification preferences where backend support exists, account sign out.

Add or complete route coverage:

- `/app/new-saga/[creationSessionId]`
- `/app/w/[workspaceId]/world/[worldId]/saga/[sagaId]/sessions/[sessionId]/review`
- `/app/w/[workspaceId]/world/[worldId]/saga/[sagaId]/guide`
- `/app/w/[workspaceId]/world/[worldId]/saga/[sagaId]/export`
- `/app/w/[workspaceId]/world/[worldId]/settings`
- `/app/w/[workspaceId]/settings`

## Backend Contract Gaps

Existing backend support to use:

- Auth/bootstrap: `ensure_default_workspace`, `get_bootstrap_context`, `create_blank_saga`.
- Canon writes: `create_entity`, `update_entity`, `archive_entity`, `append_thread_objective`.
- Session prep/stage: `create_session`, `update_session_prep`, `set_session_status`, `get_stage_packet`, `quick_capture`, `quick_stub`, `mark_moment`, `record_session_consent`, `record_dice_roll`.
- Review: `get_pending_drafts`, `update_draft_state`.
- Search/retrieval: `search_for_ui`, existing retrieval RPCs where already exposed.
- Usage/export/notifications: `get_workspace_usage_summary`, `request_saga_export`, `get_saga_export_status`, `get_saga_export_download`, `update_notification_preferences`.

Backend work needed:

- Add `session_number` and `planned_date` to the session contract if tests confirm current RPCs cannot return them.
- Add Next server actions for dice, consent, export request/status flows, notification preference updates, and session undo/finalize where current generic status action is too thin.
- Add data loaders for Stage packet, export status/download, session review/pipeline status, and grouped review display.
- Add missing RPCs only if an adopted web behavior cannot be implemented through existing scoped RPCs. Do not use direct browser table access.

## Implementation Phases

### Phase 1: Baseline And Contract Tests

Acceptance criteria:

- Tests assert new server actions call scoped RPCs and do not use direct table access.
- Route tests cover every visible shell link.
- Stage packet loader/action tests cover consent and dice.
- Export route/action tests cover request and status states.

### Phase 2: Backend Adapters And Missing Routes

Acceptance criteria:

- All shell destinations resolve.
- No visible route is a dead link.
- Stage uses `get_stage_packet` or a typed adapter equivalent.
- Export uses existing export RPCs.
- Settings usage renders human-readable meters.
- Session review page renders processing/complete/failed/empty states from existing pipeline/draft data where available.

### Phase 3: Shell And Home Replacement

Acceptance criteria:

- Shell matches the new web direction while preserving canonical labels.
- Search, create, current session, review, usage, account, and Relic Guide controls are functional or intentionally gated with clear copy.
- Home state changes by session/review state and provides the correct next loop action.
- Live sessions show a prominent Return to Stage affordance outside Stage.

### Phase 4: Library, Threads, Sessions, And Prepare

Acceptance criteria:

- Manual entity/thread/session creation and edits still write through existing Supabase RPCs.
- Threads use canonical resolution/loose state where available and timeline remains read-only.
- Prepare saves packet fields, pinned entities, and active threads.
- Ready for Stage transitions to the Stage route.
- Locked/live prep states are read-only where required.

### Phase 5: Stage Replacement

Acceptance criteria:

- Ready -> started/in_progress -> ended_pending_undo -> ended can be driven from the UI.
- Consent, dice, mark moment, quick capture, and quick stub all call backend RPCs.
- Search is scoped to the active Saga/World.
- Stage does not show proactive AI suggestions or MVP-excluded rules search.
- End Session exposes undo/finalize behavior.

### Phase 6: Review, Search, Guide, Export, Settings

Acceptance criteria:

- Approval Queue preserves the GM approval gate and updates draft state through Supabase.
- Search supports empty/loading/error states and scoped results.
- Guide page provides grounded search/citation behavior and refuses unsupported canon mutation.
- Export request/status/download UI is functional against backend RPCs.
- Settings usage and notification preference controls reflect backend data.

### Phase 7: Verification, Closeout, Commit

Acceptance criteria:

- Run web lint, web tests, web build, relevant e2e, and Supabase baseline tests.
- Inspect the running app with browser automation and capture route/flow regressions.
- Add a session log under `Relic Vault/Session Logs/` and link it from `Relic Vault/50 - Session Log Index.md`.
- Inspect `git status --short`, stage only intended files, commit, and push the current branch if verification passes.

## Final Working Goal

A signed-in GM can create or open a Saga, see the new Relic web shell, create and edit canon records, track Threads, plan a session, mark it ready, run it in Stage with search/capture/stubs/dice/consent/end-session controls, review proposed changes, approve or reject drafts, search canon, inspect usage/settings, request exports, and continue the loop without dead routes or unsupported hidden writes.
