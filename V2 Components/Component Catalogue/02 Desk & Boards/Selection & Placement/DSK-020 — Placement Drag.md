---
id: DSK-020
status: active
kind: behavior
authority: current
system: SYS-02
family: selection-placement
storybook: pattern
depends_on:
- DSK-022
- BRD-007
- DSK-028
- DS-CAN
platforms:
- web
---

# DSK-020 — Placement Drag

Parent: [[BRD-006 — Placement Host]]

## Purpose

Moves one or more Board Placements through direct manipulation while preserving persistent World Object identity.

## Interaction

Support:
- direct drag;
- multi-selection drag;
- Shift-style axis constraint where useful;
- snapping/alignment feedback;
- dragging a Section with its contained Placements;
- smooth auto-pan near viewport edges during long moves.

Movement updates Placement geometry continuously enough to feel direct while persistence can be appropriately debounced/batched.

## Boundaries

Moving changes only Board composition.

It does not change a Character's Place, a Faction's ownership, a Thread's semantic relationship, or any other world fact.

Composition and semantics remain deliberately separate.

## Relationships

- [[DSK-022 — Alignment & Snap Guides]] — movement feedback.
- [[BRD-006 — Placement Host]] — owns persisted geometry.
- [[BRD-007 — Board Section]] — moves contained Placements as a group.
- [[DSK-028 — Canvas Undo & Redo]] — records completed move operation.

## Handoff

Implement **DSK-020 — Placement Drag** as smooth single/multi Placement movement with Section containment and composition-only persistence.
