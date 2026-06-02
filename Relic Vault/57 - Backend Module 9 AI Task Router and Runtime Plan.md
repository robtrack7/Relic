---
status: active
authority: secondary
scope: planning
read_after:
  - "[[00 - Start Here]]"
  - "[[23 - AI Task Registry]]"
  - "[[43 - AI Runtime Implementation Plan]]"
  - "[[46 - Backend Audit and Module Plan]]"
depends_on:
  - "[[21 - Tech Architecture]]"
  - "[[22 - Memory and Retrieval]]"
  - "[[23 - AI Task Registry]]"
  - "[[24 - Approval Queue]]"
  - "[[25 - Pricing and Rate Limits]]"
  - "[[46 - Backend Audit and Module Plan]]"
  - "[[56 - Backend Module 8 Background Job and Edge Runtime Plan]]"
supersedes: []
last_audited: 2026-06-02
source_file: "Relic Vault/57 - Backend Module 9 AI Task Router and Runtime Plan.md"
---

# Backend Module 9 AI Task Router and Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:test-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the AI task runtime only after retrieval, quota, drafts, and async jobs are trustworthy. Every Registry v1.0 task must have a backend route, prompt version, quota behavior, retrieval profile, validation path, failure state, and test fixture. No AI path may write canon directly.

**Architecture:** Add a registry-backed task router and AI run ledger in Postgres, plus an Edge Function task runner that resolves task contracts, performs quota preflight, gathers retrieval through `retrieve_for_task`, calls the configured provider through LiteLLM, validates JSON output, performs one repair retry, records usage/cost, and writes only the task's allowed output surface. Provider calls must be behind a testable adapter so local tests can exercise validation and write behavior without real provider keys.

**Tech Stack:** Supabase PostgreSQL, pgTAP, Module 4 retrieval RPCs, Module 6 quota/metering, Module 8 worker runtime, Supabase Edge Functions, LiteLLM-compatible provider adapter, Registry v1.0 task schemas.

---

## Current AI Runtime Backend Observed

Verified during Module 9 planning on 2026-06-02:

- [[23 - AI Task Registry]] defines ten MVP AI tasks and universal task rules.
- [[43 - AI Runtime Implementation Plan]] requires quota preflight, retrieval through `retrieve_for_task`, task schemas, one repair retry, source-ID validation, task logs, and manual fallback.
- Module 4 retrieval, Module 6 quota/metering, Module 7 drafts/transcripts/storage contracts, and Module 8 job runtime are implemented.
- Current web UI still labels AI drafting/runtime actions as disabled.
- There is no AI task run ledger, task registry table/function, task router Edge Function, provider adapter, task schema catalog, or AI output writer.

## Registry Tasks

Module 9 owns backend runtime routes for:

- `scaffold_saga`
- `draft_entity_from_prompt`
- `generate_session_prep`
- `compose_prep_briefing`
- `synthesize_session`
- `propose_scene_beats`
- `propose_thread_complication`
- `propose_npc_for_scene`
- `answer_saga_question`
- `propose_quick_stub_fleshing`

## Files

- Create: `supabase/tests/ai_task_runtime.sql`
- Create: `supabase/migrations/<timestamp>_ai_task_runtime.sql`
- Create: `supabase/functions/ai-task-runner/index.ts`
- Create/update: `supabase/functions/_shared/ai-*.ts`
- Create/update: script tests for task registry source safety.
- Modify: `supabase/tests/access_control.sql`
- Modify: `supabase/security/rpc-boundary.md`
- Modify: `Relic Vault/46 - Backend Audit and Module Plan.md`
- Modify: `Relic Vault/02 - Source Map.md`
- Modify: `Relic Vault/04 - Final Contradiction Pass.md`

## Task 1: Add Failing AI Runtime Tests

**Files:**

- Create: `supabase/tests/ai_task_runtime.sql`
- Create/update script tests if needed.

- [ ] **Step 1: Prove registry completeness**

Assert all ten Registry v1.0 task names exist with prompt version, quota tier, model tier, retrieval profile, source policy, output mode, and active status.

- [ ] **Step 2: Prove quota preflight and manual fallback**

Assert AI task preflight blocks quota-exhausted work without blocking manual edit/approval flows.

- [ ] **Step 3: Prove source validation**

Assert task output source IDs must come from retrieved source IDs or task input source IDs, and hallucinated source IDs fail validation.

- [ ] **Step 4: Prove output write boundaries**

Assert:

- `compose_prep_briefing` writes only `sessions.prep_briefing`.
- `generate_session_prep` appends `sessions.pending_prep_suggestions` and creates no drafts.
- `draft_entity_from_prompt` creates pending draft rows and draft sources only.
- `synthesize_session` creates pending drafts and review artifacts only.
- Ephemeral tasks store output in the run ledger and do not write canon/drafts unless accepted later through another path.

