---
id: STG-004
status: active
kind: behavior
authority: current
system: SYS-11
family: workspace-live-tools
storybook: none
depends_on:
- PREP-005
- STG-003
- STG-005
---

# STG-004 — Live Scene Flow

Parent: [[STG-002 — Stage Carriage]]

## Purpose

Runs the same lightweight Scene/Beat composition created in Prepare and adds only the runtime concept of the current Scene.

## Current Scene

The active Scene is Session attention state, not canon.

Selecting a Scene:
1. marks it current;
2. updates Stage Canvas foregrounding;
3. updates Stage Entity Rail relevance/order;
4. updates Librarian Stage context.

## Editing during play

The GM can:
- add Scene;
- rename/edit Scene;
- add/reorder/remove Beats;
- add/remove references;
- change current Scene.

These are Session-composition changes and do not require canon approval.

## Beat behaviour

Beats remain prompts.

Do not add completion workflows, Story Points, automatic advancement, or AI-decided scene completion.

## Encounter relationship

A Scene may define likely/active participants and may start an Encounter Flow, but Scene and Encounter remain separate concepts.

A Scene can exist without structured flow.

An Encounter can start unexpectedly inside any Scene.

## Relationships

- [[PREP-005 — Scene & Beat Stack]]
- [[STG-003 — Stage Canvas View]]
- [[STG-005 — Stage Entity Rail]]
- [[STG-009 — Encounter Flow]]

## Handoff

Build **STG-004 — Live Scene Flow** as the runtime Scene pointer and live editor over Prepare's existing Scene/Beat composition.
