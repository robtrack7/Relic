---
id: DSK-026
status: prototype
kind: behavior
authority: current
system: SYS-02
family: canvas-core
storybook: pattern
depends_on:
- DSK-021
- DSK-004
- DS-CAN
platforms:
- web
---

# DSK-026 — Semantic Zoom

Parent: [[DSK-002 — Canvas Viewport]]

## Purpose

Reduces visual complexity as the GM zooms far away from Board content while preserving recognition and spatial meaning.

## Interaction

Representation families can define a small set of camera-driven semantic-zoom treatments.

Typical example:
`simplified Small Character Card ↔ Small Character Card`

As the camera moves beyond the useful reading scale for a Card, the placement transitions to its Marker representation. Zooming back restores the Card.

## Boundaries

Semantic Zoom should primarily handle **far / normal** representation changes.

It should not automatically promote normal cards into Expanded Cards or Focus merely because the user zoomed closer. Those are intentional local disclosure choices.

The underlying Placement and World Object identity remain unchanged.

## Appearance & behaviour

Transitions should be stable and use hysteresis so representations do not flicker around threshold boundaries.

Far Small Card views must preserve enough identity—name, image/mark, type cue—to support orientation. This is a rendering simplification of the Small Card, not a separate user-facing Marker form or an additional disclosure level.

## Relationships

- World Object representation families — define Marker/Card projections.
- [[DSK-021 — Placement Resize & Disclosure]] — intentional local disclosure counterpart.
- [[DSK-004 — Canvas Camera Navigation]] — supplies zoom level.

## Handoff

Implement **DSK-026 — Semantic Zoom** as stable camera-driven far/normal representation switching, not automatic deep disclosure.