- [ ] **Step 5: Prove task logs and failure states**

Assert task runs record prompt version, model tier, resolved model, scope IDs, latency, usage event linkage, validation state, failure reason, and retry count.

## Task 2: Implement Registry and Run Ledger

**Files:**

- Create: `supabase/migrations/<timestamp>_ai_task_runtime.sql`

- [ ] **Step 1: Add task registry table/function**

Create `internal.ai_task_registry` seed data or a stable `internal.ai_task_contracts()` function for all Registry v1.0 tasks.

- [ ] **Step 2: Add task run ledger**

Create `internal.ai_task_runs` with Workspace / World / Saga / Session scope, task name, prompt version, model tier, resolved model, retrieval profile, quota tier, status, attempts, latency, source IDs, usage event id, output JSON, validation errors, and sanitized failure reason.

- [ ] **Step 3: Add browser-callable task preflight RPC**

Create `public.preflight_ai_task(...)` to validate scope, load the contract, call `check_quota_preflight`, and return allowed/severity plus manual fallback messaging.

## Task 3: Implement Validation Contracts

**Files:**

- Modify in migration and shared Edge files.

- [ ] **Step 1: Add JSON schema catalog**

Represent task schemas in Edge runtime source with task-specific validators. Keep the first version deliberately strict and small enough to maintain.

- [ ] **Step 2: Add source ID validator**

Validate that every returned source ID exists in the allowed source set from retrieval or task input. Reject hallucinated source IDs before writing any output.

- [ ] **Step 3: Add one repair retry**

On parse/schema/source validation failure, run one repair attempt with original output, schema errors, and allowed source IDs. If repair fails, mark run failed and preserve manual fallback.

## Task 4: Implement Output Writers

**Files:**

- Modify in migration and Edge runtime.

- [ ] **Step 1: Prep outputs**

Implement `compose_prep_briefing` and `generate_session_prep` writers. `compose_prep_briefing` must use canon-only retrieval and reject pending draft content.

- [ ] **Step 2: Draft outputs**

Implement draft creation for `draft_entity_from_prompt`, `propose_quick_stub_fleshing`, and `synthesize_session` with `draft_sources` and no direct canon mutation.

- [ ] **Step 3: Ephemeral outputs**

Implement ledger-only outputs for `propose_scene_beats`, `propose_thread_complication`, `propose_npc_for_scene`, and `answer_saga_question`. `answer_saga_question` must return `no_answer=true` unless factual answers have citations.

- [ ] **Step 4: Scaffold output**

Store `scaffold_saga` output in `workshop_sessions.draft_payload`; commit remains a separate reviewed action.

## Task 5: Implement Edge Task Runner

**Files:**

- Create: `supabase/functions/ai-task-runner/index.ts`
- Create/update: `supabase/functions/_shared/ai-*.ts`

- [ ] **Step 1: Internal auth and scoped user context**

Use Module 8 internal auth and scoped JWT helpers. Browser-triggered calls must create a run row, then worker execution uses scoped user identity for user-data reads/writes.

- [ ] **Step 2: Retrieval and context assembly**

Call `retrieve_for_task` only through the registered retrieval profile. Do not query embeddings directly from Edge code.

- [ ] **Step 3: LiteLLM provider adapter**

Route through configured LiteLLM endpoint and model tier names. Never expose provider/model choice to users. Add a deterministic test adapter for local validation.

- [ ] **Step 4: Usage metering**

Record AI usage events with prompt version, task name, provider/model metadata, token/cost estimates, and `user_charge=false` on failed provider calls without usable output.

## Task 6: Verify Module 9

**Files:**

- Modify: vault status notes

- [ ] **Step 1: Run focused SQL tests**

Run:

```powershell
npm run test:supabase
```

- [ ] **Step 2: Run script/source tests**

Run:

```powershell
npm run test:scripts
npm run verify
```

- [ ] **Step 3: Run web tests**

Run:

```powershell
npx pnpm@10.11.0 --filter @relic/web test
```

- [ ] **Step 4: Run full backend baseline**

Run:

```powershell
npm run backend:baseline:reset
```

- [ ] **Step 5: Update vault status**

Record passing verification in this plan and [[46 - Backend Audit and Module Plan]].

## Done Criteria

- Every Registry v1.0 task has a backend route, schema, quota behavior, retrieval profile, validation path, failure state, and tests.
- AI calls never write canon directly.
- `compose_prep_briefing` uses hard canon-only retrieval and cannot include pending drafts.
- `synthesize_session` creates drafts/review artifacts only.
- Hallucinated source IDs are rejected before any output write.
- One repair retry exists for parse/schema/source failures.
- Task logs include prompt version, model tier, resolved model, Workspace / World / Saga IDs, source IDs, usage/cost metadata, validation result, and latency.
- Manual fallback remains available for quota, provider, and validation failures.
- `npm run backend:baseline:reset` passes.
