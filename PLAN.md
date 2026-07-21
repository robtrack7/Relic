# Relic MVP Delivery Plan

**Plan date:** 2026-07-20

**Status source:** `docs/MVP_GAP_ANALYSIS.md`

**Canonical router:** `Relic Vault/40 - MVP Implementation Planning Sequence.md`

This is the executable plan from the current repository to MVP. It replaces the older manual-UI-only root plan. Product and architecture decisions still come from the active Relic Vault authority order; this file owns work packet order, quality gates, and release checkpoints.

## 1. MVP finish line

Relic reaches MVP only when a GM can complete this loop without manual database intervention:

1. Sign up and receive a scoped Workspace/World/Saga hierarchy.
2. Create or import a Saga, with manual fallback when AI is unavailable.
3. Create, organize, search, and connect canon records and Threads.
4. Prepare a session from canon and carry-forward context.
5. Run Stage reliably, including offline-safe capture, stubs, dice, consent, recording, Mark Moment, End, and recovery.
6. Review transcript/manual evidence and source-aware AI proposals.
7. Approve, edit-and-approve, reject, merge, or archive proposals explicitly.
8. Continue into the next prep cycle with updated canon and unresolved Threads.
9. Export owned data and receive required pipeline notifications.
10. Complete the agreed release-platform experience: responsive web alpha if explicitly accepted, otherwise native mobile parity.

Non-negotiable invariants:

- AI output, transcript text, imports, and raw notes are never canon without explicit GM action through the owning write path.
- Workspace/World/Saga isolation is enforced in the database and covered by negative tests.
- Failed network/provider work preserves GM input and exposes a retry or manual fallback.
- A backend contract is not marked complete until its worker/provider and user workflow have been exercised.
- No new work packet starts while the preceding packet's required checks are red.

## 2. Current position

From `docs/MVP_GAP_ANALYSIS.md`:

| Priority | Complete | Partial | Missing | Blocked | Needs verification |
|---|---:|---:|---:|---:|---:|
| P0 | 5 | 10 | 5 | 2 | 0 |
| P1 | 0 | 5 | 2 | 0 | 1 |
| P2 | 0 | 2 | 1 | 0 | 1 |

The proven base is auth/bootstrap, scoped RLS/RPCs, the web Stage evidence path, Mark Moment, end-session finalization, provider-shaped transcription/retry contracts, a stable Stage dialog focus lifecycle, and refresh-proven Dice/Quick Create behavior. The immediate packet is active-Thread visibility and restrained Stage shell polish. The largest remaining product path is evidence → synthesis → source-aware draft → explicit approval.

## 3. Quality-gate system

Every work packet has two mandatory checkpoints.

### Checkpoint A — contract and focused behavior

Run before integration work is considered complete:

- Add a failing regression/acceptance test before fixing a confirmed bug.
- Run the smallest relevant unit/component/pgTAP/source test set.
- Verify failure, retry, permission-denied, and empty states for the touched boundary.
- Review the diff for scope, secrets, privileged database functions, and canon bypasses.
- Update the gap row and active spec when behavior or acceptance changes.

### Checkpoint B — integrated user workflow

Run before the packet is committed:

- Exercise the actual route/action/worker path, not only a mocked helper.
- Run the full relevant suite: web tests for UI, pgTAP for database changes, runtime-source tests for Edge changes.
- Verify one happy path and one recovery path in a browser or deterministic worker invocation.
- Confirm no sibling-Saga data, unexpected provider call, automatic canon write, or lost local input.
- Commit and push only the packet's files; leave unrelated working-tree changes untouched.

### Milestone gate — double checkpoint

At the end of each phase:

1. Run the full baseline from a clean local migration replay.
2. Stop/restart the app or relevant local service and repeat the phase's critical user flow.
3. Run production build plus responsive browser smoke at 1440×900, 1024×768, 768×1024, and 390×844 where UI changed.
4. Record evidence in `docs/MVP_GAP_ANALYSIS.md` and a linked session log.

Required milestone commands:

