---
status: active
authority: secondary
scope: planning
read_after:
  - "[[00 - Start Here]]"
depends_on:
  - "[[11 - Product Basepoint]]"
  - "[[12 - MVP PRD]]"
  - "[[20 - Entity and Canon Schema]]"
  - "[[21 - Tech Architecture]]"
  - "[[22 - Memory and Retrieval]]"
  - "[[23 - AI Task Registry]]"
  - "[[24 - Approval Queue]]"
  - "[[25 - Pricing and Rate Limits]]"
  - "[[30 - Sanctum UX Flow]]"
  - "[[33 - First Run UX Flow]]"
  - "[[34 - UI Implementation Spec]]"
supersedes: []
last_audited: 2026-08-04
source_file: "Relic Vault/59 - Phase E Loom Operating Layer Plan.md"
---

# Phase E Loom Operating Layer Plan

## Goal

Phase E makes **The Loom** Relic's universal, cost-controlled conversational operating layer. A GM can ask about current canon, navigate records, scaffold and draft material, prepare reviewed changes, and coordinate Relic workflows through conversation. The Loom understands the Workspace -> World -> Saga hierarchy, Relic's entity and Thread model, Session lifecycle, source/citation rules, approval paths, and the actions currently available in the active scope.

The Loom is not an autonomous database agent. The provider never receives SQL access, arbitrary RPC names, service credentials, or authority to choose its own write path. It returns validated responses and typed action intents from a server-owned capability registry. Deterministic application code resolves targets, rechecks scope and versions, presents the effect, and executes only after the required GM review.

## Locked Product Decisions

1. **The Loom is the user-facing AI name.** The older user-facing `Relic Guide` name is retired. Existing `/guide`, `guide_*`, and `answer_saga_question` identifiers may remain as internal compatibility names until their owning migration or route is deliberately changed.
2. **Conversation is the primary AI interaction pattern in The Sanctum.** Existing buttons may open The Loom with a prefilled intent; they are not separate AI personalities or bypasses.
3. **AI remains GM-invoked.** The read-only cached Prep briefing exception remains unchanged. The Loom does not act unsolicited and stays dormant while Stage is live except for an explicit GM invocation allowed by the Stage contract.
4. **The provider never mutates product data.** It may answer, draft, plan, and return typed action previews. Only server-owned handlers can execute an action.
5. **Canon still requires explicit GM authority.** A canon-impacting Loom action must use the Approval Queue or a documented inline GM-direct/synthetic approval transaction. Conversation text and action previews are never canon.
6. **Hard delete is never an autonomous AI action.** The Loom may prepare and explain a deletion request, but the existing exact-name/two-confirmation contract remains the execution boundary. Saga deletion stays outside ordinary Loom plans.
7. **Retrieval is adaptive.** Exact selected context, scoped identifier/name resolution, structured reads, and full-text search run before a query embedding. Hybrid vector retrieval is used when semantic recall materially helps.
8. **Vectors are an index, not memory or authority.** Current canon is fetched by ID after retrieval. Conversation, pending drafts, raw imports, and GM-private fields remain excluded from semantic embeddings under [[22 - Memory and Retrieval]].
9. **Paid provider work is separately authorized.** Deterministic/schema/database/browser gates must pass before a bounded hosted smoke with a declared environment, alias/model, fixture, maximum attempts, dollar ceiling, cleanup, and rollback.

## Loom Turn and Action Model

Each turn follows this order:

```text
GM message
  -> normalize and bind active scope/current UI context
  -> deterministic intent/target hints
  -> adaptive retrieval plan
  -> answer and/or typed action previews
  -> GM review/confirmation appropriate to risk
  -> scoped deterministic handler or pending draft
  -> audit/receipt and embedding refresh after an approved canon change
```

The existing `answer_saga_question` task remains the internal grounded conversational task for the first implementation. Expanding user-facing Loom actions does not require a new model call per deterministic operation. A separate action registry owns executable capabilities and is not an AI Task Registry replacement.

Every registered action declares:

