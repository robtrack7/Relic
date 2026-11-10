---
id: DSK-013
status: active
kind: component
authority: current
system: SYS-02
family: canvas-tools
storybook: component
depends_on:
- DSK-019
- DS-CAN
platforms:
- web
---

# DSK-013 — Semantic Connection Handles

Parent: [[DSK-012 — Semantic Connect Interaction]]

## Purpose

Provides a contextual direct-manipulation affordance for starting a semantic Relationship from an existing World Object without first choosing Connect from the tool rail.

## Context & placement

Appears around the selected or intentionally hovered compatible World Object projection.

The handle is screen-space UI anchored to the Placement bounds; it is not part of the card's persistent visual anatomy.

## Anatomy

- small relationship/connector handle;
- drag affordance;
- optional tooltip.

Do not show four large diagramming ports around every card by default.

## Appearance & behaviour

Nearly invisible until relevant.

Dragging the handle invokes [[DSK-012 — Semantic Connect Interaction]] and highlights compatible targets.

The handle should look materially different from resize handles.

## States & variants

- hidden;
- available;
- dragging;
- target compatible/incompatible.

## Relationships

- [[DSK-012 — Semantic Connect Interaction]] — owns the relationship gesture.
- [[DSK-019 — Selection Frame & Handles]] — ensures resize and relationship handles remain visually distinguishable.

## Handoff

Build **DSK-013 — Semantic Connection Handles** as the subtle contextual entry into semantic Relationship creation.
