---
id: FOC-BLK-006
status: active
kind: component
authority: current
system: SYS-06
family: blocks
storybook: component
depends_on:
- FOC-011
- DS-FOC
platforms:
- web
---

# FOC-BLK-006 — Status Block

Parent: [[SYS-06 — Focus & Shared Focus Blocks]]

## Purpose

Displays narratively important current or historical condition/state for a focused World Object.

## Examples

Character:
- alive;
- missing;
- deceased;
- imprisoned;
- disguised.

Place:
- occupied;
- ruined;
- burning;
- abandoned.

Faction:
- fractured;
- outlawed;
- ascendant.

Thread:
- dormant;
- active;
- escalating;
- resolved.

The family defines meaningful vocabulary.

## Appearance & behaviour

Show a small number of meaningful states, not a generic tag cloud.

Status should read clearly in both current and historical Focus.

Historical values follow Focus Temporal Context.

## Relationships

- [[FOC-011 — Focus Temporal Context]] — as-of projection.
- family-specific current-state summary components — compact equivalents.

## Handoff

Build **FOC-BLK-006 — Status Block** as the family-aware meaningful-state section for current and historical Focus.
