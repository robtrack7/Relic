---
id: MEC-007
status: active
kind: component
authority: current
system: SYS-05
family: mechanics-components
storybook: component
depends_on:
- MEC-021
- DS-MEC
platforms:
- web
---

# MEC-007 — Dice Expression

Parent: [[SYS-05 — Mechanics & Rules]]

## Purpose

Represents a roll, pool, or system-defined dice procedure consistently and invokes the shared Dice Roll Engine.

## Examples

`1d20 + 7`, `4d6 + 5`, `2d8 + 1d6 + 3`, keep/drop rolls, success pools, percentile, and system-specific symbolic/distinct dice.

## Behaviour

Selecting an interactive expression invokes [[MEC-021 — Dice Roll Engine]] using template-defined semantics. Display remains human-readable; the GM does not need parser notation.

## Custom dice

Templates may define named/custom faces, symbolic dice, distinct die identities, success counting, rerolls/explosions, and friendly aliases such as Advantage/Disadvantage.

## Boundary

Dice Expressions return outcomes but do not adjudicate rules or automatically mutate mechanics/resource state.

## Handoff

Build **MEC-007 — Dice Expression** as the reusable human-readable roll-display/invocation component over the shared Dice Roll Engine.
