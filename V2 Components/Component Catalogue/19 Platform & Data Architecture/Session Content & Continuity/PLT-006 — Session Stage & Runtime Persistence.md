---
id: PLT-006
status: active
kind: platform
authority: current
system: SYS-19
family: session-content-continuity
storybook: none
depends_on:
- STG-011
- STG-012
---

# PLT-006 — Session Stage & Runtime Persistence

Parent: [[SYS-19 — Platform & Data Architecture]]

## Purpose

Defines durable Session/Stage structures and separates long-term story state from Session-local runnable/runtime state.

## Session graph

Conceptually persist:

`Session`
- Scenes
  - Beats
- context/prepared references
- Session Instances
- Encounter Flows
  - Participants
- Session Mechanics State
- Fragments/captures
- Marked Moments
- recording manifests/segments
- processing lifecycle state.

## Scene / Beat

Scenes and Beats are Session-local composition, not World Objects.

They may reference persistent World Objects and Session Instances.

## Session Instance

[[STG-010 — Session Instance Model]] is a durable Session-scoped runnable identity.

It may contain portrayal/mechanics/source/runtime information but remains outside ordinary Library persistence unless resolved through [[STG-011 — Resolve Session Instance]].

## Encounter Participant

[[STG-012 — Encounter Participant]] is runtime membership referencing either a persistent eligible World Object or Session Instance.

It is not another identity record.

## Runtime durability classes

Classify Session data deliberately:

**Durable Session history** — Scenes, captures, Marked Moments, resolved Encounter history as needed.

**Recoverable live runtime** — current participant, open Encounter state, live mechanics, pending capture.

**Disposable UI state** — purely visual expansion/hover states.

Do not persist every UI value merely because it exists.

## End Session

Safe End Session finalizes the durable live state needed for processing/recovery before transitioning to the post-session pipeline.

## Flexibility

Exact normalization and history granularity may evolve after Stage prototypes. Preserve Session-scoped identity, crash recovery, and clear promotion boundaries.

## Handoff

Implement Stage persistence against an offline/crash-recovery acceptance scenario, not only happy-path online CRUD.
