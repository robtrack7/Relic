---
id: OBJ-009
status: active
kind: component
authority: current
system: SYS-03
family: shared-projection-components
storybook: component
depends_on:
- OBJ-004
- DS-OBJ
platforms:
- web
---

# OBJ-009 — Historical & As-Of Indicator

Parent: [[OBJ-001 — World Object Representation Framework]]

## Purpose

Makes it unmistakable when a World Object is being shown at a story position other than **Now**.

A historical projection is the same identity at another temporal state and must never be mistaken for current state.

## Context & placement

Placed close to object identity in Focus, Chronicle-driven views, historical peeks, and other as-of projections.

The indicator remains visible while historical context is active.

## Anatomy

A human-readable story-position label such as:

- `Before Session 8`;
- `Session 12`;
- `At the Fall of Thornwatch`;
- `During the Winter Court`.

Deep contexts may add a clear `Return to Now` action.

## Appearance & behaviour

Distinct enough to prevent accidental interpretation as current state, but not styled as an error.

Uncertain or ranged story positions should be expressed honestly in wording/treatment rather than converted into false precision.

## States & variants

- exact story position;
- session/scene ordered position;
- ranged;
- uncertain;
- return-to-Now available.

## Relationships

- Chronicle system — common source of temporal context.
- temporal state projection utility — supplies as-of data.
- [[OBJ-004 — Object Identity Lockup]] — common adjacent placement.

## Handoff

Build **OBJ-009 — Historical & As-Of Indicator** as the persistent contextual cue that distinguishes historical projections from Now.