- stable action name and version;
- JSON input schema and server-derived fields;
- allowed target types and lifecycle states;
- Workspace/World/Saga scope requirements;
- target-resolution strategy and ambiguity behavior;
- risk/confirmation tier;
- expected-version and conflict requirements;
- deterministic handler or downstream AI task;
- quota behavior;
- effect summary, audit behavior, and manual fallback;
- idempotency identity and retry behavior.

The provider may choose only a registered action name and bounded arguments. The server derives identity, scope, permissions, quota, current record version, and the final RPC arguments. An unknown action, field, target, or state fails validation and has zero effects.

## Authority Tiers

| Tier | Examples | Required boundary |
|---|---|---|
| Read/navigation | Open record, show source, list/filter records, explain provenance | May run immediately after server authorization; zero canon effect. |
| Non-canon generation | Draft entity/Thread, brainstorm, scaffold section, source-aware proposal | Explicit GM invocation; creates ephemeral output or a pending draft. |
| Reversible working-state | Apply reviewed Prep text, select pins, dismiss output | Inline effect preview and explicit confirmation; optimistic version check. |
| Canon mutation | Create/update record, relationship, Thread state/objective | Approval Queue or documented inline GM-direct/synthetic approval with source/audit provenance. |
| Archive/restore | Archive or restore record | Explicit action card and current-version confirmation; archive is reversible. |
| Hard delete | Delete archived, unreferenced record | Existing checkbox plus exact-name/two-confirmation UI. Never part of Approve All or an unattended plan. |

Multi-action plans are bounded lists of registered intents, not open-ended provider loops. The complete effect count and dependencies are shown before confirmation. Execution stops on a stale, denied, or conflicting step; the model cannot improvise a replacement action after confirmation.

## Retrieval and Structural Context

The Loom should not place the complete database schema or whole Saga into every prompt. It receives a compact domain/action manifest plus the context needed for the current turn.

Retrieval order:

1. Current UI selection and explicit IDs.
2. Exact and normalized record-name resolution.
3. Scoped structured queries for type, state, relationships, Thread objectives, Sessions, and provenance.
4. Indexed full-text search.
5. Query embedding plus hybrid RRF when meaning-based recall is required.
6. Bounded graph-neighborhood expansion after one or more target IDs are resolved.

Every returned prompt fact carries an allowlisted source ID and current source version. Factual Loom paragraphs require citations or explicit insufficiency. Conversation history helps resolve pronouns and follow-ups but is not evidence. After an approved mutation, the response may use the committed row and receipt immediately; it does not wait for asynchronous re-embedding before acknowledging success.

The existing embedding lifecycle remains the delivery base: content hash/version identity, debounce, replacement-before-flip, scoped hybrid retrieval, lexical fallback, retry/dead-letter, and idempotent provider metering. The Loom adds structured and graph-aware retrieval; it does not replace that lifecycle.

## Cost Policy

- Navigation, confirmation, deterministic execution, approval, and exact retry create no new generative charge.
- Explicit target/name/structured operations avoid query embeddings when semantic retrieval is unnecessary.
- `relic-fast` is preferred for truly ambiguous intent/target resolution; deterministic rules run first.
- `relic-balanced` owns grounded conversation and one-record drafting.
- `relic-deep` is reserved for complete scaffold and post-session synthesis workloads.
- One Loom response may contain both an answer and action previews; do not split them into avoidable calls.
- Confirming an existing action preview never repeats its originating provider call.
- A confirmed creative task uses its registered task credit separately and exposes that estimate before dispatch.
- Embedding jobs retain content-hash dedupe and debounce. Unchanged content is not re-embedded.
- Long conversation history remains bounded. Current canon is retrieved afresh rather than copied forward as accumulating prompt memory.
- Actual provider/model/token/cost metadata is recorded server-side; public UI uses credits, never unstable raw provider pricing.

## Packet Order

### E5.1 - Profile-Aware Workshop Correctness

