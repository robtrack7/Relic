---
id: OBJ-THREAD-03
status: active
kind: component
authority: current
system: SYS-07
family: thread
storybook: component
depends_on:
- WOF-001
- OBJ-002
- OBJ-015
platforms:
- web
---

# OBJ-THREAD-03 — Thread Expanded Card

Parent: [[OBJ-THREAD — Thread Representation Family]]

## Purpose

Suggested anatomy:
- core question/premise;
- current status;
- pressure/stakes;
- involved objects;
- recent Events/progression;
- unresolved clues or open possibilities;
- likely consequences;
- GM note.

One-sided by default.

Do not add checklists or task completion UI unless a specific Thread subtype genuinely needs structured objectives.

## Shared contracts

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-002 — World Object Projection Resolver]]
- [[OBJ-015 — Object Reference Navigation]]

## Storybook / manual test

Render this projection with realistic Thread content and cover its meaningful family states. Verify it reads as the same persistent object while remaining distinct from other projection roles.

## Handoff

Implement this as an independently inspectable projection. Production code may share internal pieces with sibling projections where useful.
