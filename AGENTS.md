# AGENTS.md

## Start and Authority

- Start every Relic task at `Relic Vault/00 - Start Here.md`.
- Treat `Relic Vault` as the canonical edited bundle, following the authority order and read paths in `00 - Start Here`.
- Treat `Sourced - Downloaded - 260518`, archive stubs, imported snapshots, and historical design exports as reference only. Do not build from or rewrite them unless the user explicitly asks for an archival/source-maintenance pass.
- Active implementation decisions belong in the owning active vault note first, then in code.

## Canon and Protected Decisions

- Relic product canon is controlled by the active vault notes, especially `00`, `11`, `12`, `13`, and the `20`-series implementation contracts.
- Preserve the core canon rule: AI output is never canon until explicit GM approval or the Approval Queue commit path.
- Do not rename product surfaces, entities, workflow steps, schema concepts, or route hierarchy without checking the relevant active vault source.
- `Relic Vault` notes may be edited as specs. Preserve Obsidian wikilinks/backlinks, frontmatter intent, and source-map consistency when doing so.

## Gitignore and Local State

- Respect `.gitignore`. Do not stage ignored or local-only artifacts such as dependency folders, build outputs, browser reports, agent state, local settings, logs, or private attachments.
- If a new tool creates repeatable local noise, add a narrow `.gitignore` entry instead of committing the artifact.
- Do not commit secrets, keys, tokens, private environment files, local Supabase credentials, or machine-specific config.
- Before staging, inspect `git status --short`. If unrelated or ambiguous changes exist, stage only the files that belong to the current session and summarize what was left untouched.

## Spec and Code Changes

- After spec edits, run link, stale-term, and version-reference checks against the touched vault scope.
- For app changes, use the repo's package manager and commands from `package.json` or committed workspace docs; the usual web sequence is lint, test, then build.
- Add code comments only where they aid troubleshooting: intent, invariants, failure modes, setup assumptions, or non-obvious constraints. Keep comments short and avoid restating obvious code.

## Session Closeout

- Add a concise log under `Relic Vault/Session Logs/` and link it from `Relic Vault/50 - Session Log Index.md`.
- Session logs should cover accomplished work, files/notes changed, verification run, and open follow-ups. Do not include secrets, keys, tokens, or private env values.
- Prefer GitHub CLI (`gh`) for GitHub authentication, PR creation, and PR/status inspection when available.
- Prefer HTTPS for GitHub remotes unless the user explicitly asks for SSH.
- If work was completed and the user has not asked to pause, run relevant verification, inspect `git status`, commit the intended changes with a concise message, and push the current branch to `origin`.
- Never force-push, rewrite published history, or push secrets/tokens/private env values.
