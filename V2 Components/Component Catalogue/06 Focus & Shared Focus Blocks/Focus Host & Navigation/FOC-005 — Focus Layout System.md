---
id: FOC-005
status: active
kind: behavior
authority: current
system: SYS-06
family: focus-host-navigation
storybook: none
depends_on:
- FOC-004
- FOC-006
- APP-010
- DS-FOC
---

# FOC-005 — Focus Layout System

Parent: [[FOC-001 — Focus Host]]

## Purpose

Turns a family Focus page composition into a responsive editorial layout that remains readable beside Stage and Librarian carriages, while sharing measured geometry with the central Entity Builder.

## Layout model

Supports deliberate layout regions such as:
- primary reading column;
- secondary utility column;
- narrow contextual column;
- full-width block;
- inset/paired block.

Family compositions choose regions and priority.

The system should not automatically masonry-pack every block into whichever column has room.

Focus is a right-docked, non-modal carriage over a stable Desk. Its explicit tab/page selector shows meaningful family-declared pages, omitting empty pages; a section or block deep link opens its containing page. The carriage preserves local drafts when changing pages or opening Builder.

Entity Builder is a distinct central authoring host. When measured space permits, Desk/Builder, Focus, and Librarian can coexist. When they cannot, Builder receives priority and Focus remains explicitly available as a retained right-panel state/switch. Changing projection does not change the Canvas camera or Board geometry.

## Responsive behaviour

**Wide**
Can use multiple deliberate columns.

**Medium**
Collapse secondary/contextual columns into one or two reading columns.

**Stage + Librarian**
Preserve both carriages when central working width remains useful; simplify Focus or Builder layout first according to the active host.

**Focus + Librarian**
Preserve both right-side panel states when width permits. Otherwise show the most recently requested panel through an explicit switch without unmounting drafts or disclosure state.

**Narrow**
Stack blocks according to family composition order.

Section Navigator collapses to a compact Focus menu.

## Appearance & behaviour

Spacing, headings, rules, and typography should create document rhythm.

Blocks are not automatically surrounded by cards.

Full-width media/mechanics/history sections can break the primary reading column when the family composition calls for it.

## Relationships

- [[FOC-004 — Focus Composition Contract]] — supplies order/emphasis.
- [[FOC-006 — Focus Section Navigator]] — maps to rendered section anchors.
- [[APP-010 — Workspace Dock Manager]] — supplies usable central bounds.

## Handoff

Implement **FOC-005 — Focus Layout System** as the measured responsive layout engine for family-specific Focus pages, Entity Builder, and their shared carriage geometry.