```text
npx pnpm@10.11.0 --filter @relic/web lint
npx pnpm@10.11.0 --filter @relic/web test
npx pnpm@10.11.0 --filter @relic/web build
npm run test:scripts
npm run verify
supabase db reset
supabase test db
```

Run `npx pnpm@10.11.0 --filter @relic/web test:e2e` for seeded browser milestones. Provider milestones also require local Edge compilation and an explicitly authorized hosted smoke test with server-only secrets.

Stop rules:

- A reproducible P0 regression blocks the next packet.
- A flaky test that fails twice is treated as a defect; fix its isolation or timing before proceeding.
- Never waive RLS, canon-write, offline-preservation, or provider-idempotency failures.
- Avoid broad refactors inside feature packets. First protect behavior, then extract only the code required to make the packet safe.
- Keep packets small enough for one focused review and one scoped commit; split any packet that crosses two unrelated trust boundaries.

## 4. Delivery sequence

### Phase A — Stable Stage

#### Packet A1 — Dialog focus and typing reliability — complete 2026-07-20

- Stabilize Stage dialog callbacks so the one-second elapsed timer cannot rerun focus initialization.
- Preserve initial focus, Tab trap, Escape, backdrop close, and focus return.
- Extract the focus-owning dialog primitive only if that reduces lifecycle risk; do not start a broad Stage rewrite.
- Add fake-timer component tests that type through multiple clock ticks in Note, Dice, Create, and End.
- **Done when:** entered text and selection remain stable for at least three simulated clock ticks and all existing Stage tests pass.
- **Evidence:** the dialog lifecycle now initializes focus once per mount while retaining the latest close callback; focused tests cover active-field persistence, End confirmation, Tab wrapping, Escape, backdrop close, and trigger-focus return; authenticated and four-viewport Stage browser gates pass.

#### Packet A2 — Dice and Quick Create proof

- Cover Normal/Advantage/Disadvantage for d20 and persistence into pinned dice.
- Exercise NPC, Location, Item, Thread, Note, and Faction mappings through Stage actions.
- Refresh Library reads after create and prove each created record is visible with correct type/stub semantics.
- Extract Dice/Quick Create modules behind protected behavior if the focused tests make that refactor safe.
- Test validation, duplicate/error behavior, and permission denial.
- **Done when:** component + authenticated browser tests prove all modes/types and no record disappears after refresh.
- **Evidence:** Normal, Advantage, and Disadvantage are covered through the d20 action path; pinned rolls retain the selected mode; all six Create choices are exercised through scoped actions; five entity types refresh into Library as GM-authored stubs; Create → Note preserves its chosen title as a session-linked quick capture; validation, in-flight duplicate prevention, permission failures, RPC mappings, pgTAP provenance, and the authenticated create → refresh loop pass.

#### Packet A3 — Active Threads and shell polish

- Add a compact read-only active-Thread area without changing the five-button rail.
- Apply restrained Stage top-bar consistency improvements without changing route hierarchy or wireframe information architecture.
- Keep `GM Screen` for MVP; `Rulebook` remains a post-MVP naming pass.
- Re-run four-viewport screenshots and keyboard/backdrop checks.
- **Done when:** Stage is glanceable, stable, and wireframe-compatible at all target viewports.

**Milestone A gate:** full web suite/build, responsive Stage E2E, no console errors, and the same Dice/Create/Note flow repeated after a dev-server restart.

### Phase B — Complete Stage offline recovery

#### Packet B1 — Durable non-audio write queue

- Extend the proven IndexedDB pattern to Quick Note, Quick Create, Mark Moment, and End Session intent.
- Give each queued write a stable idempotency key and explicit queued/uploading/failed/recovered state.
- Preserve ordering where End depends on preceding captures/marks.
- **Done when:** unit tests cover enqueue, replay, duplicate delivery, partial failure, and app restart.

#### Packet B2 — Airplane-mode workflow

- Cache the ready Stage packet and literal search index needed for live play.
- Exercise start → note → stub → record → mark → end entirely offline, then reconnect.
- Surface conflicts instead of silently overwriting newer server state.
- **Done when:** one deterministic browser test proves exactly-once flush after reload/reconnect with all evidence intact.

