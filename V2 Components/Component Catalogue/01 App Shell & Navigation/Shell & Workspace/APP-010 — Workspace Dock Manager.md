---
id: APP-010
status: prototype
kind: behavior
authority: current
system: SYS-01
family: shell-workspace
storybook: none
depends_on:
- LBR-001
- STG-002
- DSK-002
---

# APP-010 — Workspace Dock Manager

Parent: [[APP-001 — Global App Shell]]

## Purpose

Workspace Dock Manager owns the spatial relationship between Relic's central working surface and its left/right carriages.

Without one shared behavior, Stage, Librarian, Canvas, Focus, and responsive layouts would each make conflicting decisions about available width.

## Interaction

The Shell can host:

- no carriage;
- left Stage Carriage;
- right Librarian Carriage;
- right Focus carriage;
- Focus + Librarian together when measured space permits;
- both Stage and right-side carriage states simultaneously.

### Wide workspace

Carriages are persistent non-modal overlays of the central surface. Opening them may obscure Placements but does not resize or reposition the Canvas, change its camera/zoom, or move the global header, Search, or primary Canvas tool dock. Unobscured Canvas areas remain interactive. Navigation controls may follow a carriage edge independently of Canvas coordinates.

### Constrained workspace

A single open carriage shares the available width with an interactive central surface when docking it would reduce that surface below its useful minimum. This is a shared working state, not a modal overlay: there is no scrim, click-away dismissal, or forced focus trap.

When both right-side carriages are requested and the available width cannot support both plus a useful central surface, retain both mounted states and expose an explicit Focus/Librarian switch, with the most recently requested panel visible. Where the wider two-carriage split is useful, it remains available with a resizable divider, content minimums, keyboard resizing, and remembered ratio. The central Entity Builder receives priority over a simultaneous live Focus preview when the pair cannot fit.

Closing either carriage exits the split and returns to the remaining carriage sharing the central surface. The Canvas, Focus, Builder, Librarian, and Stage trees remain mounted or recoverable through these transitions so camera, placement, draft, and disclosure state survive.

The breakpoint is derived from the desired carriage widths and the active surface's useful minimum (720px for Canvas), not from a hardcoded device-width breakpoint.

## Boundaries

Dock Manager owns:

- overlay vs shared vs split geometry decision;
- central workspace origin and usable bounds;
- stable viewport-anchored chrome and independent placement of edge-following navigation controls;
- carriage opening/closing geometry;
- Focus/Builder/Librarian measured coexistence and explicit switching;
- transition between geometry states;
- restoration of prior carriage open/collapsed preference;
- remembered ratio for the constrained two-carriage split;
- preventing carriage collisions.

It does not own:

- carriage internal content;
- Canvas pan/zoom;
- Focus content;
- Builder content;
- Stage lifecycle.

## Transition behaviour

Overlay and split transitions preserve spatial orientation; wide-screen carriage transitions never displace the Canvas.

On wide layouts, physical Canvas bounds and the primary tool dock stay fixed throughout carriage changes. Constrained shared layouts may change the central visible bounds while preserving camera and Placement state. Relic identity, current context, Search, Librarian toggle, and Profile remain anchored to the application viewport.

Explicit Fit View/Fit Selection use the actual Canvas viewport. Merely opening or closing a carriage never invokes a fit operation.

Reduced-motion preference should use immediate/restrained geometry changes.

Carriage drafts and section disclosure state survive collapse, reopening, and transitions between docked, shared, and split presentation. Closing a carriage returns keyboard focus to its visible launcher or global toggle.

## Relationships

- [[APP-001 — Global App Shell]] — supplies the dock regions.
- [[LBR-001 — Librarian Carriage]] — right-side carriage.
- [[STG-002 — Stage Carriage]] — left-side carriage.
- [[DSK-002 — Canvas Viewport]] — responds to changed visible bounds.
- [[FOC-001 — Focus Host]] — right-side editorial carriage.
- [[FOC-013 — Entity Builder Host]] — central authoring host and measured preview relationship.

## Handoff

Build **APP-010 — Workspace Dock Manager** as the single shared behavior controlling left/right carriage docking, shared constrained workspaces, the resizable dual-carriage split, central usable bounds, and geometry fallback.