**Status: complete 2026-08-04.** The effective profile is server-resolved and enum-validated; default mode ignores browser profile values; first-use/default/override intent is explicit; profile and intent participate in workshop identity; `input_payload.gm_profile` reaches the provider prompt; deterministic output density changes with `prep_style`; Start Blank shares the contract; and commit persists only the intended default or Saga override. Clean migration replay, focused/full pgTAP, script/web suites, TypeScript, production build, and authenticated deterministic browser proof pass. No paid call was made.

Complete the profile and trust boundary before another live scaffold attempt.

- Read the existing GM default and render it in New Saga.
- Distinguish `use_default`, `customize_for_saga`, and explicit `save_as_default` intent.
- Validate locked profile enums server-side.
- Persist first-use/default changes only when intended.
- Freeze the effective profile into `workshop_sessions.gm_profile_snapshot`.
- Include the normalized profile and mode in the workshop idempotency hash and AI run input.
- Make the scaffold prompt consume the effective profile.
- Persist `sagas.gm_profile_override` only for a customized Saga.
- Preserve Start Blank without a provider call and without silently overwriting a returning GM's defaults.
- Revalidate the reviewed scaffold at the commit boundary and retain optimistic version/idempotency protection.

**Done when:** first use, returning defaults, explicit default update, Saga override, Start Blank, invalid/cross-user denial, changed-profile retry conflict, prompt-density variation, zero pre-commit canon writes, and exact commit pass focused/database/browser tests.

### E5.2 - Conversational Workshop and Scaffold Parity

**Approved implementation contract (2026-08-04):** start with one `relic-fast`/1-credit planning task that summarizes notes, flags contradictions, extracts an outline, and creates three-to-five targeted questions. Persist each answer and advance that finite plan deterministically, with no per-message provider call. `Draft it now` separately confirms and dispatches one `relic-deep`/10-credit full scaffold from the frozen conversation. Targeted regeneration is an optional `relic-balanced`/3-credit versioned section proposal. The normal path is therefore 11 credits, disclosed in two steps.

- Implement the bounded 3-5-question creation conversation, hard message limits, `Draft it now`, `Save and leave`, and emerging outline.
- Make Bring Your Notes summarize understood material and ask for clarification when contradictions block a coherent scaffold.
- Reconcile the compact live-safe core scaffold with the richer active requirements through staged section expansion.
- Add per-item/per-section regenerate without replacing unrelated reviewed cards.
- Route active creation/resume through The Loom while preserving the workspace-only pre-Saga boundary.
- Run one newly authorized live scaffold and one separately confirmed deep-entity proof only after all deterministic gates pass.

Implementation order inside E5.2: canonical task/schema/pricing patch; conversational state and private turn receipts; planning-task runtime and deterministic turn advancement; deep-draft dispatch and complete scaffold parity; conversation/review UI and resume; targeted regeneration with stale-version protection; focused/full migration, pgTAP, script, web, TypeScript, build, and authenticated browser proof. Provider-backed smoke remains separately authorized and is not implied by deterministic completion.

**Complete at the deterministic gate (2026-08-04):** the approved two-call 1+10-credit conversation/scaffold path, free stored answer turns, optional 3-credit targeted regeneration, resume/discard, full active scaffold schema, private creation context, existing-World proposal isolation, explicit commit/audit, and post-commit entity/Session embedding enrollment are implemented. Clean migration replay, 916 pgTAP assertions, 83 script/runtime tests, 142 web tests, TypeScript, production build, and the authenticated deterministic browser journey pass. The immediate packet is E6. No paid provider call was made; hosted validation remains behind the separately authorized Phase E gate.

### E6 - Loom Action Kernel

- Add the typed server-owned action registry and versioned action-intent ledger.
- Expand the internal Loom response schema to registered action previews only.
- Add confirmation states, optimistic targets, idempotent receipts, safe failures, and action availability projection.
- Keep privileged implementations out of exposed schemas where practical; public wrappers must explicitly authorize and expose only the required grant.
- Prove unknown actions/fields, browser-supplied scope, stale targets, sibling Sagas, replay mismatch, and provider text cannot execute work.

