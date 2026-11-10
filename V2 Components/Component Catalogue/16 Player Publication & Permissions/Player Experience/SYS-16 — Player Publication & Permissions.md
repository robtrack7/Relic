---
id: SYS-16
status: deferred
kind: system
authority: current
system: SYS-16
storybook: none
---

# SYS-16 — Player Publication & Permissions

## Purpose

Defines the future player-facing publication and access contract without making player features a prerequisite for completing Relic's core GM loop.

## Implementation priority

Section 16 is **architected now and implemented later**.

Do not prioritize Player Wiki, invitations, player accounts, or publication UX ahead of the core loop:
`Desk → Prepare → Stage → Settlement → changed world → Chronicle → continue`

The purpose of this section now is to prevent later player access from requiring duplicated world records or unsafe permission retrofits.

## Core laws

> **The player view is a permission-filtered projection of the same world, not a second copy of the world.**

> **Settled truth and player visibility are independent dimensions.**

A fact can be fully settled and remain GM-only forever.

## First player-release scope

Keep the initial implementation intentionally coarse:
- Saga membership;
- GM and Player roles;
- GM-only versus all-Saga-players visibility;
- read-only Player Wiki;
- published World Object projections;
- published Session recaps;
- permission-filtered Chronicle/Search;
- View as Player preview;
- publish/unpublish audit.

Per-player permissions and player-specific knowledge remain later extensions.

## Security invariant

GM/player separation is enforced at the data-access layer through Supabase RLS and permission-safe retrieval.

Never retrieve GM-only material and rely on prompts, CSS, client filtering, or model instructions to hide it.

## Catalogue

### Gm Publication Ui

- [[PUB-003 — GM Publication Controls]]
- [[PUB-009 — Settlement to Publication Handoff]]
- [[PUB-010 — View as Player Preview]]

### Player Experience

- [[PUB-004 — Player Wiki Surface]]
- [[PUB-005 — Published World Object Projections]]
- [[PUB-006 — Published Session Recap]]
- [[PUB-007 — Player Chronicle Projection]]
- [[PUB-008 — Permission-Safe Search & Retrieval]]

### Publication Domain Security

- [[PUB-001 — Publication & Visibility Model]]
- [[PUB-002 — Player Membership & Saga Access]]
- [[PUB-011 — Publication Audit & Reversal]]
