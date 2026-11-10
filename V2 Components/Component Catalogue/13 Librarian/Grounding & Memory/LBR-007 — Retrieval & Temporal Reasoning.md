---
id: LBR-007
status: active
kind: behavior
authority: current
system: SYS-13
family: grounding-memory
storybook: none
depends_on:
- CHR-003
- CHR-010
- SRH-001
---

# LBR-007 — Retrieval & Temporal Reasoning

Parent: [[SYS-13 — Librarian]]

## Purpose

Defines the Librarian’s reasoning-oriented retrieval path, distinct from direct Search navigation.

## Retrieval strategy

Prefer exact structured state, then relevant World Object state, lexical/source retrieval, then semantic retrieval where useful. Do not indiscriminately RAG every request.

## Temporal default

Every request resolves against an explicit story position; default is **Now**. Historical Focus/Chronicle/user language can override it.

## Pending versus settled

The Librarian may reason over `Settled world + Pending Session interpretation` when appropriate, but must preserve the distinction in its answer.

## Scope

Default scope is active Saga + relevant World. No sibling-Saga contamination. Authorization/RLS remains authoritative.

## Resolver contract

For structured historical state, use [[CHR-003 — Temporal Resolver & Now Projection]] rather than reconstructing past truth from stale prose. [[CHR-010 — Temporal Truth Layers]] governs settled/pending interpretation.

## Invocation boundary

Retrieval work begins only when responding to a GM Librarian request or fulfilling an explicit triggered AI workflow. Context changes alone do not trigger retrieval/model work.

## Relationships

- [[SRH-001 — Search System]]
- [[LBR-004 — Grounded Answer & Citation]]
- [[SYS-14 — Chronicle & Temporal Model]]

## Handoff

Build **LBR-007 — Retrieval & Temporal Reasoning** as context-aware, time-aware synthesis over authorized evidence.
