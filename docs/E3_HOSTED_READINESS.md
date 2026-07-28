# E3 Hosted Guide Readiness

Status: **complete — hosted Guide gate passed 2026-07-28**

Packet E3 passed its required hosted proof. Guide uses the registered task profile plus a conservative natural-language fallback. The zero-provider staging preflight proved two scoped retrieval results and two entity-backed frozen evidence items. The final authorized existing-proxy run then proved the complete conversational, metering, isolation, privacy, replay, canon-safety, restoration, and cleanup contract.

## Proposed smoke

1. **Environment and project:** synthetic-only `relic-staging`; never production.
2. **Proxy and alias:** `relic-balanced` for `answer_saga_question` and `relic-embed` for query retrieval. Existing E2 proxy reuse requires explicit authorization.
3. **Expected resolved models:** the staging operator must name and verify the concrete model behind `relic-balanced`; `relic-embed` must resolve to `text-embedding-3-small` at 1536 dimensions. An alias-only response is insufficient evidence.
4. **Synthetic classification:** one invented Saga, one eligible World record, one current-Saga record, one sibling-Saga exclusion, one unapproved import exclusion, and one fictional continuity question. No user campaign content.
5. **Maximum attempts:** three query-embedding requests and at most six AI provider requests across three conversational turns, including registry-permitted repairs. Stop immediately when a known run reaches an unexpected terminal state.
6. **Cost ceiling:** fresh authorized cumulative packet ceiling USD $1.00. If a temporary isolated proxy is required, it is capped at USD $0.99; the required `-UseExistingProxy` run retains the same packet ceiling while using the already-running proxy.
7. **Isolation prerequisite:** a separately rotatable least-privilege staging proxy/key must exist, or the user must explicitly approve the exact temporary exception after reviewing its risk.
8. **Credential prerequisite:** the temporary broad E2 key remains an accepted risk and should be restricted or rotated. No credential values enter commands, logs, chat, fixtures, or commits.
9. **Command:** `npx pnpm@10.11.0 e3:smoke:hosted` prints a non-mutating preflight. `scripts/invoke-e3-hosted-smoke.ps1 -ValidateFixture` performs the zero-inference staging fixture/auth/RLS proof. `scripts/invoke-e3-hosted-smoke.ps1 -Execute -UseExistingProxy` is the existing-proxy path and enforces the fixture ID, attempt limits, observed-cost ceiling, temporary scheduler pause, temporary gateway-JWT setting, restoration, and cleanup.
10. **Cleanup:** disable the fixture-specific runner, delete synthetic Workspace data, verify queues/alerts are clear, and retain only payload-free telemetry and usage evidence.
11. **Evidence:** route submission, immutable allowlist, resolved concrete model, cited answer or `no_answer`, keyboard-openable source context, exactly-once usage, exact replay with no additional provider call, sibling/import exclusion, safe-log scan, and zero automatic canon writes.

## Local proof complete

- Clean migration replay and 30 focused Guide pgTAP assertions.
- Strict Guide schema and Edge source suites pass.
- Full web tests, TypeScript, production build, and repository verification pass.
- Authenticated browser proof exercises the real route, server action, hybrid retrieval, shared AI runtime, citation context, insufficiency, explicit draft confirmation, refresh recovery, and 1440×900, 1024×768, 768×1024, and 390×844 layouts.
- Post-reset safe telemetry identifies only `deterministic-test` AI and `deterministic-development-test` embeddings; both AI runs are non-billable and require zero repair calls.
- The removable staging demo is installed under one verified, confirmed staging account. Status proves one marker-owned Workspace, one World, two Sagas, eight content records, nine sources, eight complete embedding jobs, and eight current vectors. It retains zero AI runs or drafts. Real-vector creation remained a separate explicit bounded action.

## Local-provider incident

Before the helper was hardened, its `--env-file` retained live provider configuration despite process-level deterministic overrides. Four synthetic LiteLLM requests occurred: one embedding, one entity draft, and one Guide answer plus its bounded repair. No private data or production system was involved. The successful draft recorded 315 input and 227 output tokens and three local credits; the failed Guide result recorded zero user credits. Provider cost fields were unavailable. The helper now defaults to deterministic isolation and strips live credentials from the temporary Edge environment.

## Authorized staging attempt

