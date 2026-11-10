---
id: OBJ-CHAR-02
status: active
kind: component
authority: current
system: SYS-04
family: projections
storybook: component
depends_on:
- BRD-006
- OBJ-CHAR-03
- DS-OBJ
platforms:
- web
---

# OBJ-CHAR-02 — Character Card

Parent: [[OBJ-CHAR — Character Representation Family]]

## Purpose

Small Desk representation answering **who is this person?** without reproducing the full Character record.

## Context & placement

Displayed through [[BRD-006 — Placement Host]] on ordinary Desk/Boards and on the central Canvas during Stage. It is the same component in both contexts.

## Anatomy

### Anatomy
- portrait/image when available;
- Character name;
- deliberate image-less fallback with a composed type/initial treatment.

The Small Card does not expose a dossier, mechanics, relationships, or long prose. It stays recognizable and easy to arrange on the Desk.

## Appearance & behaviour

Small editorial card quality. Name is dominant. Strong imagery can shape the card; image-less cards remain deliberately composed. Single click selects; double-click or keyboard activation opens [[FOC-001 — Focus Host]]. Intentional enlargement moves to [[OBJ-CHAR-03 — Expanded Character Card]].

## Explicit exclusions

No role/occupation panel, mechanics, relationships, full roleplay notes, knowledge, Event history, inventory, or long GM notes. Rename remains contextual (`F2`); substantive writing belongs in Focus or [[FOC-013 — Entity Builder Host]].

## Handoff

Build **OBJ-CHAR-02 — Character Card** as the standard narrative-first Character projection shared by ordinary Desk and Stage Canvas.
