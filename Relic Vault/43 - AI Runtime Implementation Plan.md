---
status: active
authority: secondary
scope: planning
read_after:
  - "[[40 - MVP Implementation Planning Sequence]]"
depends_on:
  - "[[23 - AI Task Registry]]"
  - "[[22 - Memory and Retrieval]]"
  - "[[21 - Tech Architecture]]"
  - "[[24 - Approval Queue]]"
  - "[[25 - Pricing and Rate Limits]]"
supersedes: []
last_audited: 2026-05-20
source_file: "Relic Vault/43 - AI Runtime Implementation Plan.md"
---

# AI Runtime Implementation Plan

## Goal

Wire the AI runtime after foundation and manual UI plans are accepted, using [[23 - AI Task Registry]] v1.0 as the task contract source.

## Build Against

- [[23 - AI Task Registry]]
- [[22 - Memory and Retrieval]]
- [[21 - Tech Architecture]]
- [[24 - Approval Queue]]
- [[25 - Pricing and Rate Limits]]

## Shared Runtime

- Implement backend task router keyed by registry task name and prompt version.
- Resolve model tier to configured provider/model through LiteLLM; never expose model selection in MVP UI.
- Run quota preflight before every AI task and charge only according to the Pricing spec.
- Assemble retrieval context through `retrieve_for_task`; never query embeddings directly from app code.
- Validate model JSON against task schemas, run one repair retry, and reject hallucinated source IDs.
- Log task name, prompt version, model tier, resolved model, Workspace/World/Saga IDs, token/cost metadata, validation result, source IDs, and latency.
- Preserve manual fallback for every quota/provider/validation failure.

## Task Families

### New Saga Scaffold

- Wire `scaffold_saga` for Build with AI and Bring your notes.
- Store output in `workshop_sessions.draft_payload`.
- Commit only from scaffold review, writing canon rows, synthetic approved drafts, sources, and audit.

### Entity Creation and Update

- Wire `draft_entity_from_prompt` as the single entity-drafting path.
- Wire `propose_npc_for_scene` as candidate selection only; accepted candidates call `draft_entity_from_prompt`.
- Wire `propose_quick_stub_fleshing` as an update draft requiring transcript evidence and Approval Queue approval.

### Session Prep

- Wire `generate_session_prep` to append `sessions.pending_prep_suggestions`.
- Wire accept/dismiss behavior so accept writes session fields or junction rows, not entity canon.
- Wire `compose_prep_briefing` as the visible auto-running, canon-only, cached briefing.
- Wire `propose_scene_beats` and `propose_thread_complication` as ephemeral cards only.

### Ask and Search

- Wire `answer_saga_question` to `sanctum_qa_grounding`.
- Enforce citations or `no_answer=true`.
- Keep `search_for_ui` as infrastructure search, not a generative AI task.

### Post-Session

- Wire transcription completion into `synthesize_session`.
- Create summary/entity/thread/prep draft artifacts only; never write canon directly.
- Route all draftable outputs through Approval Queue.
- Support rerun behavior without treating pending drafts as canon.

## Required Tests

- Quota preflight blocks new AI calls and preserves manual fallback.
- Source ID validation rejects hallucinated citations.
- `compose_prep_briefing` cannot include pending draft content.
- `answer_saga_question` never renders uncited factual answers.
- `synthesize_session` creates pending drafts and `draft_sources`, not canon rows.
- `propose_quick_stub_fleshing` is unavailable without evidence and clears `is_stub=false` only after approval.
- Stage `in_progress` creates no background AI calls.
- Task logs include prompt version, model tier, resolved model, Workspace/World/Saga IDs, and latency.

## Acceptance

AI runtime planning is complete when every Registry v1.0 task has a route, schema, retrieval profile, quota behavior, validation path, failure state, and test fixture, and no AI path bypasses approval/direct GM write rules.
