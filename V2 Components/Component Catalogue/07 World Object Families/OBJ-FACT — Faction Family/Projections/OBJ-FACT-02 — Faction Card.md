---
id: OBJ-FACT-02
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

# OBJ-FACT-02 — Faction Card

Parent: [[OBJ-FACT — Faction Representation Family]]

## Purpose

The normal Faction Card answers:

> Who are they and what do they want?

Suggested anatomy:
- emblem/image;
- name;
- concise identity/agenda phrase;
- one or two current cues such as leader, territory, status, or active Thread pressure.

Avoid member counts, raw metadata, and long relationship lists on the normal Card.

## Shared contracts

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-002 — World Object Projection Resolver]]
- [[OBJ-015 — Object Reference Navigation]]

## Storybook / manual test

Render this projection with realistic Faction content and cover its meaningful family states. Verify it reads as the same persistent object while remaining distinct from other projection roles.

## Handoff

Implement this as an independently inspectable projection. Production code may share internal pieces with sibling projections where useful.
