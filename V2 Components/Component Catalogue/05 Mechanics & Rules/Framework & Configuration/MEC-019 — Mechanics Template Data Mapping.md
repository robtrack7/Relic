---
id: MEC-019
status: active
kind: behavior
authority: current
system: SYS-05
family: framework-configuration
storybook: none
---

# MEC-019 — Mechanics Template Data Mapping

Parent: [[SYS-05 — Mechanics & Rules]]

## Purpose

Preserves mechanics information when a template is upgraded, cloned, or replaced.

## Behaviour

Map by stable field ID, declared migration, compatible semantic field, or explicit user mapping. Unmapped data stays recoverable until intentionally discarded. Never silently delete mechanics data.

## Handoff

Implement **MEC-019 — Mechanics Template Data Mapping** as the safe migration layer between template versions/profiles.
