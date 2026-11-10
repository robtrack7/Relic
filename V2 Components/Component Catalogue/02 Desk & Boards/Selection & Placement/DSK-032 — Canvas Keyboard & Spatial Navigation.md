---
id: DSK-032
status: active
kind: behavior
authority: current
system: SYS-02
family: selection-placement
storybook: pattern
depends_on:
- DSK-017
- DSK-020
- DSK-027
- DS-CAN
platforms:
- web
---

# DSK-032 — Canvas Keyboard & Spatial Navigation

Parent: [[DSK-002 — Canvas Viewport]]

## Purpose

Defines the Canvas-specific keyboard interaction layer so common spatial work does not require pointer-only manipulation.

## Interaction

Initial behaviors:
- Escape → cancel active tool/menu/drag, then return to Select/clear selection as appropriate;
- Space + drag → temporary pan;
- Delete/Backspace on selected Placement → **Remove from Board**, not Delete World Object;
- Enter/Return on selected World Object → Focus or primary disclosure action according to the active representation;
- arrow keys → nudge selected Placement;
- Shift + arrows → larger nudge;
- Cmd/Ctrl+A → select Board-local selectable content where appropriate;
- platform-standard multi-selection modifiers;
- keyboard shortcut to Global Search remains owned by App Shell/Search.

Destructive deletion of persistent World identity requires a more deliberate command.

## Boundaries

Keyboard commands operate on the active Canvas context and must not steal keystrokes while editing text inside a card, annotation, Search field, or Focus form.

## Relationships

- [[DSK-017 — Canvas Selection Model]] — selection semantics.
- [[DSK-020 — Placement Drag]] — keyboard nudge equivalent.
- [[DSK-027 — Focus Invocation]] — Enter/Focus path.
- [[DSK-028 — Canvas Undo & Redo]] — standard undo/redo shortcuts.

## Handoff

Implement **DSK-032 — Canvas Keyboard & Spatial Navigation** with platform-consistent selection, pan, nudge, Focus, remove-from-Board, and cancellation behavior.
