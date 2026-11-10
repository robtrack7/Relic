---
id: CHR-004
status: active
kind: surface
authority: current
system: SYS-14
family: chronicle-interface
storybook: scene
depends_on:
- APP-005
- CHR-006
- CHR-005
- DS-TRUST
platforms:
- web
---

# CHR-004 — Chronicle Workspace State

Parent: [[SYS-14 — Chronicle & Temporal Model]]

## Purpose

Defines Chronicle as the human-facing temporal lens over the living world.

## Entry

Entered through [[APP-005 — Current Context Control]], Event/Object history, Recent Change Trace, temporal deep links, or Librarian navigation.

Chronicle is not a permanent global nav destination.

## Workspace composition

Primary:
`Chronicle workspace | Librarian Carriage`

Chronicle may use the normal central Desk/workspace host and global shell. It does not need a permanent left carriage merely for symmetry.

## Viewport chrome

Top-left/upper frame: normal Relic shell + Current Context.

Chronicle-local: [[CHR-006 — Story Position Control]], stream/filter/jump affordances as needed.

Right: normal Librarian Carriage when open.

## Use

Chronicle lets the GM:
- move through meaningful story history;
- inspect Events/Story Changes;
- select affected World Objects;
- open an object as-of a story position;
- compare positions;
- return cleanly to Now/prior Desk context.

## State continuity

Entering Chronicle should preserve the originating Board/view. Historical Focus opens over/in the Chronicle context and returns to it rather than destroying navigation history.

## Appearance & behaviour

Editorial narrative history, not a project-management timeline or Git log. Favor readable sections, Sessions/Events, whitespace, typography, and restrained temporal marks.

## Implementation latitude

Chronicle may eventually render as a vertically flowing stream, hybrid spatial-document surface, or responsive composition. Preserve the information hierarchy and navigation contracts rather than freezing an early pixel layout.

## Relationships

- [[CHR-005 — Chronicle Stream]]
- [[CHR-006 — Story Position Control]]
- [[CHR-012 — Temporal Deep Links & Return Context]]
- [[LBR-001 — Librarian Carriage]]

## Future player projection

Future [[PUB-007 — Player Chronicle Projection]] filters this same Chronicle/Temporal model through publication permissions rather than creating a separate player chronology.

## Handoff

Build **CHR-004** on the existing workspace shell; avoid creating a separate application shell or persistence model for Chronicle.
