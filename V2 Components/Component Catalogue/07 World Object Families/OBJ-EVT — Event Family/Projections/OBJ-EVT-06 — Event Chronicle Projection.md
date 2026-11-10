---
id: OBJ-EVT-06
status: active
kind: component
authority: current
system: SYS-07
family: event
storybook: component
depends_on:
- WOF-001
- OBJ-002
- OBJ-015
platforms:
- web
---

# OBJ-EVT-06 — Event Chronicle Projection

Parent: [[OBJ-EVT — Event Representation Family]]

## Purpose

Chronicle Projection is the Event family's primary contextual projection.

It should optimize:
- story position;
- concise occurrence;
- participants;
- related Thread;
- consequence;
- as-of navigation.

Chronicle determines larger timeline geometry; Event supplies its semantic temporal content.

## Shared contracts

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-002 — World Object Projection Resolver]]
- [[OBJ-015 — Object Reference Navigation]]

## Storybook / manual test

Render this projection with realistic Event content and cover its meaningful family states. Verify it reads as the same persistent object while remaining distinct from other projection roles.

## Handoff

Implement this as an independently inspectable projection. Production code may share internal pieces with sibling projections where useful.