- The zero-inference fixture preflight passed: scoped JWT issuance, authenticated RLS read, current-Saga/World eligibility, sibling-Saga and unapproved-import sentinels, zero AI runs/provider events, and complete cleanup.
- The first execution exposed and fixed the linked-login `cron.job` mutation boundary by using `cron.alter_job`.
- A second execution exposed and fixed the harness assumption that Guide submission always completes synchronously; exact direct dispatch now uses the same leased run when submission remains pending.
- A third execution exposed the Supabase gateway JWT setting required by internal-token-only functions. The user explicitly approved a temporary staging exception; the wrapper now restores gateway verification afterward.
- The provider-reaching execution stopped at turn one with terminal `provider_rejected`. A payload-free direct metadata/probe isolated the cause as OpenAI `401 missing_scope`; the protected key lacks Chat Completions write permission. No valid completion, usage event, draft, or canon write was produced.
- Every attempt restored the original staging provider, re-enabled both dispatch schedules, destroyed the temporary Fly app, and removed all synthetic rows, queues, AI runs, and provider events.
- The user then explicitly approved reuse of the existing E2 proxy. Its payload-free model list exposes `relic-balanced`, `relic-deep`, and `relic-embed`; Terra returned real synthetic completions.
- Those completions exposed two contract issues without weakening validation: the prompt now requires flat typed blocks and verbatim single-source citation IDs, and `guide-submit` now resolves scoped entity search hits to eligible existing source records before freezing the Guide allowlist. Validation failures now return payload-free categories.
- The user reported USD $0.07 total platform usage, leaving USD $0.43 under the approved packet ceiling. The next hosted command was explicitly re-approved but rejected by the current execution-approval policy before any mutation or provider call.
- On 2026-07-28 the execution policy permitted the existing-proxy command. The first run stopped safely at turn one with `validation_failed` / `insufficiency_reason_required`; the provider prompt now states that the reason is required exactly for `no_answer=true`, supplies the allowlisted values and a valid full object, and instructs repair calls to correct every listed validation error.
- The bounded rerun completed three persistent Guide turns, recovered the three-turn authenticated thread, and passed exact replay without additional guarded provider or usage work. It then stopped before final evidence validation because `get_guide_source_context` returned no usable authenticated citation context for turn one.
- After each 2026-07-28 attempt, read-only hosted audits confirmed both dispatch schedules active, zero synthetic Workspace rows, zero AI runs, zero provider events, zero embedding jobs, and configured gateway JWT states restored: enabled for `hybrid-search` and `ai-task-runner`, disabled for `guide-submit` per `supabase/config.toml`.
- Deterministic diagnosis proved the fixture records existed but their record-embedding jobs were deferred. PostgreSQL parsed the grounded question as `amber & warden & guard & place`; neither record satisfied all four terms, so strict lexical retrieval also returned nothing.
- Guide now sends `task_profile=answer_saga_question`, uses `sanctum_qa_grounding`, and invokes an authenticated relaxed fallback only when the strict hybrid task surface returns no rows. One- and two-lexeme searches remain all-terms; longer natural questions require half the normalized lexemes; quotes, negation, and explicit `OR` never relax.
- The repaired zero-provider hosted preflight returned exactly the eligible current-Saga and World sources, excluded sibling/import sentinels, made no provider calls, and reported zero cleanup residue.
- The next bounded paid run completed three Guide runs and one separately confirmed draft run. Before cleanup, payload-free diagnostics proved three 1-credit Guide events, one 3-credit draft event, one pending draft, zero canon writes, and zero unsafe telemetry keys. Authenticated citation context and exact replay had already passed.
- Final evidence collection failed because the hosted PostgreSQL version does not provide `jsonb_object_length`. The first cleanup attempt then exposed two dependency-order gaps introduced by frozen evidence and the confirmed draft. The collector now uses a direct non-empty JSON comparison; cleanup deletes frozen evidence before sources and public draft/action rows before internal draft batches.
- Manual recovery targeted only the fixed synthetic IDs. Final hosted audit proved zero Workspace/auth/run/job/evidence/telemetry residue, both schedules active, and function JWT settings restored. A repeated zero-provider preflight also passed the corrected automated cleanup.
- Under a fresh USD $1 authorization, the next paid packet again completed far enough to collect response shapes but stopped safely because the first turn was conservative `no_answer` rather than a cited paragraph. The exact cause was the fixture's generic non-empty `raw_excerpt`, which `internal.guide_source_text` correctly preferred over the linked Character/Place text.
- The fixture now stores empty excerpt sentinels for entity-backed sources. The strengthened zero-provider preflight creates a Guide task/evidence snapshot and proves both the Amber Warden/Archive and Archive/location facts were frozen, with two sources, zero provider calls, and zero cleanup residue.
- A read-only post-failure audit confirmed zero synthetic Workspace/auth residue, both schedules active, and gateway JWT settings restored (`hybrid-search` and `ai-task-runner` enabled; `guide-submit` disabled per configuration).
- Demo embedding diagnosis exposed a World-scope boundary defect: the worker serialized `saga_id: null`, while `issue-scoped-jwt` accepts an omitted Saga claim or a valid UUID. The scoped client now omits null World scope, classifies scoped-JWT failures separately from provider outages, and the deployed worker completed all eight clean demo vectors.
- The final authorized `-Execute -UseExistingProxy` run returned `E3_HOSTED_GUIDE_SMOKE_OK`. It proved one cited `grounded_answer`, one `creative_proposal` plus `action_preview`, one conservative guidance-only `no_answer`, authenticated thread/source context, and exact logical replay with no additional provider or usage work.
- Three `answer_saga_question` runs each metered exactly 1 credit and one confirmed `draft_entity_from_prompt` run metered exactly 3 credits. All four runs checkpointed one usage event and resolved `relic-balanced` to `gpt-5.6-terra`; three query embeddings resolved to `text-embedding-3-small`.
- Isolation evidence was zero for sibling-Saga, unapproved-import, unexpected-source, and canon-write matches. Telemetry had zero raw payload keys and zero fixture-text matches.
- Automated cleanup reported zero Workspace/auth/run/job/evidence/thread/draft/provider/usage residue. Independent audit confirmed both dispatch schedules active; `hybrid-search` and `ai-task-runner` restored to gateway JWT enabled, while `guide-submit` and `embed-row-dispatch` remained disabled per their explicit internal/server authentication contracts.

## Completion

No E3 hosted gate remains. The final run retained the six-AI/three-query-embedding attempt guards, scheduler pause, temporary function-auth setting, restoration, and dependency-ordered cleanup. Do not begin E4 in this session.
