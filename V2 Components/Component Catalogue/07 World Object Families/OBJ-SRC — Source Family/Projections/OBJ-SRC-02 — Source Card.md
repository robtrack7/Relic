---
id: OBJ-SRC-02
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

# OBJ-SRC-02 — Source Card

Parent: [[OBJ-SRC — Source Representation Family]]

## Purpose

The normal Source Card may show:
- file/web/image/document icon or thumbnail;
- title;
- source type;
- short excerpt/description;
- origin/file/session;
- page count or domain only when useful;
- provenance/reference cue.

Rules PDFs and web references use the same Source identity model.

## Shared contracts

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-002 — World Object Projection Resolver]]
- [[OBJ-015 — Object Reference Navigation]]

## Storybook / manual test

Render this projection with realistic Source content and cover its meaningful family states. Verify it reads as the same persistent object while remaining distinct from other projection roles.

## Handoff

Implement this as an independently inspectable projection. Production code may share internal pieces with sibling projections where useful.
