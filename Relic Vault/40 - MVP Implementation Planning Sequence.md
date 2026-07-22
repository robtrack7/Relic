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
last_audited: 2026-07-21
source_file: "Relic Vault/40 - MVP Implementation Planning Sequence.md"
---

# MVP Implementation Planning Sequence

This note is the Codex planning router after the AI Task Registry v1.0 standalone rewrite. It does not replace the active specs; it orders implementation planning so Codex does not plan AI wiring before the shared foundations are stable.

## July 2026 delivery update

Foundation and the first manual web spine are now implemented far enough that the older Foundation → manual UI → AI-only sequence is no longer an executable status plan. Use `PLAN.md` as the current small-packet delivery checklist and `docs/MVP_GAP_ANALYSIS.md` as the evidence/status ledger. This note remains the canonical routing authority; detailed product behavior still belongs to the owning active specs.

Current delivery lanes are ordered as follows:

1. Stable Stage interactions and complete offline recovery.
2. Post-session manual evidence, synthesis, source-aware drafts, and Approval Queue trust UI.
3. Remaining manual web lifecycle gaps.
4. Embedding/provider delivery and GM-invoked AI experiences.
5. Settings, export, notifications, accessibility, observability, and complete regression coverage.
6. Explicit mobile release decision, then native parity if it remains an MVP gate.

Every work packet must pass two checkpoints: focused contract/recovery tests first, then the integrated user workflow. Every phase closes with a clean migration replay, full relevant suites, production build, browser/device verification, gap-analysis evidence, and a scoped commit. A red P0 regression blocks the next packet.

## Readiness Gate

Relic is ready for incremental MVP delivery against the current gap audit. Historical detailed plans remain useful inputs:

1. [[44 - Repo Bootstrap and GitHub Setup Plan]]
2. [[41 - Foundation Implementation Plan]]
3. [[42 - UI Manual Flow Implementation Plan]]
4. [[43 - AI Runtime Implementation Plan]]

For current execution, read `docs/MVP_GAP_ANALYSIS.md`, then `PLAN.md`, then the owning active spec/detailed plan for the selected packet. Before provider or backend expansion, use [[46 - Backend Audit and Module Plan]] to distinguish implemented contracts from delivered workers/providers.

Do not code directly from this router. Use it to select the correct detailed plan and then read the owning active specs.

## Current immediate packet

The current packet pointer lives in root `PLAN.md`. D5 paste/text/Markdown intake is complete with `.docx` explicitly deferred behind the trusted extraction boundary, and E1 embedding/re-embedding delivery is complete. The immediate packet is E2 hosted provider and observability. This sequencing note must not retain an older packet as current truth.

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
