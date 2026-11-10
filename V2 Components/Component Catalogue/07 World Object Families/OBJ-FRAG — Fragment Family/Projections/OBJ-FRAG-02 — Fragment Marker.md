---
id: OBJ-FRAG-02
status: active
kind: component
authority: current
system: SYS-07
family: fragment
storybook: component
depends_on:
- WOF-001
- OBJ-002
- OBJ-015
platforms:
- web
---

# OBJ-FRAG-02 — Fragment Marker

Parent: [[OBJ-FRAG — Fragment Representation Family]]

## Purpose

At far scale, show a tiny scrap/note/image mark with a short first-line/title excerpt.

The marker should communicate lightweight thought rather than a full typed entity.

## Shared contracts

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-002 — World Object Projection Resolver]]
- [[OBJ-015 — Object Reference Navigation]]

## Storybook / manual test

Render this projection with realistic Fragment content and cover its meaningful family states. Verify it reads as the same persistent object while remaining distinct from other projection roles.

## Handoff

Implement this as an independently inspectable projection. Production code may share internal pieces with sibling projections where useful.
