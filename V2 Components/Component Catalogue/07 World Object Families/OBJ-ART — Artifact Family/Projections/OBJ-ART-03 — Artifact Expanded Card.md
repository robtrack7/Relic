---
id: OBJ-ART-03
status: active
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

# OBJ-ART-03 — Artifact Expanded Card

Parent: [[OBJ-ART — Artifact Representation Family]]

## Purpose

Artifact is a strong candidate for two-sided Expanded Cards.

Use [[OBJ-016 — Two-Sided Expanded Card Host]] when mechanics exist.

**Front — Fiction**
- larger image;
- identity/category;
- narrative description;
- current holder/location;
- provenance/history cue;
- active Thread;
- GM reminder.

**Back — Mechanics**
When the Artifact has a mechanics template/profile:
- abilities;
- action costs;
- attacks;
- charges/resources;
- rules text summary;
- Rules Reference links.

If the Artifact has no meaningful mechanics, keep the Expanded Card one-sided rather than displaying an empty mechanics face.

## Shared contracts

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-002 — World Object Projection Resolver]]
- [[OBJ-015 — Object Reference Navigation]]

## Storybook / manual test

Render this projection with realistic Artifact content and cover its meaningful family states. Verify it reads as the same persistent object while remaining distinct from other projection roles.

## Handoff

Implement this as an independently inspectable projection. Production code may share internal pieces with sibling projections where useful.
