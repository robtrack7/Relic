---
id: DS-FND-SPACING
status: active
kind: primitive
authority: current
system: SYS-18
family: ds-fnd
storybook: primitive
platforms:
- web
---

# DS-FND-SPACING — Spacing & Sizing Scale

## Purpose

Defines a small semantic spacing/sizing rhythm so Relic feels deliberately composed rather than individually padded component by component. Exact values are tuned in Storybook.

## Scale intent

Support at least: micro/icon gaps; inline control gaps; compact row padding; normal component padding; section spacing; major workspace separation; and stable control/icon sizes. Use a small coherent scale rather than dozens of one-off values.

## Rules

- whitespace is a primary hierarchy tool; prefer it over unnecessary dividers and boxes;
- dense Stage/Canvas controls may use compact steps while Focus and editorial reading retain breathing room;
- host surfaces own outer placement spacing; children own internal anatomy spacing;
- optical adjustment is allowed when a mathematically exact token looks visibly wrong, but record reusable exceptions rather than proliferating magic numbers.

## Storybook / manual test

Compare dense and editorial compositions side by side: toolbar, menu, Card, Focus blocks, Carriage sections and Settings form. Approve the scale only after components compose without recurring local overrides.
