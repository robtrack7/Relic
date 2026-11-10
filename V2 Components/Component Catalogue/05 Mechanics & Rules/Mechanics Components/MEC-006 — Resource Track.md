---
id: MEC-006
status: active
kind: component
authority: current
system: SYS-05
family: mechanics-components
storybook: component
depends_on:
- MEC-022
- MEC-023
- DS-MEC
platforms:
- web
---

# MEC-006 — Resource Track

Parent: [[SYS-05 — Mechanics & Rules]]

## Purpose

Renders finite or mutable resources such as HP, Stress, Hope, Fear, spell slots, Ki, Energy, Luck, armor slots, ammunition, charges, integrity or system-specific pools.

## Anatomy

Template-selectable current/max number, counter, boxes, pips/dots, segmented track, token pool, recharge toggle, or custom adapter.

## Runtime behaviour

When live, values can bind to [[MEC-022 — Session Mechanics State]] according to [[MEC-023 — Live Resource Definition]]. Values are manually editable; Relic does not automatically spend, restore, apply damage or adjudicate them.

## Handoff

Build **MEC-006 — Resource Track** as the reusable resource renderer for persistent mechanics and optional Session runtime state.
