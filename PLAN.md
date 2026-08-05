# Relic MVP Delivery Plan

**Plan date:** 2026-07-21

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
| -------- | --------:| -------:| -------:| -------:| ------------------:|
| P0       | 11       | 5       | 4       | 2       | 0                  |
| P1       | 1        | 4       | 2       | 0       | 1                  |
| P2       | 0        | 3       | 0       | 0       | 1                  |

The proven base is auth/bootstrap, scoped RLS/RPCs, the web Stage evidence path, Mark Moment, end-session finalization, provider-shaped transcription/retry contracts, a stable Stage dialog focus lifecycle, refresh-proven Dice/Quick Create behavior, the complete B2 short-window web airplane-mode workflow, C3's atomic source-aware synthesis draft batch, C4's scoped citation inspection and transcript drift navigation, C5's explicit field-diff Approval Queue commit boundary, D1's scoped three-dropdown hierarchy plus real Saga lifecycle cleanup, D2's complete six-type Library lifecycle with explicit relationship/mention acceptance, D3's scoped Thread/objective lifecycle plus derived read-only timeline, D4's recoverable autosaving Prep parity, D5's raw paste/text/Markdown Import Inbox boundary, E1's content-versioned embedding/re-embedding delivery with scoped hybrid retrieval and lexical fallback, E2's real hosted provider delivery and observability proof, E3's sourced conversational Guide compatibility layer, E4's recoverable cited Session Prep AI review flow, E5.1-E5.2's profile-aware conversational Loom workshop, and E6's typed, cost-disclosed, receipt-backed Loom action kernel. Revised Phase E is the universal Loom operating-layer lane in `Relic Vault/59 - Phase E Loom Operating Layer Plan.md`; E7 is immediate. `.docx` remains a named D5 format gap.

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
- **Evidence:** The scoped session-active Thread read now renders as a compact, read-only primary-column region with state, summary, and objective count; the rail remains five actions; the Stage/session identity is quiet context rather than adjacent pills; focused component coverage and the authenticated signup-to-Stage loop prove empty/populated states, no Thread mutations or detours, keyboard/backdrop regressions, zero browser errors, and no horizontal overflow at 1440×900, 1024×768, 768×1024, or 390×844.

**Milestone A gate:** full web suite/build, responsive Stage E2E, no console errors, and the same Dice/Create/Note flow repeated after a dev-server restart.

### Phase B — Complete Stage offline recovery

#### Packet B1 — Durable non-audio write queue — complete 2026-07-20

- Extend the proven IndexedDB pattern to Quick Note, Quick Create, Mark Moment, and End Session intent.
- Give each queued write a stable idempotency key and explicit queued/uploading/failed/recovered state.
- Preserve ordering where End depends on preceding captures/marks.
- **Done when:** unit tests cover enqueue, replay, duplicate delivery, partial failure, and app restart.
- **Evidence:** Quick Note, all Quick Create mappings, Mark Moment, End Session, and Undo now commit a stable UUID-backed intent to IndexedDB before replay. The per-session monotonic sequence stops at the first failed dependency; a scoped transactional RPC records exactly-once GM receipts and rejects mismatched key reuse. Four queue tests cover enqueue/replay, duplicate redelivery, partial failure, and restart recovery; 19 pgTAP assertions prove one domain effect per key, client timestamps, End/Undo replay, and anonymous denial. The clean migration replay, 320-test database suite, 53-test web suite, production build, and authenticated loop all pass.

#### Packet B2 — Airplane-mode workflow — complete 2026-07-20

- Cache the ready Stage packet and literal search index needed for live play.
- Exercise start → note → stub → record → mark → end entirely offline, then reconnect.
- Surface conflicts instead of silently overwriting newer server state.
- **Done when:** one deterministic browser test proves exactly-once flush after reload/reconnect with all evidence intact.
- **Evidence:** The authenticated Stage caches its scoped packet, resolved pins/Threads, and current-Saga plus eligible World literal index in an owner-keyed IndexedDB snapshot. Start, note, stub, consent, Go Live, mark, and End share B1's FIFO queue and immutable receipt boundary; lifecycle/consent mismatches become stored conflict receipts and pause later replay without overwriting the server. Focused cache/queue tests, 20 B2 pgTAP assertions, a clean 340-test database suite, and the browser airplane-mode proof cover offline reload, one queued audio Blob, seven queued writes, reconnect, exactly one server effect, and four responsive viewports.

