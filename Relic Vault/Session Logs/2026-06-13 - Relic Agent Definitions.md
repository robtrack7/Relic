---
status: active
authority: support
scope: session-log
read_after:
  - "[[50 - Session Log Index]]"
depends_on:
  - "[[00 - Start Here]]"
supersedes: []
last_audited: 2026-06-13
source_file: "Relic Vault/Session Logs/2026-06-13 - Relic Agent Definitions.md"
---

# 2026-06-13 - Relic Agent Definitions

Backlink: [[50 - Session Log Index]]

## Accomplished

- Created four local read-only Codex agent definitions for the next Relic wireframe-to-implementation cycle.
- Scoped the agents around design reconciliation, MVP work ordering, backend contract mapping, and frontend replacement review.
- Added a local agent runbook with a fallback invocation pattern for sessions where multi-agent role metadata has not reloaded yet.

## Files Changed

- `.codex/agents/design-wireframe-reconciler.toml`
- `.codex/agents/mvp-work-order-planner.toml`
- `.codex/agents/backend-contract-mapper.toml`
- `.codex/agents/frontend-replacement-reviewer.toml`
- `.codex/agents/README.md`
- `Relic Vault/50 - Session Log Index.md`
- `Relic Vault/Session Logs/2026-06-13 - Relic Agent Definitions.md`

## Verification

- Parsed all `.codex/agents/*.toml` files with bundled Python `tomllib`; all required keys were present and all agent definitions used `sandbox_mode = "read-only"`.
- Confirmed the current multi-agent tool session had not reloaded new named roles yet; direct `agent_type = "design_wireframe_reconciler"` returned `unknown agent_type`.
- Added the default-agent fallback prompt in `.codex/agents/README.md` so the role instructions remain usable before tool metadata reload.

## Follow-ups

- After the Codex tool session reloads, re-check that the new role names appear in multi-agent discovery.
- Use `design_wireframe_reconciler` and `mvp_work_order_planner` first when beginning the Claude Design MVP replacement pass.
