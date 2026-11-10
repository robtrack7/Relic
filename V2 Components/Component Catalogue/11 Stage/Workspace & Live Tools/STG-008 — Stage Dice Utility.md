---
id: STG-008
status: active
kind: component
authority: current
system: SYS-11
family: workspace-live-tools
storybook: component
depends_on:
- MEC-021
- MEC-007
- STG-013
platforms:
- web
---

# STG-008 — Stage Dice Utility

Parent: [[STG-002 — Stage Carriage]]

## Purpose

Provides fast live dice access using the shared [[MEC-021 — Dice Roll Engine]] without becoming a rule adjudicator.

## Capabilities

Support:
- `4d6 + 5`;
- multiple terms such as `2d8 + 1d6 + 3`;
- arbitrary dice counts;
- keep/drop highest or lowest;
- advantage/disadvantage aliases;
- success thresholds/count-successes;
- rerolls/explosions where declared;
- system-defined symbolic/custom dice;
- distinct die identities where individual results matter.

## Friendly system UI

The GM should not need notation for common system actions.

Examples:
- `d20 · +7 · Advantage`
- `10 × d10 · Keep highest`
- `8d10 · Success on 7+`
- system-specific Duality/custom dice controls.

Mechanics templates translate friendly controls into roll-engine semantics.

## Invocation

Stage Dice can open directly from Stage Carriage. [[MEC-007 — Dice Expression]] instances invoke the same engine.

## Boundary

Dice results do not automatically apply damage, spend resources, determine targets, adjudicate rules, or mutate Character state.

## Relationships

- [[MEC-007 — Dice Expression]]
- [[MEC-021 — Dice Roll Engine]]
- [[STG-013 — Live Mechanics Presentation]]

## Handoff

Build **STG-008 — Stage Dice Utility** as the fast system-capable front end to the shared dice engine.
