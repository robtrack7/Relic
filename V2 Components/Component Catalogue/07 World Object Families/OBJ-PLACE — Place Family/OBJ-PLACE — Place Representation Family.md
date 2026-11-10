---
id: OBJ-PLACE
status: active
kind: family
authority: current
system: SYS-07
family: place
storybook: none
---

# OBJ-PLACE — Place Representation Family

Parent: [[SYS-07 — World Object Families]]

## Purpose

Defines the complete UI projection family for persistent fictional locations, from continent or region down to city, district, building, room, dungeon chamber, landmark, or other meaningful place.

Scale/category is metadata on one Place model rather than a hierarchy of separate entity types.

## Family emphasis

Place representations prioritize:
- recognition through name and image/map;
- atmosphere and fictional identity;
- current condition;
- spatial hierarchy and containment;
- important inhabitants/presences;
- active Threads and Events;
- temporal change where narratively meaningful.

A Place is semantic fictional geography. It is distinct from Board Canvas coordinates.

## Projections

- [[OBJ-PLACE-02 — Place Card]]
- [[OBJ-PLACE-03 — Place Expanded Card]]
- [[OBJ-PLACE-04 — Place Focus]]
- [[OBJ-PLACE-05 — Place Index Projection]]
- [[OBJ-PLACE-06 — Place Prepare Projection]]
- [[OBJ-PLACE-07 — Place Chronicle Projection]]

## Actions

Family-level actions may include:
- Focus;
- add sub-Place;
- set/change parent Place;
- add Relationship;
- add Thread/Event;
- add image/map;
- add to Session;
- archive.

Board movement/removal remains Board-owned.

## Shared states

- no image;
- image-forward;
- map-forward;
- current/historical;
- Pencil/Ink;
- archived;
- status-present;
- parented/unparented;
- Stage-current.

## Implementation rule

These files are catalogue/retrieval boundaries, not a requirement that production code use one module per projection. Share implementation where it is genuinely simpler while preserving projection semantics.
