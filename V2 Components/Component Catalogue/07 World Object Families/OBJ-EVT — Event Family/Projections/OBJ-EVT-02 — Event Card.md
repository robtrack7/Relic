---
id: OBJ-EVT-02
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

# OBJ-EVT-02 — Event Card

Parent: [[OBJ-EVT — Event Representation Family]]

## Purpose

Suggested anatomy:
- Event title;
- story position/session/date;
- one-line account;
- key participant references;
- related Place;
- related Thread where important.

The Card should answer:

> What happened here?

## Shared contracts

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-002 — World Object Projection Resolver]]
- [[OBJ-015 — Object Reference Navigation]]

## Storybook / manual test

Render this projection with realistic Event content and cover its meaningful family states. Verify it reads as the same persistent object while remaining distinct from other projection roles.

## Handoff

Implement this as an independently inspectable projection. Production code may share internal pieces with sibling projections where useful.
