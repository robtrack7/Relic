---
id: OBJ-EVT-04
status: active
kind: component
authority: current
system: SYS-07
family: event
storybook: component
depends_on:
- WOF-001
- OBJ-002
- OBJ-015
platforms:
- web
---

# OBJ-EVT-04 — Event Focus

Parent: [[OBJ-EVT — Event Representation Family]]

## Purpose

Recommended Event Focus:

1. Identity / Event title
2. Story position
3. Narrative
4. Participants / Relationships
5. Place
6. Threads
7. Consequences / state changes
8. Sources & Provenance
9. GM Notes

Shared blocks:
- Identity
- Narrative
- Relationships
- Location
- Thread Membership
- Sources & Provenance
- GM Notes

Event may require a family-specific **Consequences / State Changes** section because this is central to what an Event means and is not cleanly reducible to another generic block.

## Shared contracts

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-002 — World Object Projection Resolver]]
- [[OBJ-015 — Object Reference Navigation]]

## Storybook / manual test

Render this projection with realistic Event content and cover its meaningful family states. Verify it reads as the same persistent object while remaining distinct from other projection roles.

## Handoff

Implement this as an independently inspectable projection. Production code may share internal pieces with sibling projections where useful.
