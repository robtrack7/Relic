---
id: LIB-005
status: active
kind: behavior
authority: current
system: SYS-09
family: library
storybook: none
depends_on:
- OBJ-FRAG-01
- BRD-006
- OBJ-013
- FOC-001
- FOC-003
---

# LIB-005 — Library Object Actions

Parent: [[LIB-001 — Library Surface]]

## Purpose

Defines the useful actions available from Library objects without duplicating family-specific editing UI.

## World Object actions

Common:
- inspect in a compact family dossier;
- open Focus;
- open in Entity Builder;
- create entity in Entity Builder without placing it on a Board;
- place on current/selected Board;
- add to Session;
- archive/unarchive where allowed.

Family-specific actions remain contributed through the object's action contract.

`Inspect`, `Open in Focus`, and `Open in Builder` are distinct actions. Inspect opens a useful compact family dossier without resizing the collection or creating a Placement. From either the item or its dossier, `Open Focus` enters the shared [[FOC-001 — Focus Host]] for the same persistent identity; `Open in Builder` enters [[FOC-013 — Entity Builder Host]]. Closing either returns to the retained Library filters, selection, and scroll under [[FOC-003 — Focus Return Context]]. Following an unplaced relationship endpoint uses the same inspection path without silently placing it on a Board.

## Source actions

Common:
- open Source Viewer;
- place on Board;
- pin/unpin Pinned Reference Shelf;
- attach/link to World Object;
- archive where allowed.

## Fragment actions

Common:
- open;
- Resolve through [[OBJ-FRAG-01 — Resolve Fragment]];
- place on Board;
- add to Session.

## Place on Board

`Place on Board` creates a new Placement referencing the **same persistent identity**.

It never duplicates the World Object.

If a direct Library→Canvas drag interaction is supported in a particular layout, it uses the same behavior.

A deterministic `Place on Board…` action remains the fallback.

## Librarian boundary

Library selections may become context for the Librarian's retrieval/Q&A path when explicitly used.

World creation/editing/management by the Librarian is not defined by this behavior and remains owned by the Librarian system.

## Relationships

- [[BRD-006 — Placement Host]]
- [[OBJ-013 — Object Action Contribution Contract]]
- [[DSK-033 — Pinned Reference Shelf]]
- [[OBJ-FRAG-01 — Resolve Fragment]]

## Handoff

Implement **LIB-005 — Library Object Actions** as the shared Library-level placement/session/reference actions around family-owned objects.
