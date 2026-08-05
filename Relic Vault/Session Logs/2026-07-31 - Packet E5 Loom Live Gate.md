---
status: active
scope: session-log
date: 2026-07-31
packet: E5
---

# Packet E5 Loom Live Gate

## Accomplished

- Replaced the disabled New Saga AI cards with Build with the Loom and Bring your notes entry paths while preserving Start Blank.
- Added a recoverable workspace-only `workshop_sessions` job/evidence boundary that works before a World or Saga exists, freezes the GM input and only eligible World canon, and deduplicates exact submission.
- Added strict `scaffold_saga@1.1.0` and `draft_entity_from_prompt@1.1.0` validation plus deterministic cited fixtures and prompt-injection rejection.
- Added background status recovery, source disclosure, editable premise/entities/lore/Session 1 material, remove/restore semantics, optimistic save, refresh/restart recovery, and a stable post-commit receipt.
- Added one explicit optimistic `commit_saga_workshop` transaction. It creates the hierarchy, selected entities/relationships, Session 1 packet, approved synthetic drafts, sources, and canon audit exactly once. Generation and review perform zero canon, Thread, entity, Session, or Prep writes.

## Changed scope

- Active vault: entity/canon schema, architecture, retrieval, AI registry, pricing, and First Run UX.
- Database/runtime: E5 migration, AI contracts/provider/schema/runner, RPC access catalog, and RPC boundary documentation.
- Web: New Saga entry, recoverable review route/component, server actions/data types, and responsive styles.
- Verification: focused schema test, 21-assertion pgTAP contract, and authenticated four-viewport browser flow.

## Verification

- Clean migration replay: passed.
- Access-control plus E5 pgTAP: 28/28 passed after a clean replay (7 access-boundary assertions and 21 workshop assertions).
- Repository verification: passed (`RELIC_REPO_VERIFY_OK`).
- Script/runtime suite: 80/80 passed, including the E5 strict schema/provider fixtures.
- Web TypeScript lint: passed after final hardening.
- Full web suite: 29 files / 138 tests passed after final hardening.
- Production web build: passed after final hardening.
- Deterministic authenticated E5 browser: passed. It verified zero pre-confirmation writes, source keyboard/focus behavior, GM edit/removal, refresh recovery, no overflow at 1440×900, 1024×768, 768×1024, and 390×844, one explicit commit, three selected canon records, one Session, three audit rows, and one usage event.

## Live provider evidence

- Gate: local app/database, development LiteLLM proxy, `relic-deep`, synthetic Glass Orchard fixture, one logical run, maximum initial plus one repair, USD $0.35 ceiling, declared cleanup/rollback.
- Outcome: the provider was reached once logically. The initial response and the one allowed schema repair did not satisfy strict validation; the run terminated with `validation_failed`, `attempts=1`, and `repair_attempts=1`.
- Safety: no provider checkpoint, usage event, Saga, entity, relationship, Session, Prep, source, draft, or canon audit row survived. The synthetic workspace/user were deleted and the live helper was stopped.
- Defects found and fixed: the Edge Supabase client does not support chaining `.catch` directly from `rpc(...)` on this path; the failure writer now uses guarded awaits. The deep default output budget increased from 1,800 to 4,000 tokens and the scaffold prompt now requests exactly four concise entities, bounded relationships, and three checklist items.

## Remaining risks and next gate

- E5 is not complete until a newly authorized live rerun proves a valid cited scaffold, resolved model/provider provenance, reported cost, one meter event, explicit edit/commit, and cleanup.
- The prior allowance is exhausted; exact retry cannot be used because no validated provider checkpoint exists.
- Per-item provider regenerate remains deferred until the base live scaffold passes. Edit/remove/review and full manual Start Blank remain complete.
- After live scaffold proof, exercise the separate `draft_entity_from_prompt@1.1.0` deep-entity route into a pending Approval Queue draft; it must not publish canon automatically.
