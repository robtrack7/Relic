---
id: SGA-001
status: active
kind: behavior
authority: current
system: SYS-15
family: entry-empty-desk
storybook: none
depends_on:
- APP-005
- SGA-002
- SGA-003
---

# SGA-001 — New Saga Entry & Saga Shell

Parent: [[SYS-15 — Saga Creator & First Run]]

## Purpose

Creates the smallest valid Saga identity and gets the GM into the real product immediately.

## Entry

Reached automatically when the account has no Saga or through `+ New Saga` in Current Context / Saga switching. Saga Creator is not a permanent global destination.

## Minimum setup

Before Desk entry ask only for:
- Saga name;
- World choice when relevant;
- Mechanics Profile or Decide later.

Do not require onboarding preferences, an AI mode choice, Era setup, or a tutorial selection.

## Early persistence

Create the Saga shell when the GM confirms minimum setup. Optional assisted creation happens **inside that real Saga** rather than in a temporary workshop.

## Resume

A partially set-up Saga can appear as `setup in progress`, but reopening it returns to the real Desk. The GM can continue manually at any time.

## Relationships

- [[APP-005 — Current Context Control]]
- [[SGA-002 — World & Mechanics Setup]]
- [[SGA-003 — First Desk Empty State & Starting Actions]]
