---
id: OBJ-PLACE-05
status: active
kind: component
authority: current
system: SYS-07
family: place
storybook: component
depends_on:
- WOF-001
- OBJ-002
- OBJ-015
platforms:
- web
---

# OBJ-PLACE-05 — Place Index Projection

Parent: [[OBJ-PLACE — Place Representation Family]]

## Purpose

Search and Library should share a Place Index Projection unless later design proves otherwise.

Suggested anatomy:
- small image/map;
- Place name;
- category/scale;
- parent/region context;
- concise disambiguating line;
- current status only when useful.

Search can add query-match highlighting without requiring another family component.

## Shared contracts

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-002 — World Object Projection Resolver]]
- [[OBJ-015 — Object Reference Navigation]]

## Storybook / manual test

Render this projection with realistic Place content and cover its meaningful family states. Verify it reads as the same persistent object while remaining distinct from other projection roles.

## Handoff

Implement this as an independently inspectable projection. Production code may share internal pieces with sibling projections where useful.
