---
id: OBJ-012
status: active
kind: behavior
authority: current
system: SYS-03
family: shared-projection-components
storybook: none
depends_on:
- OBJ-004
- DS-BHV-AUTOSAVE
---

# OBJ-012 — Inline Object Rename

Parent: [[OBJ-001 — World Object Representation Framework]]

## Purpose

Provides a shared low-friction pattern for renaming persistent World Object identity from representations that permit direct editing.

## Interaction

Where supported:

- invoke edit through the title or explicit edit affordance;
- edit inline;
- Enter commits;
- Escape cancels;
- focus-loss follows the product's standard text-edit convention.

The stable identity remains the same before and after the display-name change.

## Boundaries

Duplicate names are allowed.

Board-local labels and Board Annotations are composition edits, not World Object rename.

Aliases are separate object data and should not be silently rewritten when the primary name changes.

## Relationships

- [[OBJ-004 — Object Identity Lockup]] — common editable host.
- World Object Cards/Focus components — opt into direct rename where appropriate.
- Search/Library — update their projections after commit.

## Data / utility relationship

Mutates only the object's primary display name under normal authorization. Stable identity/ID is unchanged.

## Handoff

Implement **OBJ-012 — Inline Object Rename** as the shared direct-edit behavior for persistent World Object display names.
