---
id: FOC-BLK-013
status: active
kind: component
authority: current
system: SYS-06
family: blocks
storybook: component
depends_on:
- OBJ-PLACE
- FOC-011
- DS-FOC
platforms:
- web
---

# FOC-BLK-013 — Location Block

Parent: [[SYS-06 — Focus & Shared Focus Blocks]]

## Purpose

Represents fictional spatial context such as current location, origin/home, territory, parent Place, or contained Places.

## Anatomy

Family-selected relationships may include:
- current Place;
- home/origin;
- territory;
- parent Place;
- contained/sub-Places;
- previous important locations.

Values are interactive World Object references.

## Boundaries

This is semantic fictional location.

It is unrelated to Board Canvas coordinates or Placement geometry.

## Temporal behaviour

Current location can resolve historically where modeled.

Historical Character/Artifact/etc. Focus must not show a future/current Place as though it were true at that story position.

## Relationships

- [[OBJ-PLACE — Place Representation Family]] — referenced locations.
- [[FOC-011 — Focus Temporal Context]] — historical location.
- family-specific current-state components — compact location cue.

## Handoff

Build **FOC-BLK-013 — Location Block** as the semantic Place-context section for Focus surfaces.
