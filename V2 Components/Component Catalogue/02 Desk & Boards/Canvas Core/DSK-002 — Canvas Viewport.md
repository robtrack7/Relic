---
id: DSK-002
status: prototype
kind: surface
authority: current
system: SYS-02
family: canvas-core
storybook: scene
depends_on:
- DSK-007
- DSK-005
- DSK-031
- DS-CAN
platforms:
- web
---

# DSK-002 — Canvas Viewport

Parent: [[DSK-001 — Desk Surface]]

## Purpose

The Canvas Viewport is the spatial window through which the GM sees and manipulates the active Board.

It owns the relationship between world-space Board coordinates and the currently visible screen-space region. It displays Placements, Sections, annotations, decorative edges, semantic relationship projections, and Librarian proposals without owning the underlying World Objects.

## Context & placement

The viewport fills nearly all available Desk space.

Global shell controls and Desk tools float around its edges in screen space. On standard desktop, Stage and Librarian overlay the existing Canvas without changing its physical bounds, origin, camera, or Placement screen positions. Constrained shared/split layouts are owned by the Dock Manager.

All Board content lives in canvas coordinates. Selection toolbars, menus, handles, minimap, view controls, and proposal controls are screen-space or viewport-relative overlays.

## Viewport chrome

**Top-left**
- inherited global Relic identity and navigation remain fixed by the shell;
- Canvas-local chrome is anchored to the central viewport rather than the browser edge.

**Upper working frame**
- inherited Current Context;
- Global Search;
- optional Active Session Return.

**Top-right**
- inherited Librarian and Profile.

**Bottom-centre**
- [[DSK-007 — Canvas Tool Cluster]].

**Lower central bounds**
- [[DSK-005 — View Controls]] and [[DSK-031 — Contextual Minimap]] when active, remaining within the visible central workspace.

**Contextual**
- [[DSK-019 — Selection Frame & Handles]];
- [[DSK-016 — Selection Toolbar]];
- [[DSK-013 — Semantic Connection Handles]];
- [[DSK-022 — Alignment & Snap Guides]];
- menus;
- [[DSK-029 — Canvas Proposal Layer]].

## Use

The GM pans and zooms through the Board, selects and manipulates Placements, captures new material, creates composition-only objects, establishes Relationships, draws decorative connections, and opens rich objects into Focus.

Spatial organization may be neat, messy, clustered, radial, chronological, or entirely personal. Relic should support authored spatial thinking without turning the Canvas into a diagramming application.

## Appearance & behaviour

The resting viewport is a warm, quiet field with a restrained dot grid.

Pan and zoom must feel immediate, trackpad-native, cursor-anchored, and interruptible. The viewport should remain responsive even when many lightweight placements are visible.

Opening Search, Focus, Stage, Librarian, or transient menus must preserve the underlying spatial location.

Canvas geometry changes Placement/composition state only. It never silently changes semantic truth.

## States & variants

- resting;
- single selection;
- multi-selection;
- dragging;
- resizing;
- semantic connect mode;
- composition draw mode;
- Focus active;
- proposal visible;
- minimap visible;
- carriage overlay / constrained shared viewport.

## Responsive behaviour

Wide web layouts preserve full spatial interaction.

Wide-screen carriage changes preserve Canvas size and screen positions. Constrained shared layouts recalculate available bounds while retaining the camera and world coordinates; split layouts retain the mounted Canvas for restoration.

At very narrow widths, the product may substitute an ordered representation for some Board interactions rather than forcing a tiny infinite canvas. That narrow representation is a later responsive projection, not a second Board data model.

## Relationships

- [[DSK-004 — Canvas Camera Navigation]] — owns pan/zoom camera mechanics.
- [[BRD-006 — Placement Host]] — mounts spatial World Object projections.
- [[DSK-007 — Canvas Tool Cluster]] — primary persistent canvas tools.
- [[APP-010 — Workspace Dock Manager]] — changes visible usable bounds.
- [[DSK-027 — Focus Invocation]] — records and restores the originating viewport.

## Data / utility relationship

Reads the active Board composition and viewport restore state.

Writes camera/viewport state separately from Board Placements. Placement geometry is persisted by Board composition infrastructure.

## Handoff

Build **DSK-002 — Canvas Viewport** as the performant spatial window onto the active Board, preserving coordinates across shell and carriage changes.
