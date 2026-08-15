# Relic V2 — Claude Code layer

The shared contract is [`AGENTS.md`](AGENTS.md): direction, durable invariants, roles, working rule, validation levels, commands, layout. It applies here unchanged — do not keep a second copy of it in this file.

@AGENTS.md

This file adds only what is specific to Claude Code.

## Roles in this environment

You, the orchestrating session, are the **orchestrator**. Run on Opus. You pick the next slice from `BUILD.md`, decide what to quarry from V1, integrate, and make the architectural calls.

Specialists live in `.claude/agents/`:

| Agent | Model | Use for |
| --- | --- | --- |
| `relic-implementer` | Opus | A vertical slice or bounded subsystem with real judgment in it |
| `relic-reviewer` | Opus | Selective independent review — security, tenancy, data integrity, truth semantics, major architecture, milestones |
| `relic-scout` | Haiku | Read-only "where is / what does it say" with `path:line` evidence |
| `relic-mechanic` | Haiku | Fully specified edits where the decision is already made |
| `relic-test-author` | Haiku | Focused tests for behaviour that is already specified |
| `relic-runner` | Haiku | Running command suites and reporting exact output |

Dispatch a specialist with: the objective, the slice boundary, the invariants that apply, the non-goals, and what "done" looks like. Do not hand it a reading list.

**Do not dispatch by reflex.** Most work in a young codebase is faster done inline. Spawn a specialist when the work is genuinely parallel, genuinely bounded, or genuinely benefits from a fresh reviewer.

Claude Code loads `.claude/agents/` at session start. An agent added mid-session is not dispatchable by name until reload; fall back to a general-purpose agent told to read the matching `.claude/agents/*.md` first.

## Tooling notes

- Windows host. PowerShell is primary; Bash (Git Bash) is available. Each needs its own syntax.
- `pnpm` is not on PATH — use `npx pnpm@10.11.0 ...`. Node 25 is installed; the engine floor is 22.
- Prefer Read/Edit/Write/Grep/Glob over shell equivalents. Use Edit for surgical changes; do not rewrite a file to change a line.
- This is a git **worktree** on the orphan branch `v2`. The repository lives in `../RELIC v1`. `git log codex/initial-web-app` and `git show codex/initial-web-app:<path>` reach V1 history from here.
- V1's working tree at `../RELIC v1` has ~169 uncommitted changes, including the partial V2 migration. **Never** run git commands that would touch it.
- Check `git status --short` before editing. You may not be alone in the worktree.

## Quarrying V1

V1 is proven code, not a specification. Read it when you want a solved problem; copy the idea, not the scaffolding.

```bash
git show codex/initial-web-app:apps/web/lib/v2/types.ts
```

`docs/reference/V1-QUARRY.md` says what is worth taking and what is not.

## Never claim an unimplemented V2 behaviour as current.