**Milestone B gate:** clean database reset, offline flow twice (fresh and reload recovery), pgTAP idempotency checks, web build, and responsive Stage smoke.

### Phase C — Close the post-session loop

#### Packet C1 — Manual evidence intake

- Add scoped pasted-notes and GM manual-summary inputs to Session Review.
- Preserve draft text locally on save/network failure.
- Create source rows with session provenance; do not create canon.
- **Done when:** audio, pasted notes, or manual summary can independently provide a surviving synthesis input.

#### Packet C2 — Synthesis orchestration

- Add the explicit `synthesize_session` invocation after inputs are ready.
- Reuse the existing AI run, quota, validation, metering, retry, and scoped-source boundaries.
- Make reruns idempotent and prevent pending drafts from becoming retrieval canon.
- **Done when:** pgTAP/source tests prove one run per idempotency key, safe retry, and zero canon writes.

#### Packet C3 — Source-aware output writer

- Convert validated synthesis output into pending summary/entity/thread/prep drafts.
- Write `draft_sources` only from allowed session source IDs.
- Preserve confidence, task/prompt/model provenance, and batch identity.
- **Done when:** fixture synthesis creates the expected draft batch and rejects hallucinated/cross-Saga source IDs.

#### Packet C4 — Source context and citation drift UI

- Consume `get_transcript_source_context` in a timestamped source panel/route.
- Show frozen excerpt, current segment, edited/deleted drift warning, and safe broken-source state.
- Add signed audio context only if the existing retention/access boundary can support it safely.
- **Done when:** every synthesis citation opens inspectable evidence and permission tests exclude sibling sessions.

#### Packet C5 — Approval Queue trust completion

- Add field-level old/new diff, edit-and-approve, source dock, conflicts, archive explanation, filters/search, and stale handling.
- Preserve explicit selection and avoid prominent Approve All.
- Test create/update/archive/merge/reject/edit-and-approve against fixture drafts.
- **Done when:** every proposal can be fully reviewed and only explicit approval reaches canon/audit.

**Milestone C gate:** clean reset → seed evidence → synthesize deterministic fixture → inspect citations → edit/approve one draft → verify canon/audit/source → restart → confirm remaining queue state. Run the same sequence twice.

### Phase D — Finish the manual web spine

#### Packet D1 — Hierarchy switching and Saga lifecycle

- Implement functional Workspace/World/Saga switching.
- Add scoped rename and name-confirmed delete; block delete while live.
- Complete database and Storage cleanup rather than returning deterministic counts.
- **Done when:** create/reuse/switch/rename/delete works without leaking or orphaning sibling data.

#### Packet D2 — Library lifecycle and relationships

- Add visible autosave, restore, two-confirmation hard delete where allowed, source dock, relationships, mentions, and backlinks.
- Keep mention/link acceptance explicitly GM-driven.
- **Done when:** all six record types pass create/edit/archive/restore/link/source acceptance.

#### Packet D3 — Threads and timeline

- Add objective edit/toggle, resolution editor, related entities, pin history, failed group, and derived read-only timeline.
- **Done when:** a five-session fixture renders transitions and completed objectives persist timestamps.

#### Packet D4 — Prep parity

- Add autosave, inline-home/full-editor parity, prior-session summary, scheduled-session affordances, actions menu, and archived-pin recovery.
- **Done when:** multiple future sessions coexist, live prep locks correctly, and failed saves preserve input.

#### Packet D5 — Import Inbox

- Ship paste and Markdown ingestion first with size/type validation, raw source provenance, review state, and quota/manual fallback.
- Add `.docx` extraction only after malformed, oversized, and unsupported-file tests are deterministic.
- Keep imported material raw/untrusted until explicit GM creation or Approval Queue action.
- **Done when:** text/Markdown and supported `.docx` inputs survive review/retry, retain provenance, and cannot enter canon automatically.

**Milestone D gate:** complete the full manual Create → Organize → Prep → Run → Review → Approve → Continue browser loop after a clean reset, then repeat after app restart.

### Phase E — Retrieval and AI experiences

#### Packet E1 — Embedding and re-embedding delivery

