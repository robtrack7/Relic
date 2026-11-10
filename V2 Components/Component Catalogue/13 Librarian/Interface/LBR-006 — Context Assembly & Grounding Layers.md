---
id: LBR-006
status: active
kind: behavior
authority: current
system: SYS-13
family: interface
storybook: none
depends_on:
- LBR-013
- LBR-003
- LBR-007
---

# LBR-006 — Context Assembly & Grounding Layers

Parent: [[SYS-13 — Librarian]]

## Purpose

Defines the product-level context stack assembled for a Librarian request without requiring model calls simply to determine where the user is.

## Context order

`Operating rules → World/Saga orientation → story position → workspace/selection → pinned context → conversation context → retrieved evidence → user request`

## Deterministic-first assembly

Direct application state should be assembled deterministically: IDs, active Scene, selected objects, current Board, story position, Session, pending Settlement state, current Encounter participant. Do not spend model tokens rediscovering facts the app already knows.

## World / Saga orientation

Compact derived World/Saga briefs may orient the model, but they are not canon or citation sources and cannot override authoritative state.

## Trust layers

Context structurally distinguishes **SETTLED**, **PENDING**, and **UNTRUSTED EVIDENCE**. This distinction survives retrieval, reasoning, and tool planning.

## No passive invocation

Context can update continuously, but context change alone never triggers AI work. AI invocation requires [[LBR-013 — Human-Initiated Agentic Work]] origin.

## Relationships

- [[LBR-003 — Context Scope & Inspector]]
- [[LBR-007 — Retrieval & Temporal Reasoning]]
- [[LBR-013 — Human-Initiated Agentic Work]]

## Handoff

Implement **LBR-006 — Context Assembly & Grounding Layers** as deterministic context preparation plus derived orientation, never as background AI activity.
