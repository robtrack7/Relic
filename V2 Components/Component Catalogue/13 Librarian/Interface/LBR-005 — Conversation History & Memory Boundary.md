---
id: LBR-005
status: active
kind: behavior
authority: current
system: SYS-13
family: interface
storybook: none
depends_on:
- LBR-009
- LBR-012
---

# LBR-005 — Conversation History & Memory Boundary

Parent: [[SYS-13 — Librarian]]

## Purpose

Preserves useful Librarian conversation history while preventing chat from becoming hidden canon or an uncontrolled parallel memory store.

## Conversation persistence

Librarian threads persist, normally scoped to the active Saga. The GM can continue, start new, and reopen/search past threads. Workspace changes do not automatically create new conversations.

## Context provenance

Messages can retain references to the semantic context snapshot used for that turn.

## Long-thread compaction

Compaction may be used for model efficiency but must be derived, rebuildable, non-canonical, and unable to override settled world state.

## Memory boundary

Conversation is not canon. `Remember that Seraphine hates roses` becomes explicit world-write intent: update appropriate world material, create a Fragment, or propose according to authority.

## Relationships

- [[LBR-009 — Intent, Authority & Autonomy Gate]]
- [[LBR-012 — Execution, Progress, Receipt & Undo]]

## Handoff

Build **LBR-005 — Conversation History & Memory Boundary** so durable memory lives in Relic’s actual semantic structures.
