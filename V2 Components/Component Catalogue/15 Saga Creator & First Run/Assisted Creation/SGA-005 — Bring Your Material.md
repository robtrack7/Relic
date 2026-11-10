---
id: SGA-005
status: active
kind: behavior
authority: current
system: SYS-15
family: assisted-creation
storybook: none
depends_on:
- OBJ-SRC
- PLT-008
---

# SGA-005 — Bring Your Material

Parent: [[SYS-15 — Saga Creator & First Run]]

## Purpose

Lets existing notes become first-run Saga context by reusing normal Source ingestion rather than a special migration product.

## Input

Support whichever normal Source types are implemented. Pasted text/Markdown/plain text are valid. PDF is valid here when the ordinary Source/PDF ingestion path supports it. Do not build a parallel first-run importer.

## Preservation

Original material remains a [[OBJ-SRC — Source Representation Family]] Source with provenance, retrieval and citation intact.

## AI trigger

Storing/importing material does not automatically spend AI credits. The GM explicitly chooses `Organize into my Saga` or gives the Librarian an instruction.

## Output

The Librarian may propose Characters, Places, Factions, Artifacts, Threads, clearly historical Events, Relationships, and Session 1 material directly onto the ordinary Desk.

## Ambiguity

Ask only when uncertainty materially affects identity or structure. Do not interrogate the GM about every imperfect note.


## Platform ingestion owner

First-run material uses [[PLT-008 — Source Storage & Ingestion Pipeline]]; there is no separate Saga-creator ingestion backend.
