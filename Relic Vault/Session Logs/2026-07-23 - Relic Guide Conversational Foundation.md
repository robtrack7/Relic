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
- Final closeout rerun: 63 script/runtime tests, 29 pgTAP files / 801 assertions, 28 web files / 130 tests, TypeScript lint, production build, repository verification, diff checks, and touched-vault link/stale/version checks passed.
- Final staging audit: `hybrid-search` and `ai-task-runner` gateway JWT verification restored, both dispatch schedules active, AI/embedding queues empty, synthetic fixture/provider-event residue zero, and no temporary Fly app remaining.

## Provider incident

The first local Edge harness inherited live provider configuration from its `--env-file`; process-level overrides did not replace those values. Four synthetic LiteLLM requests occurred before detection: one query embedding, one entity draft, and a Guide answer plus bounded repair. No private campaign data or production environment was involved. The successful draft recorded 315 input/227 output tokens and three local credits; the failed Guide result recorded zero credits; monetary cost was unavailable.

The harness was stopped and replaced with an authoritative temporary environment that defaults AI, embedding, and transcription to deterministic modes and omits all live provider endpoints and credentials. A clean-reset rerun passed with only deterministic, non-billable telemetry. See [[45 - Security Findings Register]] `SEC-E3-001`.

## Open follow-ups

- E3 remains functionally complete but environment-gated.
- Decision Stop 4 is authorized for several synthetic calls under a hard cumulative USD $0.50 ceiling. The fixture-only harness, isolated temporary proxy, attempt/budget guards, and restoration path are implemented.
- The zero-inference staging preflight passed scoped auth/RLS, source eligibility/exclusion, zero-provider-work, and full cleanup.
- The isolated proxy using the restricted local key failed closed at turn one; a payload-free probe confirmed OpenAI `401 missing_scope`.
- The user explicitly approved existing E2 proxy reuse. Payload-free alias inspection confirmed `relic-balanced`, `relic-deep`, and `relic-embed`; Terra returned real synthetic completions.
- Diagnostics preserved strict validation while correcting flat typed-block prompting, verbatim single-citation copying, payload-free validation categories, and the real missing source-ID bridge from scoped entity search results to eligible existing source records.
- The user reported USD $0.07 platform usage, leaving USD $0.43 under the approved ceiling. The corrected final existing-proxy rerun was explicitly approved but rejected by the current execution policy before mutation or provider work.
- Rerun `scripts/invoke-e3-hosted-smoke.ps1 -Execute -UseExistingProxy` when execution approval is available.
- All attempts restored the original provider, both schedules, gateway JWT verification, synthetic database state, and temporary Fly resources.
- Do not begin E4 until the E3 hosted gate passes.

Back to [[50 - Session Log Index]].
