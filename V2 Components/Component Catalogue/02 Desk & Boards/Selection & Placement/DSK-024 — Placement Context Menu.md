---
id: DSK-024
status: active
kind: component
authority: current
system: SYS-02
family: selection-placement
storybook: component
depends_on:
- BRD-010
- APP-011
- DS-CAN
platforms:
- web
---

# DSK-024 — Placement Context Menu

Parent: [[BRD-006 — Placement Host]]

## Purpose

Provides the complete contextual action set for an individual Board Placement without overloading the Selection Toolbar.

## Context & placement

Opened by right-click/context gesture on a Placement and mounted through the global overlay host.

Anchored near the interaction point while remaining inside usable viewport bounds.

## Anatomy

Generic World Object actions may include:
- Focus;
- expand/collapse representation where supported;
- semantic Connect;
- move/copy to Board;
- lock/unlock Placement;
- bring forward/send backward;
- remove from this Board;
- type-specific actions;
- More/details when required.

**Delete World Object** must be visually and semantically separated from **Remove from Board** and may require stronger confirmation depending on consequences.

## Appearance & behaviour

Text-forward, grouped, and conventional enough to scan quickly.

Actions that alter only Placement should be grouped separately from actions that affect persistent World identity/content.

Context menus for Sections, annotations, Board Links, and decorative edges adapt to those composition-only types.

## Relationships

- [[BRD-006 — Placement Host]] — selected context.
- [[BRD-010 — Move or Copy to Board Picker]] — Board destination.
- World Object family — contributes type-specific actions.
- [[APP-011 — Global Overlay Host]] — mounting/dismissal.

## Handoff

Build **DSK-024 — Placement Context Menu** with a clear distinction between Board-local actions and persistent World Object actions.
