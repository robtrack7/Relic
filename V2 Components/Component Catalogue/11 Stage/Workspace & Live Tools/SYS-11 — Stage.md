---
id: SYS-11
status: active
kind: system
authority: current
system: SYS-11
storybook: none
---

# SYS-11 — Stage

## Purpose

Owns live Session operation: workspace state, carriage, Canvas attention, scenes, entity rail, capture/recording, dice, system-flexible Encounter Flow, Session Instances, optional live mechanics, Librarian context, and End Session boundary.

## Core product model

Stage is:

`Stage Carriage | normal Canvas in Stage View | Librarian`

It is the live evolution of Prepare, not a separate dashboard.

**The interface changes. The world does not.**

## Core rules

- Stage is a workspace state.
- Canvas tools remain fully available.
- persistent World Objects use ordinary Card/Expanded/Focus representations.
- primary interaction orients; deliberate deep interaction opens depth.
- Scenes/Beats are the same Session composition created in Prepare.
- Quick Capture creates Fragment.
- Mark Moment bookmarks recording.
- recording is optional and consent-gated.
- no real-time transcription/diarization requirement.
- Dice uses the shared rich roll engine.
- Encounter Flow may be ranked, spotlight, alternating, phased or freeform.
- Flow Only is first-class.
- Session Instances provide fast Session-scoped runnable identities.
- Encounter Participant is runtime membership, not identity.
- live resources are optional Session Mechanics State shown primarily through mechanics representations, not an overloaded encounter row.
- no automated combat adjudication.
- Librarian remains fully available as the core AI operating layer.
- End Session uses confirmation + undo before processing.
- Stage is designed for local/offline continuity.

## Catalogue

### Continuity Handoff

- [[STG-014 — Stage Librarian Context Bridge]]
- [[STG-015 — End Session & Undo]]
- [[STG-016 — Stage Offline Continuity & Recovery]]

### Encounter Mechanics

- [[STG-009 — Encounter Flow]]
- [[STG-010 — Session Instance Model]]
- [[STG-010A — Session Instance Live Card]]
- [[STG-011 — Resolve Session Instance]]
- [[STG-012 — Encounter Participant]]
- [[STG-013 — Live Mechanics Presentation]]

### Workspace Live Tools

- [[STG-001 — Stage Workspace State]]
- [[STG-002 — Stage Carriage]]
- [[STG-003 — Stage Canvas View]]
- [[STG-004 — Live Scene Flow]]
- [[STG-005 — Stage Entity Rail]]
- [[STG-005A — Stage Entity Rail Item]]
- [[STG-006 — Session Capture & Marking]]
- [[STG-007 — Recording & Consent]]
- [[STG-008 — Stage Dice Utility]]


## Platform

Stage is designed and implemented as part of the full web V2 product. Mobile adaptation is later.
