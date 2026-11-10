---
id: OBJ-FACT
status: active
kind: family
authority: current
system: SYS-07
family: faction
storybook: none
---

# OBJ-FACT — Faction Representation Family

Parent: [[SYS-07 — World Object Families]]

## Purpose

Defines the complete UI family for collective fictional actors: guilds, noble houses, religions, cults, governments, corporations, gangs, armies, communities, secret societies, and other groups with persistent identity and intent.

## Family emphasis

Faction representations prioritize:
- collective identity;
- agenda and motive;
- leadership and membership;
- territory;
- resources/holdings;
- allies/opponents;
- active Threads;
- historical rise, fracture, alliance, or decline.

A Faction should feel like an actor in the world rather than a Character card with a different icon.

## Projections

- [[OBJ-FACT-02 — Faction Card]]
- [[OBJ-FACT-03 — Faction Expanded Card]]
- [[OBJ-FACT-04 — Faction Focus]]
- [[OBJ-FACT-05 — Faction Index Projection]]
- [[OBJ-FACT-06 — Faction Chronicle Projection]]

## Actions

Possible family actions:
- Focus;
- add Relationship/member/leader;
- set territory;
- add Thread/Event;
- add holding;
- add to Session;
- archive.

Relationship creation uses the shared semantic Relationship system.

## Shared states

- emblem/no emblem;
- active/dormant/destroyed or family-defined status;
- current/historical;
- Pencil/Ink;
- archived;
- session-relevant.

## Implementation rule

These files are catalogue/retrieval boundaries, not a requirement that production code use one module per projection. Share implementation where it is genuinely simpler while preserving projection semantics.
