---
id: BRD-010
status: active
kind: component
authority: current
system: SYS-02
family: boards
storybook: component
depends_on:
- DSK-023
- DSK-024
- BRD-003
- DS-CAN
platforms:
- web
---

# BRD-010 — Move or Copy to Board Picker

Parent: [[SYS-02 — Desk & Boards]]

## Purpose

Provides a focused destination picker when the GM wants selected Placements available on another Board.

It makes cross-Board reuse explicit while preserving the rule that Boards reference World Objects rather than duplicating them.

## Context & placement

Invoked from a Placement context menu or multi-selection Arrange menu.

Appears as a compact overlay/popup with recent/searchable Boards.

## Use

Two distinct actions:

**Copy to Board**
Creates new Placements on the destination Board referencing the same World Objects. Source Placements remain.

**Move to Board**
Creates equivalent destination Placements and removes the selected source Placements from the current Board as one coherent operation.

Composition-only objects such as annotations/Sections may be copied/moved only where their Board-local semantics remain clear.

## Anatomy

- Move / Copy mode;
- recent Boards;
- Board search;
- optional Create New Board destination;
- confirm action when needed.

## Appearance & behaviour

Fast, text-forward, and optimized for choosing a destination rather than managing Boards.

After completion, remain on the current Board by default and use an Action Receipt with optional `Open destination` where useful.

## Relationships

- [[DSK-023 — Multi-Selection Arrange Menu]] — common entry.
- [[DSK-024 — Placement Context Menu]] — single Placement entry.
- [[BRD-003 — Create Board]] — optional new destination.
- [[APP-012 — Global Action Receipt]] — completion/undo.

## Data / utility relationship

Creates/removes Board Placement references only. Persistent World Object identity/content remains shared.

## Handoff

Build **BRD-010 — Move or Copy to Board Picker** as the explicit cross-Board Placement destination flow.
