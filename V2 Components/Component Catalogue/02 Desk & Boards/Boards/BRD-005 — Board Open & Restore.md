---
id: BRD-005
status: active
kind: behavior
authority: current
system: SYS-02
family: boards
storybook: pattern
depends_on:
- BRD-001
- BRD-009
- DSK-004
- DS-CAN
platforms:
- web
---

# BRD-005 — Board Open & Restore

Parent: [[DSK-001 — Desk Surface]]

## Purpose

Makes switching Boards feel like returning to remembered working tables rather than loading fresh canvases.

## Interaction

When opening a Board, restore where safe:
- saved viewport centre and zoom;
- recent local presentation state;
- optional recent selection if still valid;
- Board-specific composition.

The first visit to a Board can use Fit Board or a sensible initial camera.

## Boundaries

Do not automatically Fit All on every Board switch.

If a saved selection/Placement no longer exists, restore the camera and clear invalid selection gracefully.

Board restore is user workspace state, not canon.

## Relationships

- [[BRD-001 — Board Context Popover]] — common switch entry.
- [[BRD-009 — Board Link Card]] — in-canvas navigation entry.
- [[DSK-004 — Canvas Camera Navigation]] — applies restored camera.
- [[DSK-017 — Canvas Selection Model]] — restores valid selection.

## Handoff

Implement **BRD-005 — Board Open & Restore** so each Board reopens near the user's last safe working context.
