---
id: OBJ-CHAR-07
status: active
kind: component
authority: current
system: SYS-04
family: character-projections
storybook: component
depends_on:
- WOF-001
- SRH-004
- LIB-003
- DS-OBJ
platforms:
- web
---

# OBJ-CHAR-07 — Character Index Projection

Parent: [[OBJ-CHAR — Character Representation Family]]

## Purpose

Shared compact Character projection for Library and Search. Search-specific match highlighting and query chrome belong to the Search host rather than a second Character component.

## Anatomy

Likely portrait, name, PC/NPC cue, role/occupation, concise summary, status, current Place/Faction where useful, and maturity.

## Search adaptation

Dense and keyboard-first. Primary activation follows Object Reference Navigation; Search may offer secondary Open Focus / Locate on Board.

## States

- normal Library row/tile;
- Search result with host-owned match context;
- historical/as-of cue when the host intentionally searches a historical position;
- archived/unavailable fallback through the shared object treatment.

## Relationships

- [[WOF-001 — Family Projection Standard]]
- [[SRH-004 — Search Result Match Context]]
- [[LIB-003 — Library Index Collection]]

## Handoff

Build one Character Index Projection and let Library/Search hosts compose their own surrounding behavior.