- Implement the embedding provider handler and transcript-edit re-embedding worker.
- Add deterministic local mode, idempotent metering, dead-letter recovery, and retrieval eval fixtures.
- Verify hybrid retrieval excludes sibling Sagas and falls back lexically when semantic delivery fails.
- **Done when:** seeded recall/latency thresholds pass locally and one hosted embedding smoke succeeds.

#### Packet E2 — Hosted provider and observability gate

- Deploy/configure LiteLLM aliases and server-only secrets.
- Smoke transcription, embedding, and one light/deep AI task.
- Confirm usage events, safe logs, retry behavior, and no secrets/browser exposure.
- **Done when:** staging evidence exists for real provider delivery, not only deterministic mode.

#### Packet E3 — Relic Guide

- Wire `answer_saga_question` with citations or `no_answer=true`.
- Add source context, insufficiency copy, quota/provider fallback, and reviewed action cards.
- **Done when:** uncited factual answers cannot render and actions require GM review.

#### Packet E4 — Session Prep AI

- Wire canon-only prep briefing, session suggestions, scene beats, complications, NPC candidates, and inline Quick Stub review.
- Keep ephemeral suggestions out of canon and preserve manual prep.
- **Done when:** each task validates sources/quota and accepts only through the specified working-state path.

#### Packet E5 — AI-assisted Saga creation

- Add GM profile defaults/override, Build with AI, Bring your notes, 50k validation, resumable creation, scaffold review, per-item reject/regenerate, and explicit commit.
- **Done when:** both paths produce editable source-aware drafts and abandonment/resume works without canon writes.

**Milestone E gate:** deterministic suite first, then authorized staging smoke for every MVP task family. Recheck quota, provenance, citation validation, and explicit-approval invariants.

### Phase F — Trust, data, and operations

#### Packet F1 — Settings, retention, and quota recovery

- Add scoped profile/system/retention/preferences forms and 70/90/100% quota states.
- Ensure retention changes affect cleanup behavior and blocked AI keeps manual paths open.
- **Done when:** every setting validates at the correct scope and an audit/recovery path exists.

#### Packet F2 — Real export

- Build scoped JSON + Markdown archives, upload ZIPs, create expiring signed downloads, and clean expired files.
- Test include/exclude audit options and sibling-data denial.
- **Done when:** a downloaded archive is opened and its contents match the selected scope/options.

#### Packet F3 — Notification delivery

- Implement email delivery/preferences and deduped deep links for ready/failed/stale events.
- Add mobile push only in the mobile branch below.
- Suppress notifications during live/undo.
- **Done when:** enabled channels deliver once, disabled channels do not, and failures are retryable/visible.

**Milestone F gate:** clean reset, settings/retention mutation, real export inspection, and notification delivery/retry smoke with safe logs.

### Phase G — Release quality and platform gate

#### Packet G1 — Loading, errors, permissions, and accessibility

- Add route-level loading/error boundaries and a shared safe failure taxonomy.
- Add axe smoke tests, reduced-motion checks, keyboard-only walkthroughs, and focus-order coverage.
- **Done when:** every core route has non-leaky loading/error/empty/denied recovery and no serious/critical axe findings.

#### Packet G2 — Full regression, visual, and performance gate

- Put the deterministic manual loop plus Review recovery in CI.
- Add visual baselines for auth, home, Library, Threads, Prep, Stage, Review, Settings, and failures.
- Measure cold load, Stage search, prep, provider tasks, and queue latency; enable safe Sentry/PostHog/queue dashboards.
- **Done when:** two consecutive clean CI runs pass with approved screenshots and recorded budgets.

#### Packet G3 — Mobile release decision

- Decide whether responsive web is accepted for private MVP alpha or native Expo remains an MVP gate.
- Decide the combined-vs-separate Workspace/World/Saga switcher treatment before mobile shell implementation.
- Record the decision in the owning active specs and gap analysis.

If responsive web is explicitly accepted:

- Run installability/device/offline/recording acceptance on the target alpha devices.
- Move native Expo packets to the first post-alpha plan without weakening web recovery requirements.

If native Expo remains required:

#### Packet G4 — Mobile foundation