**Approved E6 implementation contract (2026-08-04):** evolve the existing `guide_action_intents` compatibility ledger instead of creating a parallel Loom action store. The initial active registry contains only `open_record@1.0.0` and `draft_entity@1.0.0`; E7-E10 add capabilities in their owning packets. `answer_saga_question@1.2.0` receives a compact provider-safe manifest and may return an action only as `{name, version, arguments}`. The Edge validator and database materializer independently reject unregistered names/versions, extra fields, invalid argument shapes, outside-evidence source IDs, unsupported entity types, and executable text.

Each materialized intent freezes its contract metadata, authority tier, confirmation policy, effect summary, disclosed cost, bounded arguments, current target/evidence versions, and an optimistic `intent_version`. The browser receives those safe fields and an availability result, never SQL, handler names, arbitrary RPC names, trusted scope, or permissions. `open_record` resolves only an allowlisted current record and remains zero-cost navigation. `draft_entity` requires a second explicit confirmation, current evidence versions, and a fresh 3-credit `draft_entity_from_prompt` preflight; it creates only the existing non-canon pending draft path.

One authenticated review RPC accepts only action ID, expected intent version, decision, and idempotency key. It re-derives owner and Workspace/World/Saga scope from the locked intent, rechecks contract/activity/target/evidence versions, and writes a private receipt before dispatching any downstream task. Exact replay returns the same receipt/run; changed input under one key fails; stale or denied actions have zero provider/canon effects. Dismissal is also receipted and free. Provider prose that merely describes a mutation never creates or executes an intent.

Implementation order inside E6: canonical registry/schema/cost/UX patch; action registry and ledger migration; provider manifest plus `answer_saga_question@1.2.0` validation; database materialization and availability projection; optimistic review/receipt RPC; Loom naming/action cards; focused adversarial tests; clean migration, full suites, production build, fresh-restart browser proof, and packet closeout. No paid provider call is implied.

**Complete at the deterministic gate (2026-08-04):** the initial two-contract registry, provider-safe manifest, dual Edge/database validation, frozen intent metadata/evidence versions, derived-scope optimistic review RPC, private receipts, current-evidence recheck, exact 0/3-credit disclosure, and non-canon draft dispatch are implemented. The downstream draft run reuses the originating turn's immutable evidence through the action receipt instead of widening retrieval. Unknown versions/fields, unsupported targets, browser-forged scope, changed idempotency payloads, stale evidence, sibling access, quota failure, forged evidence linkage, and prose-only suggestions have zero product effects. Clean replay, 937 pgTAP assertions, 84 script/runtime tests, 142 web tests, TypeScript, production build, the four-viewport authenticated action journey, and a second fresh-app-process persistence proof pass. No paid provider call was made. The immediate packet is E7.

### E7 - Adaptive Retrieval and Read Tools

- Add deterministic target resolution, structured record/relationship/Thread/Session reads, and graph-neighborhood expansion.
- Register open/list/show-source/explain-provenance/navigation actions.
- Avoid query embeddings for explicit deterministic reads; preserve hybrid/lexical fallback for semantic questions.
- Measure exact, structured, lexical, hybrid, stale-vector, missing-vector, and sibling-Saga behavior.

**Approved E7 implementation contract (2026-08-04):** add one server-owned planner before quota preflight with exactly five strategies: `deterministic_read`, `exact`, `structured`, `lexical`, and `hybrid`. Recognized open/list/source/provenance/navigation plus relationship, Thread-objective, and Session read commands are recomputed and completed inside the database with no AI task run, query embedding, usage event, canon/draft/audit write, or embedding enqueue. Duplicate exact names return bounded choices; the server never guesses. Exact targets may assemble current source-backed record evidence plus at most eight one-hop neighbors and twenty total sources. This one-hop neighborhood is not the deferred V1 multi-hop graph traversal.

Register `list_records@1.0.0`, `show_source@1.0.0`, `explain_provenance@1.0.0`, and `navigate_surface@1.0.0` beside `open_record@1.0.0`; all are `read_navigation`, confirmation-free, deterministic, and zero-credit. Expand `open_record` to route Library records, Threads, and Sessions through one shared route resolver and repair the E6 `/entities/thread/...` carry-forward defect. Store only bounded display-safe result snapshots and retrieval trace metadata. Structured rows without an authorized `sources` identity may be shown directly but never enter provider context. `answer_saga_question@1.3.0` runs only when synthesis remains necessary, using exact/structured/lexical frozen evidence without a query embedding when possible and hybrid retrieval only for semantic recall.

