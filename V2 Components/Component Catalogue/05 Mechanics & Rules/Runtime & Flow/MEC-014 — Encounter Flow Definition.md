---
id: MEC-014
status: active
kind: domain
authority: current
system: SYS-05
family: runtime-flow
storybook: none
depends_on:
- STG-009
---

# MEC-014 — Encounter Flow Definition

Parent: [[SYS-05 — Mechanics & Rules]]

## Purpose

Defines how a mechanics template structures live participant attention without hard-coding D&D-style initiative.

## Flow types

**Ranked** — roll/manual/fixed initiative, order, ties, current participant, optional rounds.

**Spotlight** — current spotlight and optional recent-opportunity/history tracking without numeric order.

**Alternating** — side/participant alternation.

**Phased** — system-defined phases.

**Freeform / None** — participant roster without ordered turns.

## Template configuration

A template may define flow type, display labels, initiative/entry expression where relevant, tie-break, round/phase semantics, reorder permissions, spotlight history/opportunities, default tracking level, or no structured flow.

## Outputs

Provide a normalized Stage adapter contract for flow type, participant ordering/grouping, current attention target, optional results/round/phase, and allowed flow actions.

## Handoff

Implement **MEC-014 — Encounter Flow Definition** as the system-independent adapter consumed by [[STG-009 — Encounter Flow]].
