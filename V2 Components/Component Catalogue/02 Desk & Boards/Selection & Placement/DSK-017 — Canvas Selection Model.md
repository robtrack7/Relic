---
id: DSK-017
status: active
kind: behavior
authority: current
system: SYS-02
family: selection-placement
storybook: none
depends_on:
- DSK-018
- DSK-019
- DSK-016
- DS-CAN
---

# DSK-017 — Canvas Selection Model

Parent: [[DSK-002 — Canvas Viewport]]

## Purpose

Defines predictable selection behavior across World Object Placements and composition-only Board objects.

## Interaction

Support:
- click to select one;
- click blank Canvas to clear;
- Shift/Cmd/Ctrl additive or subtractive selection according to platform convention;
- marquee selection;
- keyboard traversal/selection where practical;
- select-all for Board-local selectable objects;
- selection preservation through viewport resize/docking.

Selecting an object should not automatically open Focus.

## Boundaries

Selection is Board/view state, not canon.

When Focus opens, the originating Placement remains the selected source for reliable return.

Selection may persist while a context menu opens and should clear only when the user clearly changes context.

## Relationships

- [[DSK-018 — Selection Marquee]] — range selection.
- [[DSK-019 — Selection Frame & Handles]] — selection rendering.
- [[DSK-016 — Selection Toolbar]] — actions for current selection.
- [[DSK-032 — Canvas Keyboard & Spatial Navigation]] — keyboard selection behaviors.

## Handoff

Implement **DSK-017 — Canvas Selection Model** as the single predictable selection state machine for Board content.
