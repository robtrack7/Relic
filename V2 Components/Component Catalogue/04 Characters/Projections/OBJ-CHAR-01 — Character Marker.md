---
id: OBJ-CHAR-01
status: active
kind: component
authority: current
system: SYS-04
family: projections
storybook: component
depends_on:
- DSK-026
- OBJ-CHAR-02
- OBJ-003
- DS-OBJ
platforms:
- web
---

# OBJ-CHAR-01 — Character Marker

Parent: [[OBJ-CHAR — Character Representation Family]]

## Purpose

Far-distance semantic-zoom rendering of the Small Character Card used when the Canvas is too zoomed out for a readable card.

## Context & placement

Rendered through the same Board Placement when [[DSK-026 — Semantic Zoom]] selects the far representation.

## Anatomy

Portrait/visual mark when available, Character name, optional very short role cue, and subtle maturity treatment. At extreme scale it simplifies the Small Card to image/initial + name; it is not a separate user-facing Marker disclosure or interaction.

## Appearance & behaviour

A labelled far Small Card rendering, not a separate card version. Selection remains possible. Zooming in restores [[OBJ-CHAR-02 — Character Card]] while preserving Placement identity and coordinates.

## Relationships

- [[DSK-026 — Semantic Zoom]]
- [[OBJ-CHAR-02 — Character Card]]
- [[OBJ-003 — Representation Transition Coordinator]]

## Handoff

Build **OBJ-CHAR-01 — Character Marker** as the separately coded far-zoom Character projection.
