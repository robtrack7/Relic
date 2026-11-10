---
id: MEC-022
status: active
kind: domain
authority: current
system: SYS-05
family: runtime-flow
storybook: none
depends_on:
- MEC-023
---

# MEC-022 — Session Mechanics State

Parent: [[SYS-05 — Mechanics & Rules]]

## Purpose

Stores optional mutable mechanics values needed during live play without overwriting mechanics definitions or treating every decrement as canon.

## Layering

`Mechanics Definition + Session Mechanics State → Live Mechanics Presentation`

## Examples

Current HP, Stress, remaining charges, ammunition, temporary pools, encounter counters, or other template-declared runtime values.

## Scope

May be participant, party, encounter, Session/GM, or Scene. Do not duplicate non-participant resources into every participant row.

## Optionality

State exists only for fields the GM/template chooses to track. Flow Only can create no resource state at all.

## Settlement

Each live resource declares Ephemeral, Carry, or Settle/Review policy through [[MEC-023 — Live Resource Definition]]. Runtime changes are not automatically canon proposals.

## Handoff

Implement **MEC-022 — Session Mechanics State** as the sparse live runtime overlay distinct from stable mechanics definition and canonical story state.
