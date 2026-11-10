---
id: MEC-018
status: active
kind: component
authority: current
system: SYS-05
family: mechanics-components
storybook: component
depends_on:
- DS-MEC
platforms:
- web
---

# MEC-018 — Object Mechanics Assignment

Parent: [[SYS-05 — Mechanics & Rules]]

## Purpose

Assigns/overrides the mechanics template/profile used by a Character or other mechanically relevant World Object.

## Use

Object can inherit Saga default, select another system template, choose PC/NPC/adversary variant, or use a custom template.

## Behaviour

Changing templates warns when fields cannot map automatically. Existing mechanics data is preserved until mapping is confirmed.

## Handoff

Build **MEC-018 — Object Mechanics Assignment** as the per-object template/profile selector.
