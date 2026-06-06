---
status: active
authority: support
scope: session-log
read_after:
  - "[[50 - Session Log Index]]"
depends_on:
  - "[[00 - Start Here]]"
supersedes: []
last_audited: 2026-06-06
source_file: "Relic Vault/Session Logs/2026-06-06 - Agent Rules and Build Push.md"
---

# 2026-06-06 - Agent Rules and Build Push

Backlink: [[50 - Session Log Index]]

## Accomplished

- Verified the current web build state present in the worktree.
- Expanded `AGENTS.md` from a compact bullet list into concise operating sections for authority, canon, git hygiene, spec/code edits, and closeout.
- Clarified that `Relic Vault` is the canonical edited bundle and that imported snapshots, archive stubs, and historical design exports are reference-only unless explicitly promoted.
- Clarified `.gitignore` expectations for local agent state, generated outputs, browser artifacts, and private attachments.
- Added `.gitignore` entries for local agent and output folders that were surfacing as untracked noise.

## Files Changed

- `AGENTS.md`
- `.gitignore`
- `Relic Vault/50 - Session Log Index.md`
- `Relic Vault/Session Logs/2026-06-06 - Agent Rules and Build Push.md`

## Verification

- `npx pnpm@10.11.0 verify` - passed.
- `npx pnpm@10.11.0 --filter @relic/web lint` - passed.
- `npx pnpm@10.11.0 --filter @relic/web test` - passed, 8 files and 16 tests.
- `npx pnpm@10.11.0 --filter @relic/web build` - passed.
- Vault wikilink, stale-term, and version-reference checks - passed.

## Follow-ups

- Browser screenshot smoke checks remain a separate visual QA pass.
- `Relic Vault/Untitled.base` was pre-existing local Obsidian state and was not treated as canon.
