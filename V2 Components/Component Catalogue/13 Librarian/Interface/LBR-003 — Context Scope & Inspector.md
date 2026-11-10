---
id: LBR-003
status: active
kind: component
authority: current
system: SYS-13
family: interface
storybook: component
depends_on:
- FOC-012
- PREP-009
- STG-014
platforms:
- web
---

# LBR-003 — Context Scope & Inspector

Parent: [[SYS-13 — Librarian]]

## Purpose

Makes the Librarian feel aware of where the GM is working while keeping context explicit, inspectable, and frozen per request.

## Context classes

**Ambient context**
Derived automatically from Relic state: active World/Saga, Board/workspace, selected objects, Focus object/section, Session, Scene, Encounter participant, Settlement Story Change, story position.

**Pinned context**
Explicit working set retained across turns.

**One-turn attachments**
Objects/Sources/pages/transcript segments attached to one request.

## Context line

Show a restrained summary such as `Stage · The Audience · Mara selected` or `Focus · Mara Venn · Knowledge`. Do not expose every ambient context item as a permanent chip wall.

## Context snapshot

Sending a request creates an immutable semantic context snapshot. If selection changes while the Librarian works, the in-flight request keeps its original meaning.

## Bridge inputs

- [[FOC-012 — Focus Librarian Context Bridge]]
- [[PREP-009 — Prep Librarian Context Bridge]]
- [[STG-014 — Stage Librarian Context Bridge]]
- [[REV-013 — Settlement Librarian Context Bridge]]
- Search-selected retrieval context
- Board/Canvas selection context

## No model call on context change

Ambient context assembly is deterministic. Selecting an object, opening Focus, changing Scene, advancing Encounter Flow, or switching Board updates context state without triggering a model request by itself.

## Relationships

- [[LBR-006 — Context Assembly & Grounding Layers]]
- [[LBR-013 — Human-Initiated Agentic Work]]

## Handoff

Build **LBR-003 — Context Scope & Inspector** as the semantic working-context layer with per-request snapshots and no passive AI invocation.
