---
id: DS-SCN-FOCUS
status: active
kind: surface
authority: current
system: SYS-18
family: ds-scn
storybook: scene
depends_on:
- DS-FND-TYPE
- DS-FND-COLOR
- DS-FND-SPACING
platforms:
- web
---

# DS-SCN-FOCUS — Character Focus + Librarian

## Purpose

Reference Storybook scene used as a visual integration test, not an alternate product specification.

## Composition

Compose Character Focus with realistic narrative, mechanics, history and provenance beside the Librarian. Validate long-form hierarchy, inline editing, citations, proposal state and deep-object/AI coexistence.

## Manual test

Inspect hierarchy, spacing, realistic density, interaction affordances, trust-state consistency and whether reused components still feel like one product. Resize across the intended web range. If a component needs a one-off visual exception without semantic reason, revise the design system rather than accepting drift.

## Rule

Use mocked/proxy data and deterministic stories so this scene is cheap to revisit after component changes.