**Milestone B gate — passed 2026-07-20:** clean database reset, offline flow twice (fresh and reload recovery), pgTAP idempotency checks, web build, responsive Stage smoke, and the A1–A3 authenticated regression all passed.

### Phase C — Close the post-session loop — complete 2026-07-21

#### Packet C1 — Manual evidence intake

- Add scoped pasted-notes and GM manual-summary inputs to Session Review.
- Preserve draft text locally on save/network failure.
- Create source rows with session provenance; do not create canon.
- **Done when:** audio, pasted notes, or manual summary can independently provide a surviving synthesis input.
- **Evidence:** Session Review now saves pasted notes and GM manual summaries as immutable, session-scoped `sources` through an authenticated, idempotent RPC. Owner/scoped local drafts survive refresh and failed saves, exact retries return one source, mismatched UUID reuse and cross-scope/live-session writes fail, and no note, draft, audit, synthesis run, credit charge, or canon row is created. Focused UI/action/storage tests, 27 C1 pgTAP assertions, the clean 367-test database suite, and an authenticated reload/save/readback browser proof passed while the A1–A3 loop remained green.

#### Packet C2 — Synthesis orchestration

- Add the explicit `synthesize_session` invocation after inputs are ready.
- Reuse the existing AI run, quota, validation, metering, retry, and scoped-source boundaries.
- Make reruns idempotent and prevent pending drafts from becoming retrieval canon.
- **Done when:** pgTAP/source tests prove one run per idempotency key, safe retry, and zero canon writes.

#### Packet C3 — Source-aware output writer — complete 2026-07-21

- Convert validated synthesis output into pending summary/entity/thread/prep drafts.
- Write `draft_sources` only from allowed session source IDs.
- Preserve confidence, task/prompt/model provenance, and batch identity.
- **Done when:** fixture synthesis creates the expected draft batch and rejects hallucinated/cross-Saga source IDs.
- **Evidence:** The final validated provider response now carries resolved model/provider provenance into a service-role-only result RPC. The database locks the AI run, revalidates the complete synthesis shape and immutable allowlist, verifies every citation against the exact Workspace/World/Saga/Session, and atomically writes one pending summary/entity/Thread/next-prep batch with derived confidence bands plus run/pipeline/task/prompt/model/provider provenance. Exact replay returns the same batch; changed delivery, malformed output, missing/hallucinated/cross-session/cross-Saga/cross-tenant sources, and allowlist expansion fail closed. A deterministic public worker-RPC fixture creates four drafts and five citations; injected mid-batch failure rolls back all rows. Focused schema/runtime tests and 44 C3 pgTAP assertions pass, the clean migration replay passes, and the full 411-test database suite proves zero note/entity/Thread/session canon writes, canon audit rows, or embeddings.

#### Packet C4 — Source context and citation drift UI — complete 2026-07-21

- Consume `get_transcript_source_context` in a timestamped source panel/route.
- Show frozen excerpt, current segment, edited/deleted drift warning, and safe broken-source state.
- Add signed audio context only if the existing retention/access boundary can support it safely.
- **Done when:** every synthesis citation opens inspectable evidence and permission tests exclude sibling sessions.
- **Evidence:** Every C3 synthesis citation now opens an accessible inline source disclosure from Session Review and the Approval Queue. A draft-scoped authenticated RPC rechecks Workspace/World/Saga/draft/source/transcript relationships server-side, returns frozen and current transcript text with timestamp and exact/edited/deleted state, supports authorized segment anchors, renders untimestamped pasted-note/GM-summary evidence, and collapses missing, broken, denied, or unsupported records into non-leaking safe states. Focused component and 23-assertion pgTAP suites, the clean 434-test database suite, full 68-test web suite, production build, and authenticated four-viewport keyboard/deep-link browser proof passed. Signed audio was deferred because the current private Storage contract has no browser-safe signed playback boundary.

#### Packet C5 — Approval Queue trust completion — complete 2026-07-21

