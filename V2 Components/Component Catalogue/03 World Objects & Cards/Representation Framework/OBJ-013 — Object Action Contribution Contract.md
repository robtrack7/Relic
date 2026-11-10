---
id: OBJ-013
status: active
kind: behavior
authority: current
system: SYS-03
family: representation-framework
storybook: pattern
depends_on:
- DSK-016
- DSK-024
- DS-OBJ
platforms:
- web
---

# OBJ-013 — Object Action Contribution Contract

Parent: [[OBJ-001 — World Object Representation Framework]]

## Purpose

Defines how World Object families contribute meaningful object-level actions to the surfaces that host them without allowing family components to own unrelated surface or Placement behavior.

## Action ownership

**Object-family actions** can include:
- Focus;
- Archive;
- semantic Connect;
- family-specific actions;
- actions that modify persistent object content/state.

**Surface/Placement actions** include:
- move;
- resize;
- z-order;
- remove from Board;
- copy/move Placement to another Board.

Those remain owned by Desk/Board, not the World Object family.

## Behaviour

A family exposes a small action set based on current object, surface, and authorization/context.

The hosting surface decides which actions appear directly, which live under More/context menus, and whether an action is appropriate to the current attention model.

The family does not render the surface toolbar itself.

## Relationships

- [[DSK-016 — Selection Toolbar]] — consumes object actions on Desk.
- [[DSK-024 — Placement Context Menu]] — combines object and Placement actions.
- Focus, Stage, Prepare, Library — consume relevant action subsets.

## Data / utility relationship

Provides action identity/availability; actual mutations execute through registered domain actions.

## Handoff

Implement **OBJ-013 — Object Action Contribution Contract** as the shared way World Object families expose object actions while Placement/surface actions remain externally owned.
