---
status: active
authority: support
scope: operations
read_after:
  - "[[50 - Session Log Index]]"
depends_on:
  - "[[21 - Tech Architecture]]"
  - "[[22 - Memory and Retrieval]]"
  - "[[23 - AI Task Registry]]"
  - "[[30 - Sanctum UX Flow]]"
---

# 2026-07-23 — Relic Guide Conversational Foundation

## Accomplished

- Replaced the search-shaped `/guide` placeholder with persistent GM-owned, Saga-scoped conversation threads.
- Registered `answer_saga_question@1.1.0` with strict `grounded_answer`, `creative_proposal`, `grounded_proposal`, `guidance`, `action_preview`, and `no_answer` treatment.
- Locked paragraph-level citations to immutable server-generated source/version snapshots. Conversation history is bounded interpretation context and cannot be cited or become canon.
- Added safe quota, provider, network, retrieval-fallback, terminal, retry, supersession, refresh, and manual-search behavior.
- Limited E3 actions to navigation-only `open_record` and separately confirmed `draft_entity`; preview and dismissal have no writes, and confirmation invokes the existing metered draft/Approval Queue path.
- Preserved unapproved Import Inbox exclusion, sibling-Saga/tenant isolation, zero automatic canon writes, and C4 frozen/current evidence drift.

## Implementation

- Added migration `20260723153004_relic_guide_conversation_e3.sql`.
- Added `guide-submit`, shared runtime evidence loading/completion, strict Guide validation, deterministic fixtures, server actions/loaders, conversation components, responsive styles, and the real Guide route.
- Added focused schema, security-action, source, pgTAP, component, and authenticated browser coverage.
- Updated `PLAN.md`, `docs/MVP_GAP_ANALYSIS.md`, `docs/E3_HOSTED_READINESS.md`, and owning Vault architecture, retrieval, registry, UX, UI, pricing, navigation, security, contradiction, and source-map notes.

## Verification

- Clean `supabase db reset` migration replay.
- Full `supabase test db`: 29 files and 801 assertions passed, including 21 focused E3 assertions.
- Guide schema/runtime source assertions: 23 passed.
- Web suite: 28 files and 130 tests passed.
- TypeScript, production build, and repository verification passed.
- E1 retrieval evaluation passed with recall@5 1.00, MRR 0.96, zero isolation failures, and 52.479 ms database p95.
- Authenticated deterministic browser proof passed at 1440×900, 1024×768, 768×1024, and 390×844 with no horizontal overflow.
- Real composer → server action → hybrid retrieval → shared runner → validated answer persisted and recovered after refresh.
- Explicit draft confirmation created one pending reviewed draft; preview created zero.
- Safe post-reset telemetry showed deterministic AI/embedding providers only, zero repair, and non-billable delivery.

## Provider incident

The first local Edge harness inherited live provider configuration from its `--env-file`; process-level overrides did not replace those values. Four synthetic LiteLLM requests occurred before detection: one query embedding, one entity draft, and a Guide answer plus bounded repair. No private campaign data or production environment was involved. The successful draft recorded 315 input/227 output tokens and three local credits; the failed Guide result recorded zero credits; monetary cost was unavailable.

The harness was stopped and replaced with an authoritative temporary environment that defaults AI, embedding, and transcription to deterministic modes and omits all live provider endpoints and credentials. A clean-reset rerun passed with only deterministic, non-billable telemetry. See [[45 - Security Findings Register]] `SEC-E3-001`.

## Open follow-ups

- E3 remains functionally complete but environment-gated.
- Obtain explicit Decision Stop 4 authorization, an isolated least-privilege staging proxy/key, concrete resolved-model evidence, and a hard-coded fixture-only smoke harness.
- Do not reuse the E2 allowance or temporary broad proxy exception without exact authorization.
- Do not begin E4 until the E3 hosted gate passes.

Back to [[50 - Session Log Index]].
