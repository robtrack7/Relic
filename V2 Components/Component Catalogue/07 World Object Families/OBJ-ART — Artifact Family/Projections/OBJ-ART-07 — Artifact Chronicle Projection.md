---
id: OBJ-ART-07
status: prototype
kind: component
authority: current
system: SYS-07
family: artifact
storybook: component
depends_on:
- WOF-001
- OBJ-002
- OBJ-015
platforms:
- web
---

# OBJ-ART-07 — Artifact Chronicle Projection

Parent: [[OBJ-ART — Artifact Representation Family]]

## Purpose

A dedicated Chronicle Projection is contextual rather than mandatory.

Use it where holder, location, state, ownership, destruction, discovery, or activation history matters.

Historical Artifact projection must resolve the relevant state as-of that story position.

## Shared contracts

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-002 — World Object Projection Resolver]]
- [[OBJ-015 — Object Reference Navigation]]

## Storybook / manual test

Render this projection with realistic Artifact content and cover its meaningful family states. Verify it reads as the same persistent object while remaining distinct from other projection roles.

## Handoff

Implement this as an independently inspectable projection. Production code may share internal pieces with sibling projections where useful.
