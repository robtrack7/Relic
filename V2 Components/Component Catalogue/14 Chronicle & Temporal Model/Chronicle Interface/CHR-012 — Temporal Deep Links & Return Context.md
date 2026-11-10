---
id: CHR-012
status: active
kind: behavior
authority: current
system: SYS-14
family: chronicle-interface
storybook: pattern
depends_on:
- FOC-010
- CHR-006
- OBJ-015
platforms:
- web
---

# CHR-012 — Temporal Deep Links & Return Context

Parent: [[SYS-14 — Chronicle & Temporal Model]]

## Purpose

Makes historical state addressable and ensures temporal exploration always has a clear path back.

## Addressable context

A temporal link can conceptually identify:
- object/relationship;
- Story Position;
- Focus block/nested item;
- Event/Story Change;
- optional comparison position.

## Use cases

Powers:
- citations;
- Search;
- Chronicle entries;
- Librarian navigation;
- Recent Change Trace;
- Settlement evidence;
- Focus history.

## Return context

Preserve navigation stack/origin:
`Board → Chronicle Session 8 → Mara Focus as-of Session 8 → Back → Chronicle → Return to Now → prior Board`.

## Return to Now

Historical surfaces provide a clear `Return to Now` action. Returning to Now should not unnecessarily discard the user's underlying Board/workspace context.

## Implementation latitude

Exact URL/router encoding may evolve. Keep one serializable temporal-navigation state so surfaces do not invent incompatible parameters.

## Relationships

- [[FOC-010 — Focus Anchor & Deep Link]]
- [[CHR-006 — Story Position Control]]
- [[OBJ-015 — Object Reference Navigation]]

## Handoff

Implement **CHR-012** as shared temporal navigation state integrated with existing routing/return-context infrastructure.
