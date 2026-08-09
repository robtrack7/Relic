# Relic Agent Guide

## Start here

Read `Relic Vault/00 - Start Here.md` before every task. The vault is the product authority; code, tests, and this file implement it. Do not use imported exports, historical notes, session logs, or generated output as current product truth.

## Load only the contract your change needs

| Work | Read after `00` |
| --- | --- |
| Product scope, names, or MVP boundary | `10 - Product Contract` |
| Schema, RLS, RPCs, workers, AI, Storage, or tests | `20 - Engineering Contract` |
| Routes, UI states, design, accessibility, or Figma handoff | `30 - Experience Contract` |
| Current packet, release gate, or verification evidence | `40 - Delivery Status` |
| Secrets, privacy, permissions, destructive actions, or incident response | `45 - Security Findings Register` |
| Explicitly deferred work | `05 - Deferred Decisions` |

Read the target code and its focused tests before changing it. Do not load the entire vault or visual exports unless the task needs them.

## Implementation rules

- Preserve the Workspace -> World -> Saga security boundary. Server routes validate hierarchy and scope; database RPC/RLS remains the enforcement layer.
- AI may prepare scoped, typed work, but it never makes canon without explicit GM approval or the approval write path. Do not weaken confirmation, provenance, retry, or quota boundaries.
- Keep provider credentials, service-role keys, signed URLs, private evidence, and worker-only configuration out of browser code, commits, fixtures, and logs.
- Treat `apps/web` as the product app, `supabase` as database/Edge ownership, and `scripts` as repeatable verification tooling. Generated Figma code is visual input, not a replacement for loaders, actions, route checks, or tests.
- Use `pnpm@10.11.0`. For web changes, run the relevant lint, unit tests, and build; for database changes, run focused SQL tests plus the appropriate baseline when feasible.

## Repository hygiene

- Respect `.gitignore`; do not stage dependencies, builds, browser reports, local `.tmp` fixtures, editor state, logs, or credentials.
- Preserve unrelated worktree changes. Inspect `git status --short` before staging and stage only task-owned files.
- Keep comments limited to non-obvious invariants, failure modes, and setup assumptions.
- Close out with a concise commit message and record the checks run and follow-ups in the handoff; Git history is the implementation trail.