Implementation order inside E7: canonical retrieval/action/cost/UX patch; shared route repair; scoped record/source/provenance/one-hop read projection; deterministic planner and direct-turn persistence; expanded action registry plus dual validation; Edge routing that skips quota/provider/embedding for deterministic reads; exact/lexical/hybrid evidence selection; focused adversarial and retrieval-eval tests; clean migration, full suites, production build, four-viewport deterministic browser proof, fresh-process recovery, and packet closeout. No paid provider call is implied.

**Complete at the deterministic gate (2026-08-04):** the five-strategy server planner, six-action registry, zero-credit deterministic turn path, exact/structured/lexical provider paths without query embeddings, semantic-only hybrid path, bounded display-safe record/source/provenance snapshots, and shared Library/Thread/Session route resolver are implemented. Exact current-name targeting, one-hop evidence expansion, Thread objectives, Session lifecycle routing, sibling-Saga denial, missing provenance, stable replay, and the absence of AI-run, usage, embedding, draft, audit, or canon side effects on direct reads are covered. Clean replay, 958 pgTAP assertions, 84 script/runtime tests, 144 web tests, TypeScript, production build, and an authenticated four-viewport deterministic browser journey pass. No paid provider call was made. The immediate packet is E8.

### E8 - Knowledge Creation and Canon Proposal Tools

- Register entity/Note/Thread creation drafts and field-level update drafts.
- Register relationship add/remove and Thread state/objective actions with explicit effect review.
- Reuse existing scoped RPCs and Approval Queue commits; do not create parallel write semantics.
- Ensure approved content enqueues one current embedding identity and rejected/dismissed output enqueues none.

### E9 - Workflow Tools

- Expose Session creation/navigation, Prep tasks and reviewed application, Quick Stub/NPC drafting, post-session status/retry, Approval Queue navigation, and active workshop resume.
- Keep Stage live restrictions and manual fallbacks intact.
- Show credit estimates before separately metered creative tasks and never charge confirmation twice.

### E10 - Destructive Actions, Bounded Plans, and Phase Gate

- Add archive/restore action cards with explicit confirmation.
- Permit hard-delete preparation only; execute exclusively through the existing exact-name/two-confirmation boundary.
- Keep Saga deletion outside ordinary Loom plans.
- Add bounded multi-action plans with a fixed maximum, explicit dependency/effect list, and stop-on-conflict semantics.
- Run the complete deterministic, database, build, browser, retrieval, accessibility, cost, and authorized provider milestone.

## Required Verification at Every Packet

Checkpoint A:

- Schema/runtime source tests reject unknown actions, fields, citations, and scope substitutions.
- pgTAP proves Workspace/World/Saga isolation, expected-version conflicts, idempotency, and exact write/audit effects.
- Quota/provider/retrieval failure preserves the GM message and manual path.
- No provider output can directly call SQL/RPC or write canon.

Checkpoint B:

- Authenticated browser flow exercises one successful action and one recovery/conflict path.
- Refresh and fresh-server restart preserve the conversation and pending action state.
- Four target viewports have no horizontal overflow or action-card focus loss.
- Provider/network calls are counted; deterministic runs prove zero billable work.

Phase E cannot close until E5.1-E10 pass a clean migration replay, full relevant suites, production build, combined Loom workflow, retrieval evaluation, safe telemetry scan, and the separately authorized hosted task-family gate.

## Explicit Deferrals

- Autonomous canon editing or unattended provider loops.
- Cross-Saga default retrieval or mutation.
- World-canon promotion and conflict resolution.
- Rulebook/PDF RAG, system-derived schemas, BYOK, local models, image generation, and plugin/marketplace actions.
- Proactive live-Stage suggestions.
- Saga deletion inside multi-action Loom plans.

Back to [[40 - MVP Implementation Planning Sequence]].
