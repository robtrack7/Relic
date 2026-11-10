---
id: OBJ-CHAR-16
status: active
kind: component
authority: current
system: SYS-04
family: snapshots
storybook: component
depends_on:
- DS-OBJ
platforms:
- web
---

# OBJ-CHAR-16 — Character Mechanical Summary

Parent: [[OBJ-CHAR — Character Representation Family]]

## Purpose

Highly abbreviated system-aware mechanics where a full stat block is unnecessary.

## Used by

Prepare Card, compact Peeks/Search where useful, and other compact contexts. Expanded Card back uses the richer `expanded_back` profile.

## Behaviour

Rendered through the active template's `summary` profile. A D&D-like template might show `AC 15 · HP 42 · INIT +3`; other systems can prioritize entirely different values.

## Boundaries

No hard-coded universal field set and no automatic resource spending.

## Handoff

Build **OBJ-CHAR-16 — Character Mechanical Summary** as the system-template-rendered compact mechanics snapshot.
