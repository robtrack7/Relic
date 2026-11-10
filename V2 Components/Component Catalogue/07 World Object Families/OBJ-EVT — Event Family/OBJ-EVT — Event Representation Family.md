---
id: OBJ-EVT
status: active
kind: family
authority: current
system: SYS-07
family: event
storybook: none
---

# OBJ-EVT — Event Representation Family

Parent: [[SYS-07 — World Object Families]]

## Purpose

Defines the UI family for meaningful occurrences in story history: discoveries, promises, betrayals, battles, deaths, changes in control, revelations, decisions, and other events that matter to continuity.

## Family emphasis

Event representations prioritize:
- what happened;
- when/story position;
- who/what participated;
- where;
- related Threads;
- consequences/state changes;
- provenance.

Event is one of Chronicle's fundamental temporal units.

## Projections

- [[OBJ-EVT-02 — Event Card]]
- [[OBJ-EVT-03 — Event Expanded Card]]
- [[OBJ-EVT-04 — Event Focus]]
- [[OBJ-EVT-05 — Event Index Projection]]
- [[OBJ-EVT-06 — Event Chronicle Projection]]

## Actions

Possible actions:
- Focus;
- edit story position;
- add/remove participants;
- set Place;
- add Thread;
- add consequence/state change;
- add Source;
- add to Session/reference;
- archive only where product semantics allow it.

## Implementation rule

These files are catalogue/retrieval boundaries, not a requirement that production code use one module per projection. Share implementation where it is genuinely simpler while preserving projection semantics.
