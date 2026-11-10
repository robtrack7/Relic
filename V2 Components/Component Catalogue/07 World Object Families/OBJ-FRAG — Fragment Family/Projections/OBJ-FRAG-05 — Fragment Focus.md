---
id: OBJ-FRAG-05
status: active
kind: component
authority: current
system: SYS-07
family: fragment
storybook: component
depends_on:
- WOF-001
- OBJ-002
- OBJ-015
platforms:
- web
---

# OBJ-FRAG-05 — Fragment Focus

Parent: [[OBJ-FRAG — Fragment Representation Family]]

## Purpose

Fragment Focus should remain deliberately lightweight:

1. Content / Narrative
2. Image & Media when present
3. Related World Objects / Relationships
4. Sources & Provenance
5. GM Notes where useful
6. Resolve actions

Relevant shared blocks:
- Narrative
- Image & Media
- Relationships
- Sources & Provenance
- GM Notes

Do not force Identity, Roleplay, Mechanics, Goals, Inventory, etc. onto an unresolved Fragment.

## Shared contracts

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-002 — World Object Projection Resolver]]
- [[OBJ-015 — Object Reference Navigation]]

## Storybook / manual test

Render this projection with realistic Fragment content and cover its meaningful family states. Verify it reads as the same persistent object while remaining distinct from other projection roles.

## Handoff

Implement this as an independently inspectable projection. Production code may share internal pieces with sibling projections where useful.
