---
status: active
authority: support
scope: operations
read_after:
  - "[[00 - Start Here]]"
depends_on:
  - "[[73 - Figma UI Import Readiness]]"
supersedes: []
last_audited: 2026-06-02
source_file: "Relic Vault/Session Logs/2026-06-02 - Figma UI Import Readiness.md"
---

# 2026-06-02 - Figma UI Import Readiness

Backlink: [[50 - Session Log Index]]

## Accomplished

- Audited the current React/Next web app readiness for a controlled Figma-to-React import.
- Added [[73 - Figma UI Import Readiness]] as the canonical handoff contract for importing Figma UI without bypassing backend loaders, actions, route hierarchy, or canon approval rules.
- Added a developer-facing guide at `docs/ui-figma-import.md`.
- Linked the new handoff note from [[02 - Source Map]] and [[60 - Design Spec Overview]].

## Changed

- [[73 - Figma UI Import Readiness]]
- [[02 - Source Map]]
- [[60 - Design Spec Overview]]
- `docs/ui-figma-import.md`
- `README.md`
- [[Session Logs/2026-06-02 - Figma UI Import Readiness]]
- [[50 - Session Log Index]]

## Verification

- `npx pnpm@10.11.0 verify`: passed with `RELIC_REPO_VERIFY_OK`.
- `npx pnpm@10.11.0 --filter @relic/web lint`: passed.
- `npx pnpm@10.11.0 --filter @relic/web test`: passed, 14 tests.
- `npx pnpm@10.11.0 --filter @relic/web build`: passed.
- Vault wikilink check: passed.
- Stale-term check for edited design notes: passed.
- Version-reference check for edited design notes: passed; existing intentional normalization references in [[02 - Source Map]] remain unchanged.

## Open Follow-Ups

- When the Figma wireframe is ready, provide a node-specific Figma URL for the first frame to import.
- Start with one route or component family, likely the Sanctum dashboard or app shell, then repeat the backend wiring audit before moving to the next screen.
