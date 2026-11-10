---
id: PREP-009
status: active
kind: behavior
authority: current
system: SYS-10
family: prepare
storybook: none
depends_on:
- LBR-013
- FOC-012
- SRH-001
---

# PREP-009 — Prep Librarian Context Bridge

Parent: [[PREP-001 — Prepare Workspace State]]

## Purpose

Makes the active Session and preparation state part of the Librarian's semantic operating context. The Librarian is a core world-management layer, not an optional Prepare assistant.

## Context supplied

Where authorized and relevant:
- active Session;
- Session objective;
- opening;
- selected Scene/Beat;
- prepared Characters;
- prepared Places;
- prepared Factions;
- prepared Artifacts;
- active Threads;
- prepared Fragments;
- references/Sources;
- checklist/reminders where useful;
- carry-forward Events/consequences;
- current Board;
- selected Canvas objects;
- current story position;
- pending prior-Session interpretation when settlement is incomplete, clearly distinguished from settled state;
- current Focus/selection if one is open.

## Core capability relationship

With Prepare context active, the Librarian can naturally:
- retrieve campaign knowledge;
- answer questions;
- create World Objects;
- edit existing World Objects;
- add/remove prepared references;
- create/reorder Scenes and Beats;
- arrange/select/place Canvas material through registered tools;
- create or edit Relationships;
- identify relevant Threads;
- retrieve/pin rules references;
- summarize settled carry-forward context;
- propose or perform world changes according to autonomy mode.

These are ordinary Librarian capabilities operating inside Prepare context—not a separate Prepare AI feature set.

## Examples

Natural interactions include:
- `Give me three beats for the Audience scene.`
- `Add Mara and Rhest to the Audience.`
- `Create a dockworker who owes Seraphine money and put him near the harbour.`
- `Pull everyone relevant to this Thread onto the Canvas.`
- `Arrange these Characters around the palace.`
- `What changed last Session that could affect this scene?`
- `Find the grappling rule and pin it for tonight.`
- `Make Seraphine's objective more conflicted.`
- `Create a minor Faction representing the harbour workers.`
- `Move these beats so the betrayal happens after the bell.`
- `Give me a quick briefing on what Mara believes right now.`

## Mutation-class awareness

The bridge must preserve the semantic distinction between:

**Session composition changes** — e.g. add Seraphine to a Scene.

**Board composition changes** — e.g. move a Placement beside another.

**World semantic changes** — e.g. create/edit a Relationship or change Character state.

**New persistent identity** — e.g. create a new Character.

**Reference/retrieval actions** — e.g. find and pin a rules Source.

The Librarian system defines tool execution, proposals, autonomy modes, approvals, and canon safeguards for these classes. Prepare defines the active context and Session-local result of those actions.

## Human-initiation boundary

Prepare context updates continuously and deterministically. Changing Scene, selecting a prepared object, or editing the Session does not by itself trigger AI work. Librarian work begins from a GM request, explicit UI command, or configured workflow under [[LBR-013 — Human-Initiated Agentic Work]].

## Ownership boundary

Section 10 requires these capabilities to be available naturally through the Librarian. The Librarian system remains the canonical owner of conversation UX, reasoning/retrieval architecture, registered tools, world creation/editing orchestration, proposal generation, autonomy modes, approval/canon safeguards, and database/tool execution. Do not reimplement any of those inside Prepare.

## Relationships

- [[FOC-012 — Focus Librarian Context Bridge]]
- [[SRH-001 — Search System]]
- [[PREP-003 — Prep Canvas Lens]]
- [[PREP-005 — Scene & Beat Stack]]
- [[PREP-006 — Session Context Collection]]
- Librarian system

## Handoff

Implement **PREP-009 — Prep Librarian Context Bridge** as the semantic context adapter that lets the core Librarian operating layer work naturally across Session prep, Canvas, and world state.
