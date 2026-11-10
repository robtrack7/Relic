---
id: MEC-021
status: active
kind: domain
authority: current
system: SYS-05
family: runtime-flow
storybook: none
---

# MEC-021 — Dice Roll Engine

Parent: [[SYS-05 — Mechanics & Rules]]

## Purpose

Provides one system-capable roll engine shared by mechanics components and Stage.

## Numeric operators

Support arbitrary dice counts/sizes, multiple terms, flat modifiers, keep/drop high/low, success thresholds/counts, rerolls, explosions where declared, and template aliases such as Advantage/Disadvantage.

## Structured dice

Preserve individual die identity when required. Support adapters for distinct paired dice, symbolic/custom faces, narrative pools, percentile, and success/cancel logic.

## Result contract

Return totals where meaningful, individual dice, kept/dropped dice, success counts, symbolic outcomes, and template-defined interpretation metadata.

## Boundary

The engine rolls dice. It does not select targets, resolve attacks, apply damage, change HP/resources automatically, or adjudicate rules.

## Handoff

Implement **MEC-021 — Dice Roll Engine** as shared roll infrastructure with numeric and system-adapter semantics.
