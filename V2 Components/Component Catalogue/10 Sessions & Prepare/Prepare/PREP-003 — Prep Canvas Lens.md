---
id: PREP-003
status: active
kind: behavior
authority: current
system: SYS-10
family: prepare
storybook: none
depends_on:
- DSK-001
- DSK-002
- PREP-005
---

# PREP-003 — Prep Canvas Lens

Parent: [[PREP-001 — Prepare Workspace State]]

## Purpose

Applies Session-aware attention and foregrounding to the normal Canvas without creating a separate Prep Board or duplicating World Objects.

## Core rule

Prep Lens changes **attention and context**, not identity. World Objects remain their ordinary Canvas components. The Canvas remains fully interactive with normal Select, Create, Compose, Connect, Focus, and Board navigation.

## Foregrounding

Prep Lens can visually foreground prepared World Objects, selected Scene participants/references, active Threads, current planned Place, pinned rules/Sources, and session-relevant Fragments. Unrelated material may soften slightly when useful but should not disappear in a way that makes the Board feel replaced.

## Scene selection

Selecting a Scene in the Prep Carriage can update the Canvas Lens to emphasize the World Objects referenced by that Scene. Example `The Audience` foregrounds Winter Palace, Seraphine, Mara, Iron Deed, and related Thread. Selecting another Scene updates attention without creating or destroying identity.

## Board relationship

Prepare does not automatically create a Session Board. The GM may use the current Board, another existing Board, or a dedicated Board they intentionally created for the Session. Session composition references World Object identities independently from Board Placement.

## Prepared items without placement

If a prepared object does not exist on the current Board, Prep Lens can surface it in Session Context Collection and offer locate/place/open actions. Do not silently duplicate Placements.

## Librarian relationship

Librarian actions can naturally operate across Prep Canvas semantics, including selecting, arranging, connecting, or creating content through the standard Canvas/world tools. Prep Lens supplies the active Session and selected Scene context; the Librarian system owns tool execution and autonomy behavior.

## Relationships

- [[DSK-001 — Desk Surface]]
- [[DSK-002 — Canvas Viewport]]
- [[PREP-005 — Scene & Beat Stack]]
- [[PREP-006 — Session Context Collection]]
- [[PREP-009 — Prep Librarian Context Bridge]]

## Handoff

Implement **PREP-003 — Prep Canvas Lens** as a Session-aware attention layer over the ordinary Canvas, never as a duplicate Prep database or automatic Session Board.
