---
id: MEC-023
status: active
kind: domain
authority: current
system: SYS-05
family: runtime-flow
storybook: none
---

# MEC-023 — Live Resource Definition

Parent: [[SYS-05 — Mechanics & Rules]]

## Purpose

Declares how a mechanics field can optionally participate in live Session tracking and how prominently it should appear.

## Definition fields

Stable key, label, control/render type, scope, min/max/derivation, live priority, default tracking level, glance visibility, edit rules, settlement policy, optional grouping/order.

## Control types

Bounded number, unbounded counter, pips, slots, token pool, recharge/checkbox, or custom system adapter.

## Tracking levels

Flow Only hides/does not instantiate resources; Essentials uses template primary resources; Custom uses GM-selected resources.

## Live priority

Primary may appear at glance; secondary belongs in Expanded mechanics; deep belongs in Focus/full mechanics. Usually no more than 1–2 glance resources.

## Scope examples

Participant HP, participant Stress, Session/GM pool, party resource, encounter countdown, Scene escalation pool.

## Handoff

Implement **MEC-023 — Live Resource Definition** as the declarative bridge between mechanics templates and optional live resource presentation/state.
