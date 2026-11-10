---
id: STG-010
status: active
kind: domain
authority: current
system: SYS-11
family: encounter-mechanics
storybook: none
depends_on:
- MEC-022
- STG-010A
- STG-011
---

# STG-010 — Session Instance Model

Parent: [[SYS-11 — Stage]]

## Purpose

Defines a lightweight Session-scoped runnable identity for people, creatures, adversaries, summons, hazards, environmental threats, or other mechanically useful things that the GM needs now but has not chosen to establish as persistent world identity.

## Why it exists

Examples:
- wandering monster;
- `Goblin ×4`;
- forgotten deadly familiar;
- improvised innkeeper;
- nameless guard;
- collapsing bridge;
- magical storm.

Permanent World Objects for every ephemeral element would pollute the campaign; losing them after play would destroy continuity.

## Kinds

Suggested kinds:
- NPC;
- creature/adversary;
- summon/familiar;
- hazard;
- environment;
- object;
- custom.

The UI should show friendly kind labels rather than emphasizing the technical term.

## Data / anatomy

May contain:
- display name;
- kind/role;
- image/icon;
- short portrayal/behaviour cue;
- mechanics template/reference;
- mechanics definition overrides;
- [[MEC-022 — Session Mechanics State]];
- Source/rules provenance;
- current Scene;
- Session notes;
- Librarian/manual generation provenance.

## Creation paths

Can be created manually, through Librarian, from rules/bestiary Source, from mechanics template, by duplication, during Prepare, or mid-Stage.

Creation must be fast enough for live play.

## Live representation

Rendered live presentation is owned by [[STG-010A — Session Instance Live Card]]. The domain model remains Session-scoped regardless of how it is displayed.

## Persistence

Session Instances remain with Session history even when never promoted.

They do not appear as ordinary persistent Characters/Artifacts/etc. in Library.

They remain discoverable through Session-scoped Search.

## Relationships

- [[STG-011 — Resolve Session Instance]]
- [[STG-012 — Encounter Participant]]
- [[MEC-022 — Session Mechanics State]]
- [[PREP-006 — Session Context Collection]]

## Handoff

Implement **STG-010 — Session Instance** as the durable Session-scoped runnable identity between a raw Fragment and a permanent World Object.
