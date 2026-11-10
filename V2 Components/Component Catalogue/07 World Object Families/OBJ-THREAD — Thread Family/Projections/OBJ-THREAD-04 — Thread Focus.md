---
id: OBJ-THREAD-04
status: active
kind: component
authority: current
system: SYS-07
family: thread
storybook: component
depends_on:
- WOF-001
- OBJ-002
- OBJ-015
platforms:
- web
---

# OBJ-THREAD-04 — Thread Focus

Parent: [[OBJ-THREAD — Thread Representation Family]]

## Purpose

Recommended Thread Focus:

1. Identity / core question
2. Narrative
3. Status
4. Goals / Stakes / Pressure
5. Involved World Objects / Relationships
6. Event History / Progression
7. Consequences / related Threads
8. GM Notes
9. Sources & Provenance

Shared blocks:
- Identity
- Narrative
- Status
- Goals & Motives
- Relationships
- Event History
- GM Notes
- Sources & Provenance

Thread may also use a family-specific progression section inside its Focus composition when the standard Event History block is not sufficient.

## Shared contracts

- [[WOF-001 — Family Projection Standard]]
- [[OBJ-002 — World Object Projection Resolver]]
- [[OBJ-015 — Object Reference Navigation]]

## Storybook / manual test

Render this projection with realistic Thread content and cover its meaningful family states. Verify it reads as the same persistent object while remaining distinct from other projection roles.

## Handoff

Implement this as an independently inspectable projection. Production code may share internal pieces with sibling projections where useful.
