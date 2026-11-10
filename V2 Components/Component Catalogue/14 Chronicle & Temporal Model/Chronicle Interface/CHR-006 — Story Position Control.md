---
id: CHR-006
status: active
kind: component
authority: current
system: SYS-14
family: chronicle-interface
storybook: component
depends_on:
- APP-005
- CHR-001
- CHR-012
- DS-TRUST
platforms:
- web
---

# CHR-006 — Story Position Control

Parent: [[CHR-004 — Chronicle Workspace State]]

## Purpose

Provides semantic temporal navigation without implying false continuous precision.

## Controls

May include:
- Now;
- previous/next meaningful position;
- Session picker;
- Event/history anchor picker;
- search/jump;
- current position label.

## No generic scrubber

Avoid a default continuous slider. Narrative history is uneven and often approximate. Navigate between meaningful anchors/positions instead.

## Context language

Examples:
- `Chronicle · Session 8 · The Bargain`
- `Mara Venn · as of Session 8`
- `Before the Red Throne Falls`

Historical contexts must be unmistakable.

## Now

Provide a consistent `Return to Now` affordance in deep historical contexts.

## Implementation latitude

The picker/control can evolve with Chronicle density. Position semantics and deep-link addressing are stable; exact control composition is not.

## Relationships

- [[APP-005 — Current Context Control]]
- [[CHR-001 — Story Time & Position Model]]
- [[CHR-012 — Temporal Deep Links & Return Context]]

## Handoff

Build **CHR-006** around meaningful semantic anchors and clear historical context, not calendar/timeline chrome for its own sake.
