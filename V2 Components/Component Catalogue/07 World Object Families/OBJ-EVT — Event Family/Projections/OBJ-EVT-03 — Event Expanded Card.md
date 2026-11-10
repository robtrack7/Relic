---
id: OBJ-EVT-03
status: active
kind: component
authority: current
system: SYS-07
family: event
storybook: component
depends_on:
- WOF-001
- OBJ-002
- OBJ-015
platforms:
- web
---

# OBJ-EVT-03 — Event Expanded Card

Parent: [[OBJ-EVT — Event Representation Family]]

## Purpose

Suggested anatomy:
- title/story position;
- fuller narrative account;
- participants;
- Place;
- related Threads;
- causes;
- consequences/state changes;
- key Source cue.

One-sided by default.

Do not turn the Expanded Card into a full timeline editor.

## Shared contracts

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-002 — World Object Projection Resolver]]
- [[OBJ-015 — Object Reference Navigation]]

## Storybook / manual test

Render this projection with realistic Event content and cover its meaningful family states. Verify it reads as the same persistent object while remaining distinct from other projection roles.

## Handoff

Implement this as an independently inspectable projection. Production code may share internal pieces with sibling projections where useful.
