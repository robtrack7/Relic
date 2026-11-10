---
id: STG-011
status: active
kind: behavior
authority: current
system: SYS-11
family: encounter-mechanics
storybook: none
depends_on:
- OBJ-FRAG-01
---

# STG-011 — Resolve Session Instance

Parent: [[STG-010 — Session Instance Model]]

## Purpose

Lets an ephemeral Session Instance remain Session-only or acquire lasting World identity without losing Session history/provenance.

## Outcomes

**Keep Session-only** — no change.

**Keep in World** — resolve into an appropriate persistent World Object family.

Examples:
- NPC/adversary/familiar → Character;
- important object → Artifact;
- meaningful hazard/environment concept → appropriate persistent object or Fragment depending on intent.

Do not force every Session Instance into Character.

## Interaction

The action should feel like: **This thing became important enough to keep.** Preview destination family and carried-forward material; avoid re-entering known information.

## Preservation

Carry forward where applicable:
- display name;
- image;
- portrayal;
- mechanics/template assignment;
- Source;
- captures;
- Session provenance;
- important Scene references;
- approved semantic Relationships.

## Review relationship

Review can surface notable unresolved Session Instances and offer `Keep in World` / `Keep Session-only`. This is analogous to Fragment Resolution but begins from runnable Session-scoped identity.

## Relationships

- [[OBJ-FRAG-01 — Resolve Fragment]]
- [[STG-010 — Session Instance Model]]
- Review & Settlement

## Handoff

Build **STG-011 — Resolve Session Instance** as the explicit promotion/settlement path from Session-scoped runnable material into lasting world identity.
