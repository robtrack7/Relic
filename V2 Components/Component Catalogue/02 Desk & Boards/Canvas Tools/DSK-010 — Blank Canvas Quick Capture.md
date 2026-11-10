---
id: DSK-010
status: active
kind: behavior
authority: current
system: SYS-02
family: canvas-tools
storybook: pattern
depends_on:
- DSK-008
- BRD-006
- DS-CAN
platforms:
- web
---

# DSK-010 — Blank Canvas Quick Capture

Parent: [[DSK-002 — Canvas Viewport]]

## Purpose

Provides the fastest possible spatial capture path: idea first, classification later.

## Interaction

Double-clicking an empty Canvas region creates a new Fragment at that position and immediately enters inline text editing.

Provide a keyboard/accessibility equivalent; a later input adaptation can map the same intent to touch.

The action does not open the Create menu, type picker, or modal.

## Boundaries

Only triggers on genuinely blank Canvas space.

Double-clicking an existing placement follows that component's own disclosure/Focus behavior.

The resulting Fragment is a persistent World Object with a Board Placement.

## Relationships

- [[DSK-008 — Create World Material Menu]] — explicit typed creation alternative.
- Fragment representation family — supplies the new Fragment component.
- [[BRD-006 — Placement Host]] — positions the resulting Fragment.

## Handoff

Implement **DSK-010 — Blank Canvas Quick Capture** as double-click-to-create-and-edit Fragment behavior on empty Canvas space.