- Add field-level old/new diff, edit-and-approve, source dock, conflicts, archive explanation, filters/search, and stale handling.
- Preserve explicit selection and add prominent Approve All.
- Test create/update/archive/merge/reject/edit-and-approve against fixture drafts.
- **Done when:** every proposal can be fully reviewed and only explicit approval reaches canon/audit.
- **Evidence:** The queue now renders allowlisted field-level current/proposed editors with the C4 citation dock, target/source/confidence/provenance context, action consequences, and status/type/batch/confidence/conflict search and filters. One-by-one, selected, and prominent all-compatible approval enter the same target-locking scoped RPC; blocked, dirty, merge, and archive-confirmation items stay one-by-one. Create/update/archive/merge/reject/edit-and-approve, Thread and next-Session implication commits, stale/missing/archived/source-drift/broken-source conflicts, exact retry receipts, preserved edits, sibling-Saga denial, exact audit/provenance effects, and zero-write nonapproval states are covered by 52 focused C5 pgTAP assertions plus component/action tests. The authenticated C3-shaped browser fixture inspected C4 evidence, edited and approved a summary, verified canon/audit/source provenance, rebased and approved a stale target, archived another proposal, covered four responsive viewports, and preserved the remaining queue across a fresh app-server start.

**Milestone C gate — passed twice 2026-07-21:** two independent clean resets each passed all 19 database files / 486 assertions, all 20 web files / 75 tests, 14 script tests, web lint, repository verification, and production build. Each run then seeded the deterministic C3-shaped evidence batch, completed the authenticated C4→C5 review/commit/conflict/archive sequence at 1440×900, 1024×768, 768×1024, and 390×844, restarted the app server, and confirmed the unresolved queue state remained pending.

### Phase D — Finish the manual web spine

#### Packet D1 — Hierarchy switching and Saga lifecycle — complete 2026-07-21

- Implement functional Workspace/World/Saga switching.
- Add scoped rename and name-confirmed delete; block delete while live.
- Complete database and Storage cleanup rather than returning deterministic counts.
- **Done when:** create/reuse/switch/rename/delete works without leaking or orphaning sibling data.
- **Evidence:** The Sanctum now uses three separate Workspace, World, and Saga dropdowns backed by owner-filtered landing targets; live/ending Sessions disable switching. New saga preserves the selected Workspace/World, Saga Settings exposes scoped rename plus exact-name delete, and the delete RPC blocks live/ending Sessions, immediately hides the Saga, and enqueues one idempotent cleanup job. The service-only worker now has a callable claim boundary, enumerates the exact Saga prefix across `audio`, `attachments`, and `exports`, removes real objects through the Storage API in 1,000-object batches, and only then hard-deletes Saga database rows. Focused pgTAP, component/action, worker unit/source tests, authenticated create/reuse/switch/rename/delete browser proof, and a real local Storage→worker→database smoke all passed with sibling data preserved.

#### Packet D2 — Library lifecycle and relationships — complete 2026-07-21

- Add visible autosave, restore, two-confirmation hard delete where allowed, source dock, relationships, mentions, and backlinks.
- Keep mention/link acceptance explicitly GM-driven.
- **Done when:** all six record types pass create/edit/archive/restore/link/source acceptance.
- **Evidence:** Character, Place, Faction, Artifact, Thread, and Note now share an 800ms/blur autosave editor with visible saving/conflict states, source/provenance dock, archive/restore, relationship or Note-attachment editing, exact-name mention suggestions, explicit accept/dismiss, and accepted backlinks. Hard delete requires an archived record, a confirmation checkbox, its exact typed name, and zero live relationship, accepted/suggested mention, note-attachment, Session-pin/active-Thread, or pending-draft references. Sources and canon audit remain as tombstones while derived embeddings are removed. Focused pgTAP, component/action tests, and an authenticated create/edit/reload/link/archive/block/restore/delete browser flow pass without sibling-scope access.

#### Packet D3 — Threads and timeline — complete 2026-07-21

