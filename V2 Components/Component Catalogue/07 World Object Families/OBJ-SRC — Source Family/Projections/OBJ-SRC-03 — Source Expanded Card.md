---
id: OBJ-SRC-03
status: active
kind: component
authority: current
system: SYS-07
family: source
storybook: component
depends_on:
- WOF-001
- OBJ-002
- OBJ-015
platforms:
- web
---

# OBJ-SRC-03 — Source Expanded Card

Parent: [[OBJ-SRC — Source Representation Family]]

## Purpose

Expanded Source may show:
- larger preview;
- excerpt;
- metadata;
- linked World Objects;
- import/indexing state;
- page/url context;
- pin-to-Reference-Shelf action.

The Expanded Card remains a preview/reference object.

Deep reading belongs in [[OBJ-SRC-01 — Source Viewer]].

## Shared contracts

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-002 — World Object Projection Resolver]]
- [[OBJ-015 — Object Reference Navigation]]

## Storybook / manual test

Render this projection with realistic Source content and cover its meaningful family states. Verify it reads as the same persistent object while remaining distinct from other projection roles.

## Handoff

Implement this as an independently inspectable projection. Production code may share internal pieces with sibling projections where useful.
