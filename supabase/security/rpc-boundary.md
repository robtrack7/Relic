# Relic RPC Boundary

This document records the short-term backend boundary used for the rough UI milestone. The catalog tests in `supabase/tests/access_control.sql` are the executable version of this document.

## Boundary Rules

- Browser roles must not write Relic user-data tables directly.
- Browser writes go through scoped RPCs that validate Workspace, World, and Saga ownership server-side.
- Browser-callable functions are granted to `authenticated` only.
- `anon` must not execute public functions directly.
- Every public `security definer` function must set a fixed `search_path`.
- Scoped RPCs must reject cross-Workspace, cross-World, and sibling-Saga data.
- Storage object writes remain governed by Supabase storage grants plus storage RLS policies.

## Accepted Short-Term Deviation

The current rough-UI backend keeps browser RPCs in the `public` schema and uses `security definer` functions for scoped operations. This is acceptable for the backend wiring milestone because direct table writes are revoked, callable functions are allowlisted, and tests enforce the grant boundary.

Revisit this before production hardening or multi-tenant collaboration work. A dedicated exposed API schema would make the callable surface easier to reason about than public-schema RPCs.

## Browser-Callable RPCs

| RPC | Purpose |
|---|---|
| `ensure_default_workspace()` | Bootstrap a first authenticated Workspace. |
| `get_bootstrap_context()` | Load authenticated app shell context. |
| `get_saga_context(workspace_id, world_id, saga_id)` | Load scoped Saga context. |
| `create_blank_saga(...)` | Create a scoped first-run Saga. |
| `list_worlds_for_workspace()` | List Worlds available to the authenticated Workspace owner. |
| `create_entity(...)` | Create manual canon rows through a scoped path. |
| `update_entity(...)` | Update manual canon rows through a scoped path. |
| `archive_entity(...)` | Archive canon rows through a scoped path. |
| `append_thread_objective(...)` | Update a Thread objective through a scoped path. |
| `create_session(...)` | Create a Session through a scoped path. |
| `update_session_prep(...)` | Update prep fields, pins, and active threads through scoped validation. |
| `set_session_status(...)` | Update Session status through a scoped path. |
| `quick_capture(...)` | Add a Stage quick-capture note. |
| `quick_stub(...)` | Add a Stage quick-stub entity. |
| `mark_moment(...)` | Add a Stage marked moment. |
| `update_draft_state(...)` | Resolve draft state without direct table updates. |
| `list_entities(...)` | Read scoped entity lists. |
| `get_sessions_for_saga(...)` | Read scoped Session lists. |
| `get_session_pinned_entities(...)` | Read scoped pinned entities. |
| `get_session_active_threads(...)` | Read scoped active threads. |
| `get_pending_drafts(...)` | Read scoped pending drafts. |
| `get_workspace_usage_summary(...)` | Read scoped usage summary. |
| `check_quota_preflight(...)` | Check quota before metered work. |
| `search_for_ui(...)` | Run scoped lexical UI search. |
| `retrieve_for_task(...)` | Run scoped retrieval for AI/task contexts. |

## Callable Helpers

These helpers are callable by `authenticated` because RLS policies or storage policies need them:

- `active_saga_matches(uuid)`
- `user_owns_workspace(uuid)`
- `user_is_workspace_member(uuid)`
- `world_belongs_to_workspace(uuid, uuid)`
- `saga_belongs_to_world(uuid, uuid)`
- `scoped_row_allowed(uuid, uuid, uuid, content_scope)`
- `saga_row_allowed(uuid, uuid, uuid)`
- `storage_path_allowed(text)`
- `storage_path_segment(text, integer)`

## Verification

Run:

```bash
npm run backend:baseline:reset
```

The baseline must include:

- `supabase/tests/access_control.sql`
- `supabase/tests/foundation.sql`

Do not record local API keys, JWT secrets, storage keys, or service credentials in this document.
