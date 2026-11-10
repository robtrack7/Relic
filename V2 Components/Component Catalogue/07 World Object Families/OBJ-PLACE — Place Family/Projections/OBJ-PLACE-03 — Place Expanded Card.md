---
id: OBJ-PLACE-03
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

# OBJ-PLACE-03 — Place Expanded Card

Parent: [[OBJ-PLACE — Place Representation Family]]

## Purpose

The Expanded Place Card remains narrative/spatial by default.

Suggested anatomy:
- larger image/map;
- name and category;
- concise description/atmosphere;
- current status;
- notable contained Places;
- important inhabitants/presences;
- active Threads;
- recent relevant Event;
- compact GM reminder where useful.

It should not simply stretch the normal Card.

Default implementation is one-sided.

A Place may opt into [[OBJ-016 — Two-Sided Expanded Card Host]] only when it has a genuinely useful alternate face, such as:
- tactical/local map reference;
- travel/environment mechanics;
- location-specific rules.

That alternate face is optional, not part of the base Place contract.

## Shared contracts

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-002 — World Object Projection Resolver]]
- [[OBJ-015 — Object Reference Navigation]]

## Storybook / manual test

Render this projection with realistic Place content and cover its meaningful family states. Verify it reads as the same persistent object while remaining distinct from other projection roles.

## Handoff

Implement this as an independently inspectable projection. Production code may share internal pieces with sibling projections where useful.
