---
id: OBJ-FRAG-06
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

# OBJ-FRAG-06 — Fragment Index Projection

Parent: [[OBJ-FRAG — Fragment Representation Family]]

## Purpose

Search and Library can share:
- first-line/title;
- short excerpt;
- image cue;
- provenance/session;
- maturity;
- suggested/known type only when relevant.

## Shared contracts

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-002 — World Object Projection Resolver]]
- [[OBJ-015 — Object Reference Navigation]]

## Storybook / manual test

Render this projection with realistic Fragment content and cover its meaningful family states. Verify it reads as the same persistent object while remaining distinct from other projection roles.

## Handoff

Implement this as an independently inspectable projection. Production code may share internal pieces with sibling projections where useful.
