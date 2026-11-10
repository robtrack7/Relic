---
id: DS-SRF-DIVIDER
status: active
kind: primitive
authority: current
system: SYS-18
family: ds-srf
storybook: primitive
depends_on:
- DS-FND-COLOR
- DS-FND-SPACING
- DS-FND-SHAPE
platforms:
- web
---

# DS-SRF-DIVIDER — Divider

## Purpose

A quiet structural separator used only when spacing and hierarchy are not enough to distinguish adjacent regions.

## Variants

- horizontal full-width;
- horizontal inset/aligned to content;
- vertical separator for compact control groups when useful.

## Rules

Dividers are low-emphasis structure, not decoration. Avoid placing them between every row. Prefer whitespace when it communicates hierarchy more elegantly. The consuming surface owns surrounding spacing.

A decorative divider should be ignored by assistive technology. If a boundary is semantically meaningful, use proper section/document structure rather than relying on a line.

## Storybook / manual test

Show full/inset dividers between realistic Relic blocks, a vertical toolbar separator, dense versus spacious contexts, and contrast against base/raised surfaces.
