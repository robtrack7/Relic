---
id: DSK-014
status: active
kind: behavior
authority: current
system: SYS-02
family: canvas-tools
storybook: pattern
depends_on:
- DSK-015
- DSK-012
- DS-CAN
platforms:
- web
---

# DSK-014 — Decorative Connector Tool

Parent: [[DSK-009 — Composition Tool Menu]]

## Purpose

Lets the GM draw arrows and connectors that communicate Board composition or thought without asserting a semantic Relationship in the world model.

This supports the sketchbook/working-table quality of the Canvas and gives the GM freedom to point, bracket, sequence, and visually associate material.

## Interaction

Choosing Connector from Compose enters a temporary draw mode.

The GM can:
- drag from a Placement, Section, annotation, or free Canvas point;
- end at another Placement/Section/free point;
- choose or cycle basic line treatment;
- add an optional short label.

After creating one connector, the tool may remain active for rapid repeated drawing until Escape/Select is chosen.

## Boundaries

Decorative connectors are Board composition only.

They do not appear in semantic Relationship queries, Focus relationship blocks, Chronicle, or Librarian factual retrieval unless the Librarian is explicitly reasoning about Board composition.

Anchoring is to Board Placements/Sections, not persistent World Object identity.

## Appearance & behaviour

Should feel more like an editorial markup/drawn line than a formal graph edge.

Initial variants:
- line;
- arrow;
- double-ended arrow if useful;
- solid/dashed;
- optional short label;
- straight or gentle curved route.

Avoid a large diagramming style editor.

## Relationships

- [[DSK-015 — Decorative Connector Edge]] — rendered/editable result.
- [[DSK-009 — Composition Tool Menu]] — tool entry.
- [[DSK-012 — Semantic Connect Interaction]] — meaningful Relationship counterpart.

## Handoff

Implement **DSK-014 — Decorative Connector Tool** as the Board-only line/arrow drawing behavior distinct from semantic Connect.
