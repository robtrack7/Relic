---
id: DSK-022
status: active
kind: behavior
authority: current
system: SYS-02
family: selection-placement
storybook: pattern
depends_on:
- DSK-006
- DSK-020
- DSK-021
- DS-CAN
platforms:
- web
---

# DSK-022 — Alignment & Snap Guides

Parent: [[DSK-002 — Canvas Viewport]]

## Purpose

Makes arranging a Board pleasant and precise enough when desired without imposing rigid diagram cleanliness.

## Interaction

While moving/resizing, temporarily show useful guides for:
- aligned edges;
- aligned centres;
- repeated spacing;
- optional grid snap.

Snapping should be easy to override with a modifier when the GM wants rough/manual placement.

## Appearance & behaviour

Guides are extremely thin, temporary, and low-noise.

Do not show dimensions, coordinate labels, or CAD-style measurement readouts by default.

Grid snapping may remain enabled even if the visible dot grid is hidden.

## States & variants

- alignment guides on/off;
- grid snap on/off;
- spacing guide;
- temporary snap override.

## Relationships

- [[DSK-006 — Canvas View Options]] — preference controls.
- [[DSK-020 — Placement Drag]] — primary consumer.
- [[DSK-021 — Placement Resize & Disclosure]] — resize alignment.

## Handoff

Implement **DSK-022 — Alignment & Snap Guides** as subtle optional alignment, spacing, and grid-snap feedback during manipulation.
