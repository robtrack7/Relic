---
id: PUB-007
status: deferred
kind: behavior
authority: current
system: SYS-16
family: player-experience
storybook: none
depends_on:
- CHR-004
---

# PUB-007 — Player Chronicle Projection

Parent: [[SYS-16 — Player Publication & Permissions]]

## Purpose

Provides players with a growing story history by filtering the canonical Chronicle through publication permissions.

## Core rule

Player Chronicle is a projection of the existing Chronicle/Temporal system.

Do not build a separate player timeline database.

## Visibility

Only published/authorized Events, Story Changes, recaps and related projections appear.

GM-only Chronicle material remains inaccessible.

## Temporal correctness

Player Chronicle uses the same Story Position ordering and temporal truth rules as [[CHR-004 — Chronicle Workspace State]] and the shared temporal model.

## Unknown history

Absence from Player Chronicle means `not published to this player audience`, not necessarily `did not happen`.

The UI should avoid negative-space language that accidentally confirms hidden events.

## Handoff

When implemented, treat publication/RLS as a filter over the shared Chronicle rather than duplicating chronology.
