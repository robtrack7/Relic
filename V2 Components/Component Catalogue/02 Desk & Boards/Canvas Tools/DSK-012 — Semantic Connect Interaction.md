---
id: DSK-012
status: active
kind: behavior
authority: current
system: SYS-02
family: canvas-tools
storybook: pattern
depends_on:
- DSK-013
- DSK-014
- DSK-017
- DS-CAN
platforms:
- web
---

# DSK-012 — Semantic Connect Interaction

Parent: [[DSK-007 — Canvas Tool Cluster]]

## Purpose

Creates meaningful Relationships between World Objects through direct spatial interaction.

Connect exists because some relationship work is dramatically faster spatially—especially connecting many selected NPCs/entities to a common Place, Faction, group, event, or other target.

## Interaction

Two primary flows:

**Single connection**
1. select or hover a source;
2. activate Connect or drag a semantic connection handle;
3. click/drop on a compatible target;
4. create a Relationship stub and expose a compact relationship-label/type step when needed.

**Batch connection**
1. multi-select several source World Objects;
2. activate Connect;
3. click the common target;
4. create one Relationship per selected source to the target;
5. use one compact batch relationship step so a shared relation such as `member of`, `located at`, `allied with`, or custom text can be applied consistently.

Escape cancels Connect and returns to Select.

## Boundaries

Connect is semantic. It must never silently create a purely decorative arrow.

Only persistent World Objects that support Relationships participate.

Composition-only Board objects cannot become semantic relationship endpoints.

The relationship system owns directionality, type, history, truth/provenance, and relationship edge projection.

## Appearance & behaviour

Entering Connect mode changes the cursor/tool state and highlights compatible targets only when helpful.

Batch Connect should make the source set and target relationship visually obvious before commitment.

The post-connect labeling step should be compact enough that the workflow remains a time saver rather than becoming a form.

## Relationships

- [[DSK-013 — Semantic Connection Handles]] — alternate direct source gesture.
- Relationship family — owns created semantic relationships and their rendered edge.
- [[DSK-014 — Decorative Connector Tool]] — intentionally non-semantic alternative.
- [[DSK-017 — Canvas Selection Model]] — supplies single/multi-source selection.

## Data / utility relationship

Creates registered semantic Relationship identities/claims between existing World Objects. Batch connect should commit as one conceptual operation where possible so Undo is coherent.

## Handoff

Implement **DSK-012 — Semantic Connect Interaction** with both single-source and multi-selected-sources-to-one-target workflows.
