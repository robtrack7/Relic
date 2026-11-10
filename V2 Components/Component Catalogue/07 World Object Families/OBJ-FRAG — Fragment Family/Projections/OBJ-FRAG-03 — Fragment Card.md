---
id: OBJ-FRAG-03
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

# OBJ-FRAG-03 — Fragment Card

Parent: [[OBJ-FRAG — Fragment Representation Family]]

## Purpose

Fragment Card is one of the most direct-editable objects in Relic.

Suggested anatomy:
- content / first lines;
- optional image;
- optional lightweight title;
- tiny provenance/session cue;
- maturity treatment;
- optional resolution/type suggestion cue only when useful.

A Fragment must remain valid with no title and no classification.

## Shared contracts

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-002 — World Object Projection Resolver]]
- [[OBJ-015 — Object Reference Navigation]]

## Storybook / manual test

Render this projection with realistic Fragment content and cover its meaningful family states. Verify it reads as the same persistent object while remaining distinct from other projection roles.

## Handoff

Implement this as an independently inspectable projection. Production code may share internal pieces with sibling projections where useful.
