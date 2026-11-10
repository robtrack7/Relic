---
id: OBJ-PLACE-07
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

# OBJ-PLACE-07 — Place Chronicle Projection

Parent: [[OBJ-PLACE — Place Representation Family]]

## Purpose

A dedicated Place Chronicle Projection is warranted because Places can change meaningfully over time.

It may show:
- Place name;
- status as-of story position;
- ownership/occupancy at that time;
- relevant Event;
- relevant Thread.

Examples of meaningful change:
- destroyed;
- occupied;
- renamed;
- discovered;
- rebuilt;
- changed control.

Historical projection must not leak current Place state backward.

## Shared contracts

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-002 — World Object Projection Resolver]]
- [[OBJ-015 — Object Reference Navigation]]

## Storybook / manual test

Render this projection with realistic Place content and cover its meaningful family states. Verify it reads as the same persistent object while remaining distinct from other projection roles.

## Handoff

Implement this as an independently inspectable projection. Production code may share internal pieces with sibling projections where useful.
