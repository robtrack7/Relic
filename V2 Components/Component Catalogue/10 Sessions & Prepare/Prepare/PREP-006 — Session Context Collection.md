---
id: PREP-006
status: active
kind: component
authority: current
system: SYS-10
family: prepare
storybook: component
depends_on:
- PREP-003
- PREP-005
- PREP-010
platforms:
- web
---

# PREP-006 — Session Context Collection

Parent: [[PREP-002 — Prepare Carriage]]

## Purpose

Collects the persistent World Objects, Threads, Sources, and references intentionally brought forward for the active Session.

## Core rule

Prepared persistent material is a set/order of **references to persistent identities** plus Session-local relevance metadata.

Prepare may also contain [[STG-010 — Session Instance Model]] records for intentionally Session-scoped runnable material such as an adversary, improvised NPC, familiar or hazard.

Neither approach copies Session canon.

## Potential groups

- People;
- Places;
- Factions;
- Things / Artifacts;
- Active Threads;
- Fragments;
- Sources / References;
- Session Instances / runnable adversaries, NPCs, hazards or other session-scoped material.

Only populated/relevant groups appear.

## Family projections

Reuse family Prepare Projections where those exist. Examples include Character Prepare Row/Card, Place Prepare treatment, Thread Prepare Projection, and Artifact Prepare treatment. Where no dedicated Prepare projection exists, use Index/compact projection plus Session Relevance cue.

## Session relevance

A prepared reference may carry Session-local context such as `Knows about the ledger`, `Expected at the Audience`, `Current scene`, `Likely consequence`, or `Rule needed tonight`. This does not overwrite the persistent object summary or canon.

## Interaction

Support add/pin, remove from Session, reorder where useful, open Peek/Focus, locate on Canvas, place on Board, add reference to selected Scene, and drag into Scene where supported. Removing a persistent reference never deletes the World Object. Removing a Session Instance from preparation does not erase its Session history once it has been used.

## Stage continuity

Prepared material feeds the Stage Entity Rail / Stage context. Stage reuses the same persistent identities, Session Instances, and session-local relevance cues. Prepared participants can feed Encounter Flow directly.

## Relationships

- World Object family Prepare projections
- [[PREP-003 — Prep Canvas Lens]]
- [[PREP-005 — Scene & Beat Stack]]
- [[PREP-010 — Stage Readiness & Session Packet]]

## Handoff

Build **PREP-006 — Session Context Collection** as the prepared-reference collection linking the upcoming Session to persistent world identity.
