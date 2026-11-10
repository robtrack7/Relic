---
id: SET-005
status: active
kind: component
authority: current
system: SYS-17
family: saga-policy
storybook: component
depends_on:
- MEC-017
- SET-006
- SET-009
platforms:
- web
---

# SET-005 — Current Saga General Settings

Parent: [[SET-001 — Settings Surface & Scope Navigation]]

## Purpose

Owns structural configuration for the Saga currently selected in Current Context.

## Saga identity

Initial editable content:
- Saga name;
- associated World;
- optional concise description/premise where the Saga model supports it.

## Mechanics

Use [[MEC-017 — Saga Mechanics Profile]].

Allow:
- view current profile;
- change template/system;
- enter custom mechanics configuration where implemented;
- leave mechanics unassigned if supported.

Existing explicit mechanics assignments should not be silently destroyed when the Saga
default changes.

## World reassignment

Moving a Saga between Worlds is a protected structural operation.

It can affect:
- World-scoped identities/state;
- Sources;
- retrieval;
- Relationships;
- shared context.

Require an impact-aware workflow rather than a casual dropdown save.

## Boundary

Do not place Librarian authority, Review Style, or recording retention in this generic
page if dedicated settings exist for them.

## Relationships

- [[MEC-017 — Saga Mechanics Profile]]
- [[SET-006 — Librarian Authority & Review Policy]]
- [[SET-009 — Recording Retention & Privacy]]

## Handoff

Build **SET-005 — Current Saga General Settings** as the concise structural settings
surface for the active Saga.
