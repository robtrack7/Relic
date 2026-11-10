---
id: DS-SRF-SHEET
status: active
kind: component
authority: current
system: SYS-18
family: ds-srf
storybook: component
depends_on:
- DS-FND-TYPE
- DS-FND-COLOR
- DS-FND-STATE
- APP-011
platforms:
- web
---

# DS-SRF-SHEET — Adaptive Sheet & Drawer

## Purpose

Defines the shared Adaptive Sheet & Drawer presentation/interaction grammar. Global mounting and layering remain owned by APP-011.

## Design rules

Use the lightest surface that matches the task. Preserve Escape/outside-click/focus-return semantics and avoid modal interruption for routine editing.

## Storybook / manual test

Open/closed where applicable, focus traversal, long content, edge positioning, disabled actions, and constrained viewport.

Use realistic Relic copy rather than lorem ipsum. The story is a design/test fixture, not a substitute for the owning product contract.

## Implementation flexibility

Exact DOM/CSS/component composition may change as long as the approved visual and interaction contract remains coherent.
