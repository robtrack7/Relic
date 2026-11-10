---
id: MEC-001
status: active
kind: family
authority: current
system: SYS-05
family: framework-configuration
storybook: none
---

# MEC-001 — Mechanics Framework

Parent: [[SYS-05 — Mechanics & Rules]]

## Purpose

Game-system-independent foundation for storing, rendering, editing, and referencing TTRPG mechanics without hard-coding Character UI to one rules engine.

## Architecture

A Mechanics Profile combines Template Definition, object mechanics data, system symbol pack, presentation profile, and optional Rules Reference bindings. Templates can define PC, NPC, adversary, simplified creature, or other role variants.

## Presentation profiles

At minimum: `summary`, `expanded_back`, `full_focus`, and `encounter_reference`. A template decides which modules appear in each.

## Boundaries

Mechanics are reference/editing data. They do not imply automatic combat resolution, rule adjudication, or automatic resource spending.

## Handoff

Implement **MEC-001 — Mechanics Framework** as the reusable foundation for system templates and custom mechanics layouts.
