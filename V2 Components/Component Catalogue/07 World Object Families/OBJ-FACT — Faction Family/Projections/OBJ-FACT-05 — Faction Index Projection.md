---
id: OBJ-FACT-05
status: active
kind: component
authority: current
system: SYS-07
family: faction
storybook: component
depends_on:
- WOF-001
- OBJ-002
- OBJ-015
platforms:
- web
---

# OBJ-FACT-05 — Faction Index Projection

Parent: [[OBJ-FACT — Faction Representation Family]]

## Purpose

Search and Library can share a Faction Index Projection:
- emblem;
- name;
- category/type;
- agenda/identity line;
- territory or leader for disambiguation;
- status where useful.

## Shared contracts

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-002 — World Object Projection Resolver]]
- [[OBJ-015 — Object Reference Navigation]]

## Storybook / manual test

Render this projection with realistic Faction content and cover its meaningful family states. Verify it reads as the same persistent object while remaining distinct from other projection roles.

## Handoff

Implement this as an independently inspectable projection. Production code may share internal pieces with sibling projections where useful.
