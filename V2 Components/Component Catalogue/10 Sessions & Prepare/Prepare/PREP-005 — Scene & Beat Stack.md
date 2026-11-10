---
id: PREP-005
status: active
kind: component
authority: current
system: SYS-10
family: prepare
storybook: component
depends_on:
- PREP-003
- STG-009
- PREP-006
platforms:
- web
---

# PREP-005 — Scene & Beat Stack

Parent: [[PREP-002 — Prepare Carriage]]

## Purpose

Provides lightweight structured Session composition that flows directly from Prepare into Stage. Scenes and Beats organize anticipated play without becoming persistent World Object families.

## Scene model

A Scene is Session-local composition. Possible fields: optional title, optional Place reference, short purpose/situation, notes, ordered Beats, relevant World Object references, Session Instance references, likely structured-flow participants, and reminders. A Scene can remain extremely sparse.

## Beat model

A Beat is a lightweight ordered prompt: usually one sentence, optional linked World Object, optional reminder/trigger. No task workflow, completion status, or story-point machinery.

## Interaction

Support create, reorder, duplicate, remove, collapse/expand, direct edit, drag/reference World Objects or Session Instances into a Scene, and select Scene to drive [[PREP-003 — Prep Canvas Lens]]. Scene reordering is Session composition only.

## Deep editing

A deliberate Scene action can temporarily deepen the Scene into a larger editorial central workspace for longer notes. This is a temporary editing representation. It does **not** grant Scene permanent World Object identity.

## Planned participants

A Scene may optionally hold a lightweight participant roster for structured live play.

Examples:
- Mara
- Rhest
- `Goblin ×4`
- Bandit Captain
- collapsing bridge hazard

This is not a full Encounter Builder. It is the prepared set Stage can use to initialize [[STG-009 — Encounter Flow]] when needed.

## Stage continuity

Stage consumes the same ordered Scene/Beat structure. Do not build a separate Stage agenda model. Stage can add runtime state such as current Scene, but the underlying planned composition remains the same Session data.

## Appearance & behaviour

Vertical, collapsible, readable. Think session outline/notebook rather than kanban board. Scene titles and first-line purpose matter more than metadata.

## Relationships

- [[PREP-003 — Prep Canvas Lens]]
- [[PREP-006 — Session Context Collection]]
- Stage Carriage

## Handoff

Build **PREP-005 — Scene & Beat Stack** as lightweight Session-local composition shared by Prepare and Stage.
