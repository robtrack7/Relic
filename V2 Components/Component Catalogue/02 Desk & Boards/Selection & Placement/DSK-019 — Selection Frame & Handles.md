---
id: DSK-019
status: active
kind: component
authority: current
system: SYS-02
family: selection-placement
storybook: component
depends_on:
- DSK-013
- DSK-021
- DSK-020
- DS-CAN
platforms:
- web
---

# DSK-019 — Selection Frame & Handles

Parent: [[DSK-017 — Canvas Selection Model]]

## Purpose

Makes the selected Placement or selection set legible and supplies spatial manipulation handles without changing the content component itself.

## Context & placement

Rendered as Canvas interaction chrome around the selected Placement bounds or aggregate multi-selection bounds.

## Anatomy

- selection outline;
- resize handles where the selected representation supports resizing;
- multi-selection bounds;
- optional rotation is intentionally absent unless a later composition object requires it.

Semantic connection handles are owned separately by [[DSK-013 — Semantic Connection Handles]].

## Appearance & behaviour

Precise but restrained.

Resize handles and semantic-connect handles must be visibly different.

For a single card, the component's own selected treatment can combine with the outer selection frame without creating excessive boxes.

## States & variants

- single selection;
- resizable;
- fixed-size representation;
- multi-selection;
- locked Placement.

## Relationships

- [[DSK-021 — Placement Resize & Disclosure]] — resize behavior.
- [[DSK-020 — Placement Drag]] — move behavior.
- [[DSK-013 — Semantic Connection Handles]] — relationship gesture.

## Handoff

Build **DSK-019 — Selection Frame & Handles** as the shared spatial selection chrome around Board Placements and selection sets.