- Add objective edit/toggle, resolution editor, related entities, pin history, failed group, and derived read-only timeline.
- **Done when:** a five-session fixture renders transitions and completed objectives persist timestamps.
- **Evidence:** Optimistic scoped Thread/detail and objective RPCs now cover title, summary, Active/Loose/Dormant/Failed/Resolved transitions, resolution explanations, objective create/edit/complete/reopen/order, and correct `completed_at` set/clear behavior. Thread detail reuses D2 relationships, displays archived/missing endpoints safely, and derives a source-traceable read-only history from canon audit, Session-active/pinned rows, and Session-linked sources without a timeline table. A deterministic five-Session pgTAP fixture passes 43 focused assertions; all 598 database assertions, 87 web tests, lint, build, scripts, repository verification, responsive authenticated flow, and fresh-app-server persistence proof pass while Stage retains its compact read-only strip and five-action rail.

#### Packet D4 — Prep parity — complete 2026-07-21

- Add autosave, inline-home/full-editor parity, prior-session summary, scheduled-session affordances, actions menu, and archived-pin recovery.
- **Done when:** multiple future sessions coexist, live prep locks correctly, and failed saves preserve input.
- **Evidence:** Home and full Prep now share one 800ms/blur autosave editor with owner/scoped local recovery, visible saving/saved/offline/failed/conflict/retry states, optimistic stale-write rejection, scheduled date/time, prior approved-summary fallback, state-valid lifecycle actions, and ordered recoverable entity/Thread pins. Planned and Ready remain editable; every later state is read-only. Ready flushes the latest local edit before transition, and Stage reads the persisted relational packet. Sixteen focused component tests, 31 D4 pgTAP assertions, the 103-test web suite, 629-test database suite, clean replay/lint/build/repository gates, and authenticated four-viewport plus fresh-server restart flows passed with explicit zero-provider and zero-canon-write assertions.

#### Packet D5 — Import Inbox — partially complete 2026-07-21 (`.docx` deferred)

- Ship paste and Markdown ingestion first with size/type validation, raw source provenance, review state, and quota/manual fallback.
- Add `.docx` extraction only after malformed, oversized, and unsupported-file tests are deterministic.
- Keep imported material raw/untrusted until explicit GM creation or Approval Queue action.
- **Delivered:** paste plus strict UTF-8 `.txt`, `.md`, and `.markdown` survive navigation, refresh, failure, exact retry, and app restart; retain immutable scoped provenance; expose exact original content in ready/archive review states; enforce conservative size/type/MIME/encoding/filename/quota rules; and create zero canon, proposal, embedding, AI-run, or usage-charge effects.
- **Deferred:** `.docx` remains rejected. No trusted extractor ships until deterministic encrypted, macro-enabled, malformed, nested, zip-bomb-like, oversized, MIME-mismatch, original-retention, derived-source-link, extraction-version, and safe-failure fixtures pass.

**Milestone D gate — complete 2026-07-21:** after a clean reset, the authenticated signup/Create → Import review → Organize → Prep → Run spine passed together with the deterministic source-aware Review → Approve → Continue trust flow. Separate fresh-server runs preserved D4 Prep state, unresolved Approval Queue state, and D5 ready/archived imports. The gate passed with 667 pgTAP assertions, 120 web tests, 17 script tests, repository verification, TypeScript lint, production build, four-viewport browser checks, and explicit zero-provider/zero-canon-write/zero-embedding/zero-charge assertions. `.docx` remains an explicit D5 format deferral and does not block the provider-independent paste/text/Markdown boundary or E1.

### Phase E — Retrieval and AI experiences

#### Packet E1 — Embedding and re-embedding delivery

