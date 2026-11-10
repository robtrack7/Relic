---
id: STG-014
status: active
kind: behavior
authority: current
system: SYS-11
family: continuity-handoff
storybook: none
depends_on:
- PREP-009
- STG-009
- STG-006
---

# STG-014 — Stage Librarian Context Bridge

Parent: [[STG-001 — Stage Workspace State]]

## Purpose

Makes the active Session, Scene, Canvas, Encounter Flow, captures and references part of the Librarian's semantic operating context.

## Context supplied

Where authorized/relevant:
- active Session;
- current Scene/Beats;
- prepared/session-relevant World Objects;
- current Place;
- active Threads;
- selected Canvas object;
- current Focus;
- recent Fragments;
- Marked Moment metadata;
- recording state;
- pinned Sources/rules references;
- current Encounter Flow;
- current participant/spotlight;
- Session Instances;
- enabled Session Mechanics State;
- current story position.

## Core capabilities

With Stage context, the Librarian naturally:
- retrieves and answers world/rules questions;
- creates persistent World Objects;
- creates Session Instances;
- finds/instantiates rules or bestiary material;
- adds/removes Encounter Participants;
- creates/edits Scenes and Beats;
- arranges/selects/places Canvas material through registered tools;
- creates/edits Relationships;
- captures semantic developments;
- retrieves/pins references;
- summarizes the current structured situation;
- performs or proposes world changes according to autonomy mode.

These are normal Librarian capabilities operating in Stage context.

## Live-awareness boundary

Without real-time transcription, the Librarian does not silently know untranscribed table conversation.

Near-real-time awareness comes from structured world/session state, GM instructions, selections, captures, Encounter Flow and authorized Sources.

## Human-initiation boundary

Stage context changes are deterministic. No model call merely because Scene changes, Encounter Flow advances, selection changes, Entity Rail reorders, or recording is active. The Librarian acts only on explicit GM request, explicit UI workflow, or continuation of an already-authorized task.

## Mutation classes

Preserve distinctions among:
- Session composition;
- Encounter/session runtime;
- Board composition;
- semantic world change;
- new persistent identity;
- retrieval/reference action.

The Librarian system owns tool execution, autonomy, proposals, approvals and canon safeguards. Stage owns live context.

## Relationships

- [[PREP-009 — Prep Librarian Context Bridge]]
- [[STG-009 — Encounter Flow]]
- [[STG-010 — Session Instance Model]]
- [[STG-006 — Session Capture & Marking]]
- Librarian system

## Handoff

Implement **STG-014 — Stage Librarian Context Bridge** as the live semantic context adapter for the core Librarian operating layer.
