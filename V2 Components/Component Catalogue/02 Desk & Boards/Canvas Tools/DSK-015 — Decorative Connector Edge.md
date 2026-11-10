---
id: DSK-015
status: active
kind: component
authority: current
system: SYS-02
family: canvas-tools
storybook: component
depends_on:
- BRD-006
- BRD-007
- DS-CAN
platforms:
- web
---

# DSK-015 — Decorative Connector Edge

Parent: [[DSK-014 — Decorative Connector Tool]]

## Purpose

Renders and edits a Board-only decorative line or arrow created by the GM.

## Context & placement

Lives in Canvas/Board coordinates.

Endpoints may be:
- anchored to a Placement;
- anchored to a Section;
- free Canvas points.

Anchored endpoints move with the referenced Board object.

If an anchored Placement is removed from the Board, the connector is removed with the same undoable composition operation rather than leaving an unexplained dangling semantic-looking line.

## Anatomy

- path;
- optional start/end arrowhead;
- optional label;
- endpoint anchors;
- contextual edit handles when selected.

Keep style choices deliberately limited.

## Appearance & behaviour

Visually distinguish decorative connectors from semantic Relationship projections.

A decorative line can be looser, more annotation-like, or more visibly editorial; semantic Relationships should carry clearer identity/type cues.

Selection reveals endpoint/path/style controls. Resting connectors should have minimal chrome.

## States & variants

- line;
- arrow;
- double arrow;
- solid/dashed;
- labelled/unlabelled;
- selected.

## Relationships

- [[DSK-014 — Decorative Connector Tool]] — creates edges.
- [[BRD-006 — Placement Host]] — possible endpoint anchor.
- [[BRD-007 — Board Section]] — possible endpoint anchor.

## Data / utility relationship

Stored entirely as Board composition data, including path/style/anchors. It never creates or modifies a semantic Relationship.

## Handoff

Build **DSK-015 — Decorative Connector Edge** as the editable Board-only line/arrow component with free or Placement-anchored endpoints.
