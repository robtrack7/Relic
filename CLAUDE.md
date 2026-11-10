# Relic V2 — Claude Code layer

@AGENTS.md

`AGENTS.md` is the operating authority. This file adds only Claude Code bindings.

## Agents

- `relic-implementer` (Opus): a bounded independent slice with real judgment.
- `relic-reviewer` (Opus): selective high-risk review only.
- `relic-mechanic` (Haiku): fully specified edits or tiny doc/catalogue sync.
- `relic-test-author` (Haiku): focused tests for already-confirmed behavior.
- `relic-runner` (Haiku): named verification commands and literal results.
- `relic-scout` (Haiku): exceptional bounded lookup when deterministic search is insufficient.

The primary session owns planning, architecture, integration, and final verification. Dispatch only independent bounded work; avoid overlapping files. Pass the objective, boundary, exact target IDs, relevant invariant, and done condition—not a reading list.

## Environment

- Windows host; PowerShell is primary.
- Use the package manager and scripts declared in `package.json`.
- Check the working tree before editing and preserve unrelated changes.
- V1, backups, pass folders, and quarry material are historical evidence, never current authority.
