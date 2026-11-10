---
id: DSK-023
status: active
kind: component
authority: current
system: SYS-02
family: selection-placement
storybook: component
depends_on:
- BRD-007
- BRD-010
- DSK-028
- DS-CAN
platforms:
- web
---

# DSK-023 — Multi-Selection Arrange Menu

Parent: [[DSK-016 — Selection Toolbar]]

## Purpose

Collects secondary layout operations for several selected Board objects without permanently adding diagramming controls to the Canvas.

## Context & placement

Opened from the multi-selection Selection Toolbar.

Appears as a compact contextual menu near the selected group.

## Anatomy

Likely actions:
- align left/centre/right;
- align top/middle/bottom;
- distribute horizontally/vertically;
- tidy spacing;
- create Section around selection;
- move/copy to another Board;
- bring forward/send backward where z-order matters.

A Librarian-assisted arrangement action may be offered elsewhere, but should not turn this menu into AI chrome.

## Appearance & behaviour

Use text labels or compact grouped controls where icon meaning is obvious.

Operations preview or apply immediately and remain undoable as one conceptual Canvas action.

## Relationships

- [[DSK-016 — Selection Toolbar]] — opens this menu.
- [[BRD-007 — Board Section]] — can be created around selected Placements.
- [[BRD-010 — Move or Copy to Board Picker]] — destination flow.
- [[DSK-028 — Canvas Undo & Redo]] — reverses arrangement operations.

## Handoff

Build **DSK-023 — Multi-Selection Arrange Menu** as the compact home for align, distribute, tidy, Section, z-order, and Board-move actions.
