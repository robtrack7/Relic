---
id: PUB-010
status: deferred
kind: surface
authority: current
system: SYS-16
family: gm-publication-ui
storybook: scene
platforms:
- web
---

# PUB-010 — View as Player Preview

Parent: [[SYS-16 — Player Publication & Permissions]]

## Purpose

Lets the GM inspect the exact player-facing projection before/after publication to catch accidental spoilers and confusing omissions.

## Scope

Prefer a whole-player-experience preview mode rather than only a one-object card preview.

The GM should be able to navigate the Player Wiki as a Player would see it.

## Preview target

Initial preview target can simply be:
`All Saga Players`

Per-player preview can arrive with later granular permission support.

## Security boundary

Preview is a GM UX convenience.

It does not replace real player RLS enforcement.

## Exit

Provide a clear persistent `Exit Player Preview` control so the GM cannot confuse preview with normal GM context.

## Handoff

Implement alongside the Player Wiki/publication system, not ahead of it.
