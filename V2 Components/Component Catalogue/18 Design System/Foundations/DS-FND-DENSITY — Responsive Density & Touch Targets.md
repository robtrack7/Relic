---
id: DS-FND-DENSITY
status: active
kind: primitive
authority: current
system: SYS-18
family: ds-fnd
storybook: primitive
platforms:
- web
---

# DS-FND-DENSITY — Responsive Density & Touch Targets

## Purpose

Defines density and usable target expectations for the current web product across wide and constrained browser layouts. Mobile-native composition is later; current components should still work on touch-capable web devices where practical.

## Density modes

Use semantic density rather than arbitrary per-component shrinking: normal editorial; compact operational (Canvas/Stage/toolbars); and spacious reading where Focus/content benefits. A component should not expose density variants unless a real host requires them.

## Rules

- compact visual glyphs can sit inside larger hit targets;
- preserve keyboard and pointer precision at dense scales;
- constrained web layouts may adapt composition without pretending to be the future native UI;
- avoid making Stage universally tiny simply because it is information-rich;
- test browser zoom and common laptop widths early.

## Storybook / manual test

Show normal/compact components in realistic Canvas, Carriage, Focus and Settings contexts at representative wide and constrained web viewports. Validate usable target size, wrapping and collision behavior.
