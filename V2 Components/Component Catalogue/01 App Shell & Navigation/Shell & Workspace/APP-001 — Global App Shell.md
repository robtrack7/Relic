---
id: APP-001
status: active
kind: surface
authority: current
system: SYS-01
family: shell-workspace
storybook: scene
depends_on:
- APP-002
- APP-005
- APP-004
platforms:
- web
---

# APP-001 — Global App Shell

Parent: [[SYS-01 — App Shell & Navigation]]

## Purpose

The Global App Shell is the persistent frame around Relic's working surfaces.

It gives Desk, Library, Sessions, Prepare, Stage, Focus, and future lenses a consistent relationship to global navigation, Search, Librarian, account controls, carriages, overlays, and browser space without wrapping them in conventional application chrome.

The shell should largely disappear while the GM works. Relic should feel like the current world surface with a few carefully anchored instruments around it, not a page displayed inside a dashboard.

## Context & placement

The shell fills the browser viewport. Its **central workspace region** is reserved for the active product surface, while docked carriages sit outside that region.

The shell's identity, current context, Search, Librarian toggle, and profile controls remain fixed to the browser viewport as global orientation chrome. Canvas-local tools, view controls, and the minimap stay anchored to the current central workspace bounds and move with that visible Canvas region.

It owns screen-space mounting regions around that surface:

- top-left global navigation;
- upper working frame for context and Search;
- top-right Librarian/account controls;
- optional left docking region;
- optional right docking region;
- transient lower-edge status/receipts;
- global overlay layer.

It does not own canvas coordinates, Board content, Focus content, or carriage internals.

## Viewport chrome

### Top-left

- [[APP-002 — Relic Button]]

### Upper working frame

- [[APP-005 — Current Context Control]]
- [[APP-004 — Global Search & Quick Open]]
- conditional [[APP-006 — Active Session Return]]

These should visually read as one restrained orientation/retrieval zone rather than an application header.

### Top-right

- [[APP-007 — Librarian Toggle]]
- [[APP-008 — Profile Control]]

### Left edge

Circular floating controls provide Prepare, Boards, Library, and Sessions access beside the left carriage when present. Prepare resumes or chooses a Session; Boards uses existing Board context navigation. Library and Sessions remain their established destinations. Threads are reached through Library/Focus, Relationships through contextual tools, and Chronicle through current context/history rather than additional permanent rail destinations.

[[STG-002 — Stage Carriage]] may dock here while Stage is active.

### Right edge

Normally open.

[[LBR-001 — Librarian Carriage]] may dock here.

### Lower viewport

Normally open.

May temporarily host:

- [[APP-012 — Global Action Receipt]]
- [[APP-013 — Degraded & Offline Status]]

### Transient

[[APP-011 — Global Overlay Host]] mounts menus, Search Results, popovers and other screen-space transient UI.

## Use

The GM rarely interacts with the shell as a whole.

It quietly preserves global orientation and allows them to:

- move between major Relic contexts;
- search from anywhere;
- understand the current working context;
- return to an active Session;
- invoke the Librarian;
- reach account/settings controls.

Switching surfaces should preserve the state of the surface being left where practical so returning feels like returning to a desk rather than loading a page from scratch.

## Appearance & behaviour

There is no conventional header bar or solid sidebar. Workspace navigation floats as a quiet vertical group, separate from the bottom Canvas tool cluster.

Controls float with generous surrounding whitespace and minimal visual containers.

The active world surface remains visually dominant.

Shell chrome should remain stable enough to build muscle memory even as the centre surface changes.

When a new centre surface is loading, existing shell chrome should remain visible and usable where safe rather than blanking the entire application.

## States & variants

- initial boot / restoring workspace;
- normal;
- surface transition;
- left carriage docked;
- right carriage docked;
- both carriages docked;
- constrained two-carriage split;
- overlay-active;
- degraded/offline;
- recoverable loading/error.

## Responsive behaviour

On wide layouts, carriages dock beside the central surface without changing world or Placement coordinates.

When one carriage would consume too much of the available width, it shares space with an interactive central surface. When both carriages are open and no useful central width remains, [[APP-010 — Workspace Dock Manager]] presents the dedicated resizable two-carriage split. Closing either carriage returns to the remaining carriage plus the central surface.

Global header controls retain their viewport anchors and may condense when width is constrained. Canvas-local controls follow the usable central bounds.

The shell should avoid introducing a separate mobile navigation architecture unless later product requirements demand it.

## Relationships

- [[APP-002 — Relic Button]] — global navigation entry.
- [[APP-004 — Global Search & Quick Open]] — persistent retrieval entry.
- [[APP-005 — Current Context Control]] — persistent orientation.
- [[APP-010 — Workspace Dock Manager]] — controls carriage/centre geometry.
- [[APP-011 — Global Overlay Host]] — mounts transient global interface.
- [[LBR-001 — Librarian Carriage]] — optional right dock.
- [[STG-002 — Stage Carriage]] — optional left dock.
- [[FOC-001 — Focus Host]] — can deepen the central working context.

## Handoff

Build **APP-001 — Global App Shell** as the low-chrome screen-space frame for Relic; active surfaces and linked global controls remain independently owned components.
