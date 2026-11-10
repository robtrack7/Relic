---
id: SGA-009
status: active
kind: behavior
authority: current
system: SYS-15
family: handoff-guidance-recovery
storybook: none
depends_on:
- PREP-001
---

# SGA-009 — Session 1 Seed & Prepare Handoff

Parent: [[SYS-15 — Saga Creator & First Run]]

## Purpose

Closes first run by making the real Prepare workflow the natural next step.

## Assisted seed

The Starting World Change Set may seed actual Section 10 structures: objective, opening, Scenes/Beats, relevant World Objects, Threads, Sources and reminders. Do not invent a separate first-session packet.

## Handoff

After assisted settlement, offer `Prepare Session 1`. This opens [[PREP-001 — Prepare Workspace State]].

## Blank/manual

The same action from a manually built/empty Saga creates a sparse planned Session and opens Prepare with **no required AI generation**.
