---
id: OBJ-FACT-03
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

# OBJ-FACT-03 — Faction Expanded Card

Parent: [[OBJ-FACT — Faction Representation Family]]

## Purpose

Suggested anatomy:
- larger emblem/image;
- identity/agenda;
- current status;
- leadership;
- important members;
- territory;
- allies/opponents;
- active Threads;
- major resources/holdings;
- one GM reminder.

Default is one-sided.

If a game system gives organizations meaningful mechanical profiles, a Faction can optionally use [[FOC-BLK-005 — Mechanics Block Host]] in Focus or a two-sided Expanded Card through the shared mechanics infrastructure. That is system-specific, not mandatory.

## Shared contracts

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-002 — World Object Projection Resolver]]
- [[OBJ-015 — Object Reference Navigation]]

## Storybook / manual test

Render this projection with realistic Faction content and cover its meaningful family states. Verify it reads as the same persistent object while remaining distinct from other projection roles.

## Handoff

Implement this as an independently inspectable projection. Production code may share internal pieces with sibling projections where useful.
