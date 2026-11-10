---
id: LBR-014
status: active
kind: component
authority: current
system: SYS-13
family: agent-runtime-authority
storybook: component
depends_on:
- STG-016
platforms:
- web
---

# LBR-014 — Failure, Insufficiency & Recovery

Parent: [[SYS-13 — Librarian]]

## Purpose

Defines trustworthy failure behaviour so Relic remains usable when the Librarian lacks evidence, provider access, network connectivity, quota, or a valid action path.

## Insufficient information

Do not bluff. State what cannot be established and offer useful next actions.

## Provider failure

Preserve user request, composer content, explicit context, and task origin. Manual Relic remains functional.

## Offline

No fake AI fallback is required for current V2. Stage/manual operation continues according to [[STG-016 — Stage Offline Continuity & Recovery]].

## Quota / fallback

Provider/model fallback must not broaden permissions, authority, tool access, or canon rules.

## Relationships

- [[STG-016 — Stage Offline Continuity & Recovery]]
- Settings / AI Configuration
- future backend/provider routing

## Handoff

Build **LBR-014 — Failure, Insufficiency & Recovery** so AI failure never makes the underlying Relic workspace unusable or encourages fabricated answers.
