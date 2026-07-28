---
status: active
authority: support
scope: operations
read_after:
  - "[[50 - Session Log Index]]"
depends_on:
  - "[[23 - AI Task Registry]]"
---

# 2026-07-28 — E3 Provider Contract and Hosted Cleanup

## Accomplished

- Aligned the Guide provider example with the validator, UI, and registry: `open_record` now carries one allowlisted `source_id`; the stale `target_type` / `target_id` shape is regression-rejected.
- Made the conditional `no_answer` insufficiency contract and bounded repair instruction explicit after hosted validation exposed ambiguity.
- Hardened the hosted wrapper to record each function whose gateway JWT setting changed, restore every recorded function after partial deployment, continue after individual restoration failures, and preserve the first failure.
- Diagnosed the empty citation context: record embeddings were intentionally deferred while the natural-language question became a strict four-lexeme AND query, producing no retrieval rows, source allowlist, or evidence snapshots.
- Routed Guide through `answer_saga_question` / `sanctum_qa_grounding`, added a conservative natural-language fallback with strict operator preservation, and made retrieval/source-resolution infrastructure errors fail distinctly from legitimate empty evidence.
- Added a staging-locked, owner-bound, idempotent demo World/Saga fixture manager with explicit removal and a separately authorized bounded embedding action.
- Installed the removable demo under one verified, confirmed staging account without recording the account email in repository notes.
- Extended the hosted proof to preflight exact retrieval before provider spend and to confirm one separately metered pending `draft_entity` proposal.
- Fixed the World-scope embedding path so scoped JWT requests omit null `saga_id` values and scoped-auth failures are no longer mislabeled as provider outages.
- Declared `embed-row-dispatch` gateway JWT behavior in `supabase/config.toml` and made the demo builder inspect and restore the actual prior function setting.
- Reinstalled the marker-owned demo from zero residue and completed all eight real staging vectors through the separate explicit action.

## Verification

- Focused Guide/hosted-safety/Edge/demo source suite: 39 passed after the evidence-freeze regression was added.
- Web: 28 files / 130 tests; TypeScript and production build passed.
- Repository verification passed; script suite passed 71 tests.
- Supabase: 29 pgTAP files / 810 tests passed.
- PowerShell parse and `git diff --check` passed.
- The zero-provider hosted preflight now returns the two expected current-Saga/World sources through relaxed task retrieval, excludes sibling/import sentinels, and cleans up completely.
- The latest bounded paid attempt completed three 1-credit Guide runs plus one confirmed 3-credit pending draft run, authenticated source context, and exact replay before evidence collection failed on the unsupported `jsonb_object_length` expression. Diagnostic counts proved six total credits, one pending draft, zero canon writes, and zero unsafe telemetry keys.
- The first recovery cleanup exposed frozen-evidence and draft-batch dependency ordering. The corrected cleanup removed those rows before cited sources/drafts; a final audit proved zero synthetic Workspace/auth/run/job/evidence/telemetry residue, both schedules active, and configured function JWT states restored.
- A fresh USD $1 packet stopped safely when the grounded turn returned conservative `no_answer`. Retrieval was correct; the fixture's generic non-empty `raw_excerpt` values masked the linked Character/Place bodies during immutable evidence freezing.
- The fixture now uses empty entity-source excerpts. A zero-provider staging preflight created the Guide task snapshot and proved two entity-backed fact-bearing evidence items, two eligible retrieval results, zero provider calls, and zero cleanup residue.
- Independent demo status proves one marker-owned Workspace, one World, two Sagas, eight content records, nine sources, and eight queued embedding jobs. It also proves zero completed embeddings, AI runs, drafts, provider events, usage events, and provider cost.
- Final clean demo status proves eight complete jobs and eight current vectors. The installer defers jobs until the explicit builder, and the builder warms the staging proxy before making jobs dispatchable.
- The final authorized hosted smoke passed with four AI attempts and three query-embedding attempts: cited grounded answer, labeled creative proposal/action preview, conservative `no_answer`, authenticated citation context, exact replay without added work, three correctly metered 1-credit Guide runs, one correctly metered 3-credit pending draft, sibling/import exclusion, payload-free telemetry, and zero canon writes.
- Automated and independent cleanup audits proved zero synthetic Workspace/auth/run/job/evidence/thread/draft/provider/usage residue, both schedules active, and all gateway-JWT settings restored.

## Closeout

- E3 is complete. All required local, database, build, hosted, restoration, and cleanup gates passed.
- The persistent staging demo remains installed with eight current vectors for manual testing and can be removed by its owner-bound marker-locked command.
- E4 was not started.

Back to [[50 - Session Log Index]].
