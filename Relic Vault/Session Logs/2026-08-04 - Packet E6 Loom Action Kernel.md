---
status: complete
authority: secondary
scope: operations
depends_on:
  - "[[59 - Phase E Loom Operating Layer Plan]]"
  - "[[23 - AI Task Registry]]"
  - "[[25 - Pricing and Rate Limits]]"
source_file: "Relic Vault/Session Logs/2026-08-04 - Packet E6 Loom Action Kernel.md"
---

# Packet E6 Loom Action Kernel

## Accomplished

- Replaced E3's hard-coded action output with a server-owned registry containing only `open_record@1.0.0` and `draft_entity@1.0.0`.
- Upgraded `answer_saga_question` to `1.2.0` with a provider-safe manifest and independent Edge/database validation of action name, version, exact arguments, evidence IDs, entity types, and non-executable text.
- Evolved `guide_action_intents` into the versioned compatibility ledger. Every intent freezes authority, confirmation, effect, exact cost, bounded arguments, current target/evidence versions, availability, and optimistic `intent_version`.
- Added one authenticated review RPC accepting only action ID, expected version, decision, and idempotency key. It derives scope, rechecks evidence, writes a private receipt, and dispatches only the existing 3-credit non-canon entity-draft task. Exact retry cannot duplicate work; changed payload reuse, stale evidence, quota block, denial, and dismissal have zero downstream product effects.
- Routed downstream drafting through the originating Loom turn's immutable evidence without reusing the answer run's unique turn identity or widening retrieval.
- Renamed current user-facing Guide copy to The Loom and added action cards with authority, non-canon state, exact 0/3-credit disclosure, effect summary, confirmation, conflict fallback, and persistent outcome state.
- Kept all provider execution deterministic and non-billable. No live or paid provider call was authorized or made.

## Changed

- Active vault/planning sources: `02`, `04`, `21`, `23`, `25`, `30`, `59`, root `PLAN.md`, and `docs/MVP_GAP_ANALYSIS.md`.
- Database/runtime: `20260805025500_packet_e6_loom_action_kernel.sql`, access/runtime/E3 compatibility tests, new E6 pgTAP suite, AI contracts/provider/schema/runner, and hosted E3 smoke compatibility.
- Web: Loom server action, workspace/action-card projection, naming, focused security/component tests, and deterministic two-process browser proof.

## Verification

- Clean migration replay passed with E6 applied from an empty local database.
- `supabase test db`: 937/937 assertions across 33 files.
- `supabase db lint --level error`: clean.
- `node --test scripts/*.test.mjs`: 84/84.
- Web unit suite: 142/142; TypeScript no-emit check passed.
- Next.js production build passed.
- Authenticated deterministic Chromium flow passed at 1440×900, 1024×768, 768×1024, and 390×844, confirmed the exact 3-credit draft path, and created one pending non-canon draft.
- A second Playwright invocation started a fresh app process and recovered the same Loom thread and completed action outcome.
- Repository verification, vault link/stale/version checks, and `git diff --check` passed at closeout.

## Open Follow-ups

- E7 is next: cheapest-sufficient target resolution and scoped exact/structured/FTS read tools before semantic/vector fallback, with traceable provenance and bounded neighborhood expansion.
- E8-E10 still own broader knowledge writes, workflow tools, archive/restore/hard-delete preparation, bounded plans, and the Phase E combined gate.
- No hosted-call authorization carries forward. Any provider-backed Phase E proof requires a fresh bounded authorization.