- **E1.1 — contract/dependency audit:** lock retrieval eligibility, embedding text, version identity, state transitions, transcript behavior, provider/deployment configuration, and lexical fallback in the owning active specifications before runtime changes.
- **E1.2–E1.3 — provider boundary:** implement explicit non-production deterministic mode and an isolated server-only LiteLLM `relic-embed` adapter with shared normalization, bounded timeout, response validation, safe failure classes, and injected failure coverage.
- **E1.4–E1.7 — delivery lifecycle:** add content-versioned idempotent jobs, replacement-before-flip persistence, scope revalidation, transcript-window supersession, dead-letter/replay, and provider-accepted idempotent usage accounting. Embeddings remain derived indexes and make zero canon writes.
- **E1.8–E1.9 — retrieval/evaluation:** add scoped RRF hybrid retrieval while preserving the existing lexical RPC as an independent fallback. Evaluate realistic Saga/World/transcript fixtures, isolation, stale/missing vectors, transcript edits, recall/rank, provider latency, and database latency. Initial thresholds remain provisional and warning-only until the Decision Stop 2 review.
- **E1.10 — hosted gate:** after deterministic, database, runtime, build, secret-scan, and authenticated route/worker checks pass, present the exact non-sensitive smoke for explicit authorization before any hosted call.
- **Complete (2026-07-21):** the lifecycle contract, deterministic provider, server-only LiteLLM adapter, content-versioned queue/persistence, transcript edit/hide supersession, bounded retry/dead-letter/replay, idempotent metering, scoped RRF hybrid retrieval, independent lexical fallback, and deterministic evaluation corpus pass. Decision Stop 2 approved the initial warning-only thresholds. The authorized local-development hosted smoke made exactly two successful calls through Fly app `relic-llm-dev` using alias `relic-embed` → `openai/text-embedding-3-small` at 1536 dimensions; the job completed with one usage event and zero canon writes. The existing `vector(1536)` column/index required no dimension migration.
- **Done when:** deterministic delivery, retry/replay/metering/isolation paths, transcript re-embedding, hybrid retrieval with lexical fallback, and the evaluation gate pass; one explicitly authorized hosted embedding smoke must also succeed. If hosted access is unavailable, record E1 as functionally complete but environment-gated rather than complete.

#### Packet E2 — Hosted provider and observability gate

- Deploy/configure LiteLLM aliases and server-only secrets.
- Smoke transcription, embedding, and one light/deep AI task.
- Confirm usage events, safe logs, retry behavior, and no secrets/browser exposure.
- **Complete (2026-07-23):** authorized `relic-staging` functions, additive migrations, Vault-authenticated one-minute dispatch schedules, database-native alerts, and the pinned five-alias Fly proxy are deployed. Synthetic application-boundary smokes passed for timestamped transcription, 1536-dimension record/query embeddings plus scoped hybrid retrieval and lexical fallback, `propose_thread_complication`, and `synthesize_session`. Exact retries replayed without duplicate provider work, usage events, or drafts; controlled permission/schema/persistence failures remained bounded and recovered; sibling-Saga/unapproved sources stayed excluded; canon writes were zero; cleanup left no fixture residue. The affected proxy and workers were restarted/redeployed and the critical provider paths passed from cold state. Latest Cron runs succeed, queues are empty, operational alerts are `[]`, safe-log scans are clean, and deterministic hosted mode remains fail-closed.
- **Cost incident:** the repeat harness conservatively counted 41 inference attempts against the user-authorized ceiling of 40 because a generic idle embedding dispatch claimed a different queued synthetic job after the target proof had passed. This was not an exact-retry duplicate or user charge duplication. The idle dispatch was removed, all synthetic residue was cleaned, and the runner is hard-disabled at 41/40; total exposure remained below the E2 `$1` stop and project `$5` cap. No further provider call is authorized by this packet.
- **Done when:** staging evidence exists for real provider delivery, not only deterministic mode.

#### Packet E3 — Relic Guide conversational foundation

