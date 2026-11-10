---
id: DSK-028
status: active
kind: behavior
authority: current
system: SYS-02
family: selection-placement
storybook: pattern
depends_on:
- APP-012
- DSK-020
- DS-CAN
platforms:
- web
---

# DSK-028 — Canvas Undo & Redo

Parent: [[DSK-001 — Desk Surface]]

## Purpose

Provides predictable keyboard-first reversal of Board composition operations without adding permanent Undo/Redo chrome.

## Interaction

Undoable Canvas operations include:
- Placement move;
- resize/disclosure;
- alignment/distribution;
- Section creation/manipulation;
- annotation edits;
- decorative connector changes;
- remove-from-Board;
- Board-local z-order;
- approved/proposed composition operations.

Redo reapplies the most recently undone compatible operation.

Global Action Receipts may surface Undo for particularly meaningful operations, but the keyboard history remains available.

## Boundaries

Composition undo must coordinate with product-level Atomic Change Sets when one conceptual action includes both Board and semantic mutations.

Do not silently undo unrelated autosave/content edits just because they occurred near a Canvas action.

The Interactive Desk's current history covers movement, resize, paper tint, collection changes, and Arrange. Ctrl/Cmd+Z undoes; Ctrl/Cmd+Shift+Z redoes. Geometry and collection restoration commit in one version-checked transaction. History merges presentation into current objects and cannot replace newer prose, representations, claims, or Relationships. Remove-from-Board and the deferred composition tools still need their own history contributions.

## Relationships

- [[APP-012 — Global Action Receipt]] — optional visible Undo.
- Atomic Change Set system — conceptual multi-write undo.
- [[DSK-020 — Placement Drag]] and other manipulation behaviors — produce Canvas history entries.

## Handoff

Implement **DSK-028 — Canvas Undo & Redo** as coherent keyboard-first history for Board composition operations.
