---
id: STG-001
status: active
kind: surface
authority: current
system: SYS-11
family: workspace-live-tools
storybook: scene
depends_on:
- PREP-010
- STG-002
- STG-003
- DS-WFL
platforms:
- web
---

# STG-001 — Stage Workspace State

Parent: [[SYS-11 — Stage]]

## Purpose

Defines Stage as Relic's live-play workspace state, transforming the prepared Session into active play without replacing the normal spatial world workspace.

## Workspace composition

Wide layout:

`Stage Carriage | Stage Canvas View | Librarian Carriage`

- Stage Carriage owns live Session structure and utilities.
- Stage Canvas remains the normal Canvas with full tools and ordinary World Object representations.
- Librarian remains the persistent AI operating layer.

Stage changes attention and runtime context; it does not create a separate live-play database.

## Entry

Entering Stage from [[PREP-010 — Stage Readiness & Session Packet]]:

1. confirms `Start Session` when the Session is not already live;
2. changes Session state `Ready → In Progress`;
3. transforms Prepare Carriage into Stage Carriage;
4. transforms Prep Canvas Lens into Stage Canvas View;
5. preserves Session composition, prepared context, current Board, and Librarian continuity.

Recording is independent. A Session can be live without recording.

## Live-session constraints

While a Session is In Progress:
- the active Saga cannot be casually switched underneath Stage;
- normal Search remains global;
- normal Canvas creation/editing remains available;
- Focus can open without dismissing Stage;
- Session-local composition can continue changing during play.

## Interaction quality

Stage interactions should favor continuity over modal interruption.

- current-participant changes should not yank the GM out of Focus or another deliberate inspection;
- Canvas movements caused by Stage should be smooth, contextual, and optional;
- primary gestures orient first;
- deliberate deeper gestures open depth;
- transient actions should preserve the GM's spatial and narrative train of thought.

## Responsive behaviour

Desktop/web is the primary and complete V2 implementation target. Design Stage for excellent wide and constrained web layouts. Mobile/native adaptation is explicitly later and should reuse semantics without forcing today's web composition into a premature cross-platform abstraction.

## Relationships

- [[STG-002 — Stage Carriage]]
- [[STG-003 — Stage Canvas View]]
- [[STG-014 — Stage Librarian Context Bridge]]
- [[APP-010 — Workspace Dock Manager]]
- [[PREP-001 — Prepare Workspace State]]

## Handoff

Build **STG-001 — Stage Workspace State** as the live state of the same Session workspace established by Prepare.
