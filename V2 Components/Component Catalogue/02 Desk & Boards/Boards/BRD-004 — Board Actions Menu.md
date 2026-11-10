---
id: BRD-004
status: active
kind: component
authority: current
system: SYS-02
family: boards
storybook: component
depends_on:
- APP-012
- DS-CAN
platforms:
- web
---

# BRD-004 — Board Actions Menu

Parent: [[BRD-001 — Board Context Popover]]

## Purpose

Collects low-frequency management operations for the current Board without mixing them into everyday Canvas tools.

## Anatomy

Likely actions:
- Rename Board;
- Duplicate Board composition;
- Clear placements/composition;
- Delete Board.

Potential future metadata actions belong here only if Boards genuinely acquire them.

## Behaviour

**Duplicate Board** duplicates Board composition/Placement references and composition-only objects, not persistent World Objects.

**Clear Board** removes Placements and Board-only composition while preserving World Objects elsewhere.

**Delete Board** deletes the remembered composition, not the World Objects shown on it.

Destructive actions require clear consequence language and appropriate confirmation.

## Relationships

- [[BRD-001 — Board Context Popover]] — entry point.
- Board composition backend — executes Board-local actions.
- [[APP-012 — Global Action Receipt]] — confirms undoable/meaningful results.

## Handoff

Build **BRD-004 — Board Actions Menu** with explicit composition-only semantics for rename, duplicate, clear, and delete.
