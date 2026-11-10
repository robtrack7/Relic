---
id: STG-010A
status: active
kind: component
authority: current
system: SYS-11
family: encounter-mechanics
storybook: component
depends_on:
- MEC-022
- STG-012
platforms:
- web
---

# STG-010A — Session Instance Live Card

Parent: [[STG-010 — Session Instance Model]]

## Purpose

Lightweight runnable Stage/Canvas representation for a Session Instance without pretending it is a persistent World Object.

## Anatomy

- display name and friendly kind/role;
- icon/image when useful;
- short portrayal or behaviour cue;
- compact mechanics summary;
- optional live resources from [[MEC-022 — Session Mechanics State]];
- subtle Session-scoped treatment.

## Behavior

The card must be fast to create and operate during live play. It may participate in Encounter Flow through [[STG-012 — Encounter Participant]] and can resolve to persistent world material only through [[STG-011 — Resolve Session Instance]].

## Storybook / manual test

Cover NPC, creature, hazard/environment, no-image, mechanics-light, and live-resource states. Test high-density Stage use.
