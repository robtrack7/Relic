---
id: STG-002
status: active
kind: component
authority: current
system: SYS-11
family: workspace-live-tools
storybook: component
depends_on:
- STG-005
- STG-004
- STG-006
- DS-WFL
platforms:
- web
---

# STG-002 — Stage Carriage

Parent: [[STG-001 — Stage Workspace State]]

## Purpose

Provides the compact far-left live-play control surface while leaving the central Canvas as the primary world workspace.

## Context & placement

At the far-left through the shared Dock Manager. On standard desktop it overlays the existing Canvas without moving the Canvas or its primary Tool Cluster. Constrained shared/split presentation is owned by the Dock Manager.

[[STG-005 — Stage Entity Rail]] runs along the carriage's right edge adjacent to the Canvas.

## Anatomy

Recommended vertical order:

**Session**
- title/number;
- LIVE elapsed time;
- recording state when active.

**Current Scene**
- scene title;
- short purpose/situation;
- current Place/relevance cue.

**Scene Stack**
- same Scenes/Beats from Prepare;
- current Scene emphasized.

**Context**
- active Threads;
- prepared reminders;
- pinned references/rules;
- Encounter Flow where active.

**Recent Captures**
- recent Fragments;
- Marked Moments.

**Persistent live actions**
- Capture;
- Record / Pause / Resume;
- Mark;
- Dice;
- End Session.

## Appearance & behaviour

Dense enough for live utility but visually quieter than the Canvas.

Use compact progressive disclosure. Do not make every subsystem permanently expanded.

`LIVE` and `REC` are separate states:
- LIVE = Session In Progress;
- REC = audio recording active.

Mark is disabled unless recording is active.

## Scene and encounter coexistence

When Encounter Flow is active, its compact control can occupy a carriage section without replacing Scene context.

The GM should still understand:
- what Scene is active;
- what structured flow is active;
- what object is selected/current.

Encounter Flow is a live-play utility, not the entire Stage.

## Relationships

- [[STG-004 — Live Scene Flow]]
- [[STG-005 — Stage Entity Rail]]
- [[STG-006 — Session Capture & Marking]]
- [[STG-007 — Recording & Consent]]
- [[STG-008 — Stage Dice Utility]]
- [[STG-009 — Encounter Flow]]
- [[STG-015 — End Session & Undo]]

## Handoff

Build **STG-002 — Stage Carriage** as the compact live-session left dock that evolves directly from Prepare Carriage.
