---
id: LIB-003
status: active
kind: component
authority: current
system: SYS-09
family: library
storybook: component
depends_on:
- WOF-001
- LIB-005
platforms:
- web
---

# LIB-003 — Library Index Collection

Parent: [[LIB-001 — Library Surface]]

## Purpose

Displays the objects/sources in the selected Library category using family-owned Index Projections.

## Projection reuse

Library does not invent another Character/Place/Faction/etc. card system.

Use the family Index Projection defined by:
- Character family;
- World Object family specs in Section 07;
- Source family.

Library owns outer collection geometry and interaction state.

## Layout modes

Support two useful modes where the category warrants them:

**List**
- default for systematic scanning;
- works for every category.

**Visual Grid**
- useful for image-forward categories such as Characters, Places, Artifacts, and visual Sources.

A category can declare its preferred default.

Do not force a meaningless grid onto text-heavy categories.

## Sorting

Useful generic sorts:
- Name;
- Recently updated;
- Recently created/used where meaningful.

Category-specific:
- Event story position;
- Thread status;
- Source date/type.

Avoid configurable spreadsheet columns.

## Selection and navigation

Activate an item to open its natural deep destination:
- World Object Focus;
- Source Viewer;
- lightweight Fragment Focus.

Support keyboard navigation and multi-select only where a concrete product action later requires it.

## Empty states

Example:
`No Factions yet.`

Actions:
- `Create Faction`
- `Capture Fragment`

Keep sparse states quiet.

## Relationships

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-CHAR-07 — Character Index Projection]]
- [[LIB-005 — Library Object Actions]]

## Handoff

Build **LIB-003 — Library Index Collection** as the reusable list/grid host for family Index Projections.
