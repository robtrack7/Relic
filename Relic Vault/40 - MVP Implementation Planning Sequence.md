---
status: active
authority: secondary
scope: planning
read_after:
  - "[[00 - Start Here]]"
depends_on:
  - "[[02 - Source Map]]"
  - "[[23 - AI Task Registry]]"
  - "[[22 - Memory and Retrieval]]"
supersedes: []
last_audited: 2026-05-20
source_file: "Relic Vault/40 - MVP Implementation Planning Sequence.md"
---

# MVP Implementation Planning Sequence

This note is the Codex planning router after the AI Task Registry v1.0 standalone rewrite. It does not replace the active specs; it orders implementation planning so Codex does not plan AI wiring before the shared foundations are stable.

## Readiness Gate

Relic is conditionally ready for implementation planning. The next plans must be executed in this order:

1. [[44 - Repo Bootstrap and GitHub Setup Plan]]
2. [[41 - Foundation Implementation Plan]]
3. [[42 - UI Manual Flow Implementation Plan]]
4. [[43 - AI Runtime Implementation Plan]]

Do not code directly from this router. Use it to select the correct detailed plan and then read the owning active specs.

## Phase 1 Complete

The registry source gap is closed by [[23 - AI Task Registry]] v1.0:

- Base task contracts are present for `scaffold_saga`, `draft_entity_from_prompt`, `generate_session_prep`, `compose_prep_briefing`, and `synthesize_session`.
- Creative task additions remain present: `propose_scene_beats`, `propose_thread_complication`, `propose_npc_for_scene`, `answer_saga_question`, and `propose_quick_stub_fleshing`.
- [[22 - Memory and Retrieval]] maps every registry task to a retrieval profile or `none`.

## Planning Order

### 1. Foundation

After the repository bootstrap in [[44 - Repo Bootstrap and GitHub Setup Plan]], plan schema, RLS, storage, usage metering, auth/bootstrap, retrieval infrastructure, quota preflight, and non-AI async mechanisms first. This creates the data and security base that every UI and AI surface depends on.

### 2. UI and Manual Flow

Plan the playable loop without live AI wiring: design tokens, the literary/modern/relaxing Sanctum surface, Start Blank, manual entity CRUD, Threads, read-only Thread Timeline, manual session prep, Ready for Stage, clean/focused Stage surface, capture/stubs/dice, and Approval Queue shell. Build this full loop in the web app first; mobile follows after the web loop is stable.

AI-dependent surfaces should be mocked, disabled, or implemented as manual fallbacks until [[43 - AI Runtime Implementation Plan]] is accepted.

### 3. AI Runtime

Plan AI task orchestration only after the foundation and manual loop plans are accepted. This phase wires task routing, JSON validation, quota charging, prompt logging, retrieval assembly, source validation, and draft creation.

## Validation Matrix

Every implementation plan must include acceptance scenarios for:

- New GM uses Start Blank without AI.
- New GM uses Build with AI after AI runtime acceptance.
- Existing GM creates a Saga in an existing World.
- Prep briefing loads canon-only and does not expose pending drafts.
- `generate_session_prep` suggestions accept into session working state.
- Stage in progress triggers no background AI.
- Post-session synthesis creates only drafts, never direct canon.
- Stub fleshing requires transcript evidence and routes through approval.
- Ask returns citations or `no_answer=true`.
- Quota-blocked states preserve manual fallback.
- RLS excludes sibling Sagas and other Workspaces.

## Spec-Edit Checks

After any future spec edit, run:

- Obsidian link check against all files in `Relic Vault`.
- Stale terminology scan for user-facing `Campaign`, `Workshop`, `Studio`, branded `Saga Creation`, and retired prep tokens.
- Version-reference scan for active references to superseded specs.
- Registry completeness check for task sections and required contract headings.
- Memory-profile check for every Registry task.
