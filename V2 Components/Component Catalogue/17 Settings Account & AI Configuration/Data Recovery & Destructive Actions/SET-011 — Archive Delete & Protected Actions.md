---
id: SET-011
status: active
kind: behavior
authority: current
system: SYS-17
family: data-recovery-destructive-actions
storybook: none
depends_on:
- SET-005
- LBR-009
- SET-010
---

# SET-011 — Archive Delete & Protected Actions

Parent: [[SYS-17 — Settings Account & AI Configuration]]

## Purpose

Defines safe destructive/structural account and campaign actions with clear scope and
protection.

## Archive Saga

Prefer Archive as the ordinary removal-from-active-use operation.

Archived Sagas:
- leave normal active navigation;
- retain their history/data;
- can be restored where supported.

Quota/accounting treatment is finalized in pricing/backend policy.

## Delete Saga

Destructive.

Confirmation should clearly describe affected Saga-scoped data such as:
- World Object Saga state;
- Sessions;
- Boards;
- Sources;
- transcripts/audio;
- temporal/audit history

according to actual backend ownership rules.

## Delete World

Higher-risk structural action because multiple Sagas may depend on the World.

Require dependency/impact review.

Do not casually cascade deletion from a generic setting toggle.

## Move Saga between Worlds

Treat as a protected structural operation and coordinate with
[[SET-005 — Current Saga General Settings]].

## Delete account

Highest-scope destructive action.

Require appropriate authentication/confirmation and a clear statement of data impact.

## Librarian boundary

These actions remain protected under [[LBR-009 — Intent, Authority & Autonomy Gate]].

Autonomous mode does not make destructive account/world operations casual.

## Relationships

- [[LBR-009 — Intent, Authority & Autonomy Gate]]
- [[SET-005 — Current Saga General Settings]]
- [[SET-010 — Data Export & Ownership]]

## Handoff

Build **SET-011 — Archive Delete & Protected Actions** around explicit scope,
dependency-aware confirmation and safe defaults.
