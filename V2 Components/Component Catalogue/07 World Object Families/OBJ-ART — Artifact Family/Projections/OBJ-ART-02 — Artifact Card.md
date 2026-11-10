---
id: OBJ-ART-02
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

# OBJ-ART-02 — Artifact Card

Parent: [[OBJ-ART — Artifact Representation Family]]

## Purpose

The normal Artifact Card answers:

> What is this object and why does it matter?

Suggested anatomy:
- image;
- name;
- item/object category;
- one-line significance/effect;
- current holder or location where useful;
- one contextual Thread/status cue.

## Shared contracts

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-002 — World Object Projection Resolver]]
- [[OBJ-015 — Object Reference Navigation]]

## Storybook / manual test

Render this projection with realistic Artifact content and cover its meaningful family states. Verify it reads as the same persistent object while remaining distinct from other projection roles.

## Handoff

Implement this as an independently inspectable projection. Production code may share internal pieces with sibling projections where useful.
