---
id: FOC-BLK-009
status: active
kind: component
authority: current
system: SYS-06
family: blocks
storybook: component
depends_on:
- OBJ-CHAR-18
- FOC-011
- DS-FOC
platforms:
- web
---

# FOC-BLK-009 — Relationships Block

Parent: [[SYS-06 — Focus & Shared Focus Blocks]]

## Purpose

Provides the deep meaning-first view of semantic Relationships involving the focused World Object.

## Anatomy

Each relationship can communicate:
- related object;
- semantic relationship phrase/verb;
- direction where meaningful;
- current state;
- optional story-position/history cue;
- optional provenance/source.

Examples:
- `Mara — owes a debt to — Seraphine`
- `The Lantern Society — controls — North Gate`
- `The Ashen Crown — hidden beneath — Thornwatch`

## Use

The GM can:
- add a Relationship;
- edit meaning/state;
- open the related object;
- inspect Relationship history;
- navigate to Chronicle where temporal change matters.

This is not a generic backlinks list.

## Appearance & behaviour

Use structured editorial rows/cards with the relationship language as the dominant semantic content.

Avoid graph visualization in current V2.

## Temporal behaviour

Current Focus shows current relationship state.

Historical Focus resolves relationship state as-of the selected story position when that relationship is temporal.

## Relationships

- [[SYS-08 — Relationships]] — owns semantic Relationship identity/history.
- [[OBJ-CHAR-18 — Character Relationship Snapshot]] — compact Character projection.
- [[FOC-011 — Focus Temporal Context]] — historical state.

## Handoff

Build **FOC-BLK-009 — Relationships Block** as the meaning-first relationship collection/editor without introducing a relationship graph.
