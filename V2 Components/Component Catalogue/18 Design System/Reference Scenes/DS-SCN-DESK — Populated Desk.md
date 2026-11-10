---
id: DS-SCN-DESK
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

# DS-SCN-DESK — Populated Desk

## Purpose

Reference Storybook scene used as a visual integration test, not an alternate product specification.

## Composition

Compose realistic World Object cards, Board Sections, semantic Relationships, one decorative connector, selection, Canvas tools and proposal/recent-change state. Validate spatial hierarchy, whitespace and family cohesion.

## Manual test

Inspect hierarchy, spacing, realistic density, interaction affordances, trust-state consistency and whether reused components still feel like one product. Resize across the intended web range. If a component needs a one-off visual exception without semantic reason, revise the design system rather than accepting drift.

## Rule

Use mocked/proxy data and deterministic stories so this scene is cheap to revisit after component changes.
