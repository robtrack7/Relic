---
id: BRD-003
status: active
kind: component
authority: current
system: SYS-02
family: boards
storybook: component
depends_on:
- BRD-005
- BRD-006
- DS-CAN
platforms:
- web
---

# BRD-003 — Create Board

Parent: [[BRD-001 — Board Context Popover]]

## Purpose

Creates a new remembered composition with minimal ceremony.

## Use

Primary path:
- enter Board name;
- create blank Board;
- open it immediately.

Contextual creation may also support:
- Create Board from current selection;
- Create Board from current visible set.

Those paths create new Placements referencing existing World Objects/composition where appropriate; they never duplicate the underlying World Object records.

## Anatomy

- Board name field;
- create action;
- optional source context summary for "from selection/visible set."

Do not introduce Board templates in the base flow.

## Appearance & behaviour

Small popover/sheet, not a full page.

Board naming can be corrected later; creation should not require description, icon, cover, permissions, or category.

## Relationships

- [[BRD-001 — Board Context Popover]] — main entry.
- [[BRD-005 — Board Open & Restore]] — opens newly created Board.
- [[BRD-006 — Placement Host]] — new placements when created from selection.

## Data / utility relationship

Creates a Board composition identity within the current Saga and optional initial Placement references.

## Handoff

Build **BRD-003 — Create Board** as the minimal blank/from-selection Board creation flow.
