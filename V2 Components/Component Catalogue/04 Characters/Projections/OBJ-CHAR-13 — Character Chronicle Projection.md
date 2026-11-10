---
id: OBJ-CHAR-13
status: prototype
kind: component
authority: current
system: SYS-04
family: projections
storybook: component
depends_on:
- CHR-003
- CHR-001
- DS-OBJ
platforms:
- web
---

# OBJ-CHAR-13 — Character Chronicle Projection

Parent: [[OBJ-CHAR — Character Representation Family]]

## Purpose

Represents a Character in temporal Chronicle context: **who was this Character and how did they intersect the story at this point?**

## Anatomy

At ordinary scale: portrait/mark, name, role at that story position, location/status then, and relation to selected Event/Thread. When deepened: relevant state change, knowledge then, relationships then, linked Events.

## Critical behaviour

Always as-of aware. Never leak current knowledge, allegiance, relationship, location, or status into historical projection.

## Temporal source

Resolve the Character through [[CHR-003 — Temporal Resolver & Now Projection]] at the active [[CHR-001 — Story Time & Position Model|Story Position]]. The projection must not independently reconstruct history from current Character fields.

## Handoff

Build **OBJ-CHAR-13 — Character Chronicle Projection** as the historical/as-of Character projection for Chronicle.
