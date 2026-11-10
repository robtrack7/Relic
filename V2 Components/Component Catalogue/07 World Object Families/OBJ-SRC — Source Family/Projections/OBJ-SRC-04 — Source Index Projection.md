---
id: OBJ-SRC-04
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

# OBJ-SRC-04 — Source Index Projection

Parent: [[OBJ-SRC — Source Representation Family]]

## Purpose

Search and Library can share a Source Index Projection:
- source icon/thumbnail;
- title;
- type;
- origin;
- short excerpt;
- linked-object/provenance count where useful;
- import/indexing status when relevant.

Search adds query excerpt highlighting.

## Shared contracts

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-002 — World Object Projection Resolver]]
- [[OBJ-015 — Object Reference Navigation]]

## Storybook / manual test

Render this projection with realistic Source content and cover its meaningful family states. Verify it reads as the same persistent object while remaining distinct from other projection roles.

## Handoff

Implement this as an independently inspectable projection. Production code may share internal pieces with sibling projections where useful.