- Add persistent GM-owned, Saga-scoped Guide threads that survive refresh, navigation, app restart, and later web/mobile handoff. Only bounded server-selected prior context may enter a turn; conversation is never canon or citation evidence.
- Wire factual turns through `answer_saga_question` with typed provenance blocks, paragraph-level citations, or `no_answer=true`.
- Distinguish grounded answers, creative proposals, grounded proposals, guidance, action previews, and insufficiency so newly created material is never given fabricated citations or presented as established canon.
- Add source context, insufficiency copy, quota/provider/retrieval fallback, turn-level idempotency, supersession, and an extensible server-owned action registry.
- Ship only `open_record` and explicitly confirmed `draft_entity` Guide actions in E3. E4 and E5 add their registered task families to the same conversational shell only after their dedicated contracts pass.
- **Functionally complete / environment-gated (2026-07-23):** the search-shaped placeholder is replaced by persistent Saga-scoped conversations over `answer_saga_question@1.1.0`; strict typed-block validation, paragraph citations, immutable evidence snapshots, bounded prior context, `no_answer`, quota/provider/manual recovery, exact logical retry, supersession, source drift inspection, and reviewed `open_record` / `draft_entity` paths pass locally. Clean migration replay, 21 focused pgTAP assertions, 23 Guide/runtime source assertions, the full web suite, production build, and the authenticated four-viewport composer-to-runtime browser proof pass with deterministic non-billable providers.
- **E3 provider incident:** a local Edge test helper initially inherited live provider values from `supabase/.env.local`, causing four synthetic LiteLLM requests before the mismatch was detected: one embedding, one entity draft, and an answer plus bounded repair. No private data or production environment was involved. The helper now defaults to an isolated temporary environment with deterministic AI/embedding/transcription modes and omits all live provider credentials; the rerun proves only deterministic providers and zero billable calls. Record this incident in the E3 session log and security register.
- **Complete (2026-07-28):** Decision Stop 4 passed. The authorized existing-proxy smoke completed three Guide turns and one separately confirmed draft: one paragraph-cited grounded answer, one labeled creative proposal with action preview, conservative `no_answer`, exact replay with no additional provider or usage work, 1-credit Guide and 3-credit draft metering, authenticated citation context, sibling-Saga/import exclusion, payload-free telemetry, zero canon writes, and zero synthetic residue. Both dispatch schedules and every function gateway-JWT setting were restored. The removable staging demo retains eight current vectors for manual testing; its World-scope worker path now omits a null `saga_id` when requesting a scoped JWT.
- **Done when:** factual blocks cannot render without authorized paragraph citations, creative blocks cannot masquerade as canon, conversation cannot cross Saga scope, and every action follows its risk-appropriate GM review boundary.

#### Packet E4 — Session Prep AI — complete 2026-07-30

- Add one recoverable Session-scoped invocation/job-state boundary over the E2 runner for canon-only briefing, session suggestions, scene beats, complications, NPC candidates, and Quick Stub review.
- Freeze the current-Saga plus eligible World source/version allowlist before dispatch. Every generated item must carry valid citations; insufficient evidence produces no suggestion and reuses E3 `no_answer` treatment.
- Keep provider results outside `sessions`, pins, Threads, entities, drafts, and canon. Preserve D4 manual Prep, local recovery, and optimistic concurrency through quota, retrieval, provider, validation, network, refresh, and restart failure.
- Accept Session text/pin/Thread suggestions only by merging them into the live editor and completing the existing D4 autosave. A stale save leaves the result pending and the GM draft preserved.
- Route an accepted NPC candidate through a separately preflighted `draft_entity_from_prompt` run and route accepted Quick Stub fleshing into a pending C5 update draft. Neither path creates or changes canon before explicit Approval Queue commit.
- Add deterministic fixtures, strict per-task schemas/citations, prompt-injection cases, exact retry/metering proof, zero-write assertions, authenticated four-viewport/restart coverage, and a separately authorized hosted gate.
- **Complete (2026-07-30):** all six Prep tasks run through one Session-scoped recoverable request/evidence/result projection over the E2 worker. Current-Saga and eligible-World evidence is frozen before provider delivery; every usable item validates citations and insufficiency remains non-writing. D4 autosave is the only accepted Prep-text write, stale saves keep the result pending, NPC/Quick Stub confirmations create only C5-reviewed drafts, and reject/dismiss/failure/quota paths preserve complete manual Prep. Clean replay, 845 pgTAP assertions, 138 web tests, 76 script/runtime tests, repository verification, deterministic retrieval evaluation, authenticated full workflow, fresh-server recovery, and four responsive viewport checks pass. No E4 hosted call was made; prior E2/E3 authorization was not reused.
- **Done when:** all six task surfaces show frozen sources or explicit insufficiency, retries cannot duplicate provider work/charges, accepted Prep changes persist exactly once through D4, rejected/dismissed output has zero effects, Quick Stub changes use C5, and manual Prep remains complete without AI.

#### Revised Phase E — Universal Loom operating layer

The detailed contracts, dependencies, exclusions, verification matrix, and decision log live in `Relic Vault/59 - Phase E Loom Operating Layer Plan.md`.

