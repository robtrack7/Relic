---
id: DS-FND-COLOR
status: active
kind: primitive
authority: current
system: SYS-18
family: ds-fnd
storybook: primitive
platforms:
- web
---

# DS-FND-COLOR — Colour Roles

## Purpose

Defines semantic colour roles shared across Relic. Exact values are intentionally not frozen until Storybook design work proves them in quiet editorial and dense live contexts.

## Role groups

Establish a compact role set for: canvas/background surfaces; base/raised/floating/sunken surfaces; primary/secondary/quiet/inverse text; subtle/strong/focus borders; primary accent; destructive/warning/success information; selection/focus; proposed/pending/recent/temporal trust treatment; live/recording emphasis; and disabled state.

## Design rules

- tokens describe semantic purpose, never a literal hue such as `amberButton`;
- selection, proposal, temporal and maturity states must remain distinguishable when combined;
- never depend on colour alone for meaning;
- accent is scarce and intentional; most of Relic should remain quiet enough that world content dominates;
- contrast must survive long reading, dense Stage controls and overlays.

## Storybook / manual test

Show the role swatches, then validate them on Button, Card, selected Placement, proposed change, recent-change trace, Carriage, destructive confirmation, error and recording/live state. Include colour-blind/contrast checks before freezing values.
