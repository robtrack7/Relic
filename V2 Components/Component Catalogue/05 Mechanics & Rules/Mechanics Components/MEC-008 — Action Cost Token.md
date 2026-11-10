---
id: MEC-008
status: active
kind: component
authority: current
system: SYS-05
family: mechanics-components
storybook: component
depends_on:
- MEC-009
- MEC-010
- DS-MEC
platforms:
- web
---

# MEC-008 — Action Cost Token

Parent: [[SYS-05 — Mechanics & Rules]]

## Purpose

Displays action/time cost using semantic mechanics data and a system-specific visual token.

## Semantic costs

Action, Bonus Action, Reaction, Free Action, 1/2/3 Actions, Move, Full Action, Maneuver, Interrupt, or custom.

## Appearance & behaviour

Semantic value is independent of icon artwork. Every token requires readable/accessibility fallback.

## Relationships

- [[MEC-009 — Action Symbol Library]] — visual mapping.
- [[MEC-010 — Action & Ability Entry]] — primary consumer.

## Handoff

Build **MEC-008 — Action Cost Token** as the semantic-to-visual action-cost component.
