---
id: MEC-017
status: active
kind: domain
authority: current
system: SYS-05
family: framework-configuration
storybook: none
depends_on:
- SET-005
---

# MEC-017 — Saga Mechanics Profile

Parent: [[SYS-05 — Mechanics & Rules]]

## Purpose

Defines the default rules/mechanics environment for a Saga.

## Contains

Default mechanics template, dice model, action-symbol pack, encounter-flow model, preferred PC/NPC/adversary templates, default Encounter Tracking Level, preferred live resources, optional pinned core Rules References.

## Behaviour

New Characters inherit the Saga profile unless overridden; a Saga can still contain objects using different templates.

## Settings entry

The current Saga's mechanics profile is configured through
[[SET-005 — Current Saga General Settings]] after first-run setup.

Changing the default profile must preserve explicit object-level assignments unless the
mechanics system intentionally remaps them.

## Handoff

Implement **MEC-017 — Saga Mechanics Profile** as the default mechanics configuration inherited by new mechanically relevant objects.
