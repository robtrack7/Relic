---
id: DS-SCN-CHRON
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

# DS-SCN-CHRON — Chronicle Workspace

## Purpose

Reference Storybook scene used as a visual integration test, not an alternate product specification.

## Composition

Compose Chronicle stream, Story Position control, Event/Story Change grouping, historical object projection, Then↔Now comparison and Librarian context. Validate story time as narrative history rather than audit log.

## Manual test

Inspect hierarchy, spacing, realistic density, interaction affordances, trust-state consistency and whether reused components still feel like one product. Resize across the intended web range. If a component needs a one-off visual exception without semantic reason, revise the design system rather than accepting drift.

## Rule

Use mocked/proxy data and deterministic stories so this scene is cheap to revisit after component changes.