- **E5.1 — Profile-Aware Workshop Correctness (complete 2026-08-04):** the server resolves and validates first-use/default/custom Saga profiles, freezes the effective profile into workshop identity and trusted AI input, persists only the intended default or Saga override at explicit commit, and applies the same rules to Start Blank. Clean replay, 34 focused pgTAP assertions, the 879-assertion database suite, 81 script tests, 138 web tests, TypeScript, production build, and authenticated deterministic browser proof pass with zero paid calls.
- **E5.2 — Conversational Workshop and Scaffold Parity (complete deterministically 2026-08-04):** one 1-credit planning task creates a stored three-to-five-question interview; answer turns advance deterministically without provider calls; `Draft it now` separately dispatches the 10-credit full scaffold; 3-credit targeted proposals preserve unrelated review edits and require explicit acceptance. Resume/discard, hard bounds, complete scaffold fields/cardinalities, private Saga context, existing-World proposal isolation, exact commit, and post-commit entity/Session embedding enrollment pass clean replay, 916 pgTAP assertions, 83 script tests, 142 web tests, TypeScript, production build, and the authenticated deterministic browser journey. No paid provider call was made; hosted proof remains behind the Phase E authorization gate.
- **E6 — Loom Action Kernel (complete deterministically 2026-08-04):** `open_record@1.0.0` and `draft_entity@1.0.0` use a provider-safe manifest plus independent Edge/database validation. Frozen action intents disclose authority/effect and exact 0/3-credit cost; the ID/version/decision/idempotency review boundary derives scope, rechecks evidence, receipts replay/conflict/dismissal, and dispatches only the existing non-canon draft path with its immutable Loom evidence. Clean replay, 937 pgTAP assertions, 84 script tests, 142 web tests, TypeScript, production build, four viewports, and fresh-app-process persistence pass without paid calls.
- **E7 — Adaptive Retrieval and Read Tools:** cheapest-sufficient retrieval planner, exact/structured/FTS before vectors, bounded graph/context expansion, and scoped trace/provenance.
- **E8 — Knowledge Creation and Canon Proposals:** create/edit/relationship/Thread/objective tools that produce reversible working state or Approval Queue proposals and never silently publish canon.
- **E9 — Workflow Tools:** bounded creation, Prep, post-session, and continuity plans with inspectable steps, stop/resume/retry, per-step confirmation, and separately metered generation.
- **E10 — Destructive Actions and Phase Gate:** explicit archive; exact-name plus two-confirmation hard delete; no autonomous destructive action; adversarial scope, cost, approval, restart, and hosted-gate proof.

**Milestone E gate:** E5.1-E10 deterministic suites pass after a clean migration replay; every action proves scope, authority, idempotency, provenance, and cost behavior; canon/archive/delete negative tests remain green; then separately authorized staging smoke covers only provider-dependent task families. Phase F stays closed until this gate passes.

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
- Preserve the accepted three-separate-dropdown Workspace/World/Saga treatment when adapting the mobile shell.
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

| Lane                | Gap coverage                                                                                                 |
| ------------------- | ------------------------------------------------------------------------------------------------------------ |
| Baseline/invariants | Auth/bootstrap and Workspace/World/Saga isolation stay continuously protected.                               |
| Phase A             | Stage cockpit reliability plus bounded Stage component decomposition.                                        |
| Phase B             | Stage offline/crash recovery and browser evidence-path recovery.                                             |
| Phase C             | Post-session evidence/synthesis, source deep links, Approval Queue, and shared job-state treatment.          |
| Phase D             | Saga lifecycle/switching, manual entity/note relationships, Threads/timeline, Prep parity, and Import Inbox. |
| Phase E             | Search/embeddings, AI delivery, Relic Guide, Prep AI, AI-assisted Saga creation, and GM-profile inputs.      |
| Phase F             | Usage/settings/retention, real Storage cleanup/export, and notification delivery/preferences.                |
| Phase G             | Loading/error states, accessibility, full E2E, visual/performance telemetry, and mobile release parity.      |

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

Immediate next packet: **E7 — Adaptive Retrieval and Read Tools**. Add the cheapest-sufficient server planner, deterministic target resolution, structured scoped record/relationship/Thread/Session reads, provenance/source navigation, bounded graph expansion, and vector fallback only when cheaper exact/structured/FTS paths are insufficient. E5.1-E6 are complete at the deterministic gate. No previous hosted-call authorization carries forward; any hosted smoke requires a fresh environment/model/fixture/attempt/cost/cleanup/rollback gate. D5 imported sources remain excluded unless a later explicit GM enrollment contract is added.
