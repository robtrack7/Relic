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
source_file: "Sourced - Downloaded - 260518/relic-approval-queue-spec-v0_5.md"
---

> [!info] How to use this spec
> Owns: Review, diff, citation, approval, rejection, merge, archive, and canon commit behavior.
> Does not own: Historical rationale and superseded naming unless explicitly retained as an internal identifier.
> Read next: [[00 - Start Here]]
> Implementation-critical note: Treat this as coding input only after reading the authority order in [[00 - Start Here]].
# Relic Approval Queue Spec v0.5

*Created: May 18, 2026. Updated: May 18, 2026.*
*Purpose: active implementation contract for review, diff, source citation, approval, rejection, merge, archive, and canon commit behavior.*

**Build against:** `[[11 - Product Basepoint]]`, `[[12 - MVP PRD]]`, `[[20 - Entity and Canon Schema]]`, `[[21 - Tech Architecture]]`, `[[22 - Memory and Retrieval]]`, `[[23 - AI Task Registry]]`, `[[34 - UI Implementation Spec]]`, `[[25 - Pricing and Rate Limits]]`.

## 0. Scope

The Approval Queue is the MVP trust surface. AI, import, and post-session outputs remain proposals until the GM approves, edits-and-approves, rejects, merges, or archives them. No canon mutation happens without explicit GM action.

## 1. Data source

The queue reads from `drafts` and related `draft_sources`/`sources` rows.

Required predicates:

- `workspace_id`
- `world_id`
- `saga_id`
- `scope`
- `state`

Approval Queue list/search uses the direct `drafts` query in Tech Architecture v1.2 §21.2, not `search_for_ui`.

## 2. Web layout

Desktop web uses a two-pane layout:

1. Left: grouped queue list.
2. Main: selected draft diff/editor.
3. Optional right dock: sources, provenance, sibling drafts, conflicts.

Mobile uses a single-column review flow with source/provenance in a bottom sheet. It must remain functionally complete even when the web layout has more room for side-by-side comparison.

## 3. Queue grouping

Group pending drafts by:

1. Pipeline/session when entering from post-session review.
2. Target entity when entering general Review.
3. Change kind for fallback sorting.

Within a group, sort low-confidence and conflict/broken-source items above routine high-confidence items.

## 4. Actions

| Action | Result |
|---|---|
| Approve | Runs schema approval write path. |
| Edit & Approve | Writes edited `committed_payload`, stores `gm_edit_diff`, then commits. |
| Reject | Marks draft rejected with `rejection_reason_tags` and optional text. No canon audit row. |
| Merge | Identity decision only. Marks draft merged and enqueues separate target update draft. |
| Archive request | Requires Rust confirmation and writes archived canon state only after approval. |
| Bulk archive stale | Rejects stale proposals with `stale_bulk_archive` reason tag. |

Avoid prominent Approve All. `Commit selected` is allowed only after explicit selection and visible review context.

## 5. Rejection reasons

Use `rejection_reason_tag[]` from Schema v0.8. `stale_bulk_archive` is a valid enum value and must be used for the stale-banner bulk-archive flow.

## 6. Source and citation behavior

Every draft should show source badges when available. Transcript sources show:

- timestamp
- frozen `sources.raw_excerpt`
- current transcript segment, when available
- citation-drift indicator if current text differs from frozen excerpt
- optional signed audio mini-player on web, only after a dedicated scoped signing contract exists

The shipped C4 slice renders every draft citation as a keyboard-operable inline disclosure in both Session Review and Approval Queue. Transcript evidence exposes the frozen excerpt, current segment, timestamp, exact/edited/deleted state, and an authorized deep link to the cited segment. Pasted notes and GM summaries are labeled as untimestamped evidence. Unavailable, broken, deleted, permission-denied, and unsupported evidence renders safe recovery copy without exposing identifiers or sibling records.

Citation inspection reads through the exact route-scoped draft RPC; clients do not fetch arbitrary source IDs. Signed audio is deferred because the current private Storage download boundary is worker-only. It must not be added by widening bucket policy or returning durable object paths.

Broken source behavior:

- Approve/Edit & Approve disabled when required source evidence is missing and the proposal depends on it.
- GM may reject, merge into manual edit, or copy content into manual edit.

## 7. Conflict behavior

Before approval, compare target `updated_at` with `draft.expected_version`.

- Match → continue.
- Mismatch → show conflict panel: proposed draft vs live target.
- Blind approval is disabled.
- GM may refresh, edit manually, or create a new draft from the live version.

## 8. Search and filters

Filters:

- query text
- state
- target entity type
- confidence band
- pipeline/session
- broken source
- change kind

Search matches proposed payload text, target display name, and source excerpts. It must preserve `workspace_id`, `world_id`, `saga_id`, and `scope` filters.

## 9. Failure states

| Failure | UI behavior |
|---|---|
| `quota_blocked` | Approval/rejection still allowed; new AI regeneration blocked with manual fallback. |
| `validation_failed` | Show schema error, preserve draft, allow edit. |
| `provider_failed` | Only affects regenerate/AI assist, not manual review. |
| `network_failed` | Retry save/commit. |
| `conflict_detected` | Conflict panel, no blind commit. |
| `permission_denied` | Generic safe copy, log as bug. |
| `partial_output` | Show completed drafts; failed artifacts in pipeline status. |

## 10. Acceptance criteria

- GM can approve, edit-and-approve, reject, merge, and archive without ambiguity.
- Canon changes use the Schema v0.8 approval write path.
- Direct queue search is implemented without reusing `search_for_ui`.
- Source/provenance is visible before approval.
- Citation drift is visible when transcript evidence changed after proposal creation.
- `stale_bulk_archive` is represented as enum-backed rejection metadata.

---

*End Approval Queue Spec v0.5.*