- Scaffold Expo Router, auth/bootstrap, shared types, secure session storage, and navigation.
- **Done when:** target devices sign in and open the correct scoped Saga.

#### Packet G5 — Mobile Stage

- Implement cached packet, SQLite queue, native recording/chunks, notes/stubs/dice/Mark/End, crash recovery, and deep links.
- **Done when:** the full airplane-mode Stage loop passes on target hardware twice.

#### Packet G6 — Mobile Sanctum/Review/notifications

- Implement required create/organize/prep/review/settings parity with sheets/stacked layouts and Expo push.
- **Done when:** the MVP loop completes on target hardware without falling back to desktop-only capability.

**Milestone G gate:** accessibility, responsive/device, recovery, telemetry, and release-platform acceptance all green.

## 5. Gap-to-phase coverage

| Lane | Gap coverage |
|---|---|
| Baseline/invariants | Auth/bootstrap and Workspace/World/Saga isolation stay continuously protected. |
| Phase A | Stage cockpit reliability plus bounded Stage component decomposition. |
| Phase B | Stage offline/crash recovery and browser evidence-path recovery. |
| Phase C | Post-session evidence/synthesis, source deep links, Approval Queue, and shared job-state treatment. |
| Phase D | Saga lifecycle/switching, manual entity/note relationships, Threads/timeline, Prep parity, and Import Inbox. |
| Phase E | Search/embeddings, AI delivery, Relic Guide, Prep AI, AI-assisted Saga creation, and GM-profile inputs. |
| Phase F | Usage/settings/retention, real Storage cleanup/export, and notification delivery/preferences. |
| Phase G | Loading/error states, accessibility, full E2E, visual/performance telemetry, and mobile release parity. |

P2 relationship/timeline polish is folded into D2/D3 only to the extent required for readable, accessible MVP behavior. Further density polish remains post-MVP. P2 telemetry and visual regression are release gates in G2 because they expose late-stage regressions; they are not treated as optional decoration.

## 6. Release-candidate protocol

RC begins only after every required P0 and P1 row is Complete or has an explicit signed release-scope decision. P2 work may defer only when it does not hide a functional, accessibility, security, or performance defect.

### RC1 — Clean-room technical pass

- Fresh dependency install from lockfile.
- Fresh Supabase start/reset and full migration replay.
- Full lint, web tests, build, script tests, pgTAP, database lint/advisors, and secret scan.
- No unexpected generated or ignored artifacts staged.

### RC2 — Golden-path and recovery pass

- Run the complete MVP loop with deterministic providers.
- Run it again with injected network/provider failures and recovery.
- Restart browser/app/services mid-Stage and mid-Review; verify preserved state.
- Confirm no automatic canon mutation and no sibling-tenant data.

### RC3 — Hosted smoke

- Exercise auth, Storage, transcription, embedding, one AI task per family, export, and notification delivery in staging.
- Inspect usage, queue, dead-letter, error, and latency telemetry.
- Confirm secrets remain server-only and logs contain no private prompt/evidence payloads.

### RC4 — Human acceptance

- GM completes one realistic session lifecycle on each release platform.
- Record usability defects by P0/P1/P2; fix all P0 and release-blocking P1 issues.
- Repeat affected focused tests plus the full golden path after fixes.

### Go/no-go

Ship only when:

- Two consecutive clean technical/golden-path passes succeed.
- No open P0 defects remain.
- No serious/critical accessibility or security findings remain.
- Hosted provider/storage/export/notification smoke is green.
- Recovery has been proven for offline Stage, upload, transcription, synthesis, and approval conflicts.
- Gap analysis, session logs, deployment notes, and rollback instructions match the released commit.

## 7. Progress tracking

For every packet:

- Mark its gap-analysis row with implementation evidence and remaining gaps.
- Add or update focused tests in the same commit as behavior.
- Record verification commands and outcomes in a session log.
- Commit one scoped packet and push it before beginning the next.
- If a new cross-cutting defect appears, add it to the gap analysis and insert the smallest repair packet before dependent work.

Immediate next packet: **A3 — Active Threads and shell polish**.
