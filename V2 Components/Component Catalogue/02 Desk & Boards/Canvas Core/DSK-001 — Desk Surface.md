---
id: DSK-001
status: active
kind: surface
authority: current
system: SYS-02
family: canvas-core
storybook: scene
depends_on:
- APP-001
- DSK-002
- DSK-007
- DS-CAN
platforms:
- web
---

# DSK-001 — Desk Surface

Parent: [[SYS-02 — Desk & Boards]]

## Purpose

The Desk is the default working surface of a Saga: the place the GM returns to in order to think spatially, arrange world material, follow narrative threads, and move naturally into Focus, Prepare, Stage, Search, or Librarian work.

It is not a dashboard and does not summarize the campaign through KPI-like panels. It should feel like returning to a large private working table whose contents have been left where the GM last used them.

## Context & placement

The Desk occupies the central working region supplied by [[APP-001 — Global App Shell]].

Its primary content is [[DSK-002 — Canvas Viewport]], which normally fills the entire available centre.

The Desk inherits global chrome from the App Shell:
- Relic Button at top-left;
- Current Context and Global Search in the upper working frame;
- Librarian Toggle and Profile at top-right;
- optional Stage Carriage on the left;
- optional Librarian Carriage on the right.

Desk-specific chrome floats over the Canvas rather than creating a separate header or sidebar.

## Viewport chrome

**Top-left beneath Relic**
- [[DSK-007 — Canvas Tool Cluster]] — Select, Create, Compose, Connect.

**Upper working frame**
- inherited [[APP-005 — Current Context Control]] identifies the active Board and lens;
- inherited [[APP-004 — Global Search & Quick Open]];
- conditional [[APP-006 — Active Session Return]].

**Bottom-left**
- [[DSK-005 — View Controls]].

**Bottom-right**
- [[DSK-031 — Contextual Minimap]] only when spatial scale justifies it.

**Contextual**
- selection frame and toolbar;
- semantic relationship handles;
- alignment guides;
- canvas/placement context menus;
- Librarian proposal layer;
- Focus transitions.

Desk does not add a conventional page title, navigation rail, or persistent inspector.

## Use

The GM opens a Saga directly into the last safe Desk/Board context and can immediately continue arranging material.

Typical work includes:
- capturing an idea as a Fragment;
- placing or rearranging Characters, Places, Threads, images, and Sources;
- organizing material into composition-only Sections;
- drawing decorative arrows or notes;
- establishing semantic Relationships;
- opening a World Object into richer disclosure or Focus;
- switching Boards;
- asking the Librarian to act on the current selection or composition.

The Desk should make exploratory, unfinished arrangements feel legitimate rather than requiring every object to be perfectly categorized or aligned.

## Appearance & behaviour

The Desk is dominated by the world itself. Interface chrome is sparse and edge-anchored.

The default visual field is warm, quiet, lightly gridded, and spacious. Cards, imagery, annotations, relationship edges, and GM-authored composition provide the visual richness.

Leaving the Desk for another primary context should preserve the active Board, viewport, and safe working state so returning feels continuous.

Opening Stage changes the Desk's attention model rather than replacing the world with a second application. Stage Carriage docks at far-left, the same Canvas remains central, and Librarian may dock at far-right. The full Canvas Tool Cluster remains available on the shifted left edge of the Canvas.

## States & variants

- restoring previous Desk;
- normal;
- empty Board;
- object selected;
- multi-selection;
- Focus active;
- Librarian docked;
- Stage active;
- Stage + Librarian;
- degraded/offline.

## Relationships

- [[APP-001 — Global App Shell]] — provides global chrome and dock regions.
- [[DSK-002 — Canvas Viewport]] — primary spatial working field.
- [[BRD-001 — Board Context Popover]] — switches remembered Board compositions.
- [[FOC-001 — Focus Host]] — deepens selected World Objects.
- [[STG-001 — Stage Workspace State]] — live-session attention state of this same world workspace.
- [[LBR-001 — Librarian Carriage]] — contextual assistant attached to the right edge.

## Data / utility relationship

The Desk references the active Saga and Board composition. It does not own World Object content.

Board identity, Placement state, viewport restore state, and current lens are the main persistent concepts required to reconstruct the workspace.

## First Saga / empty Desk

A newly created Saga uses this exact Desk. [[SGA-003 — First Desk Empty State & Starting Actions]] may provide restrained helper copy, but ordinary Canvas tools are immediately usable. There is no creator-specific Canvas.

## Handoff

Build **DSK-001 — Desk Surface** as the default low-chrome Saga workspace composed around the Canvas Viewport and inherited App Shell.
