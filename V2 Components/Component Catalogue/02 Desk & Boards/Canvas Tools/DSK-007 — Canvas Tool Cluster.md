---
id: DSK-007
status: active
kind: component
authority: current
system: SYS-02
family: canvas-tools
storybook: component
depends_on:
- APP-002
- DSK-008
- DSK-009
- DS-CAN
platforms:
- web
---

# DSK-007 — Canvas Tool Cluster

Parent: [[DSK-001 — Desk Surface]]

## Purpose

The Canvas Tool Cluster is the Desk's only persistent spatial tool group.

It provides four high-value modes without turning Relic into a large diagramming toolbar:

- Select;
- Create;
- Compose;
- Connect.

This replaces the earlier distinction between a generic floating Desk tool cluster and Canvas tools; there is only one persistent screen-space Canvas tool group.

## Context & placement

Floats as a bottom-centred horizontal group along the Canvas in screen space, closely following the Desk Concept composition.

It is screen-space chrome and does not reserve Canvas width.

During Stage, the Stage Carriage may overlay the shell edge. On standard desktop, the Canvas and this Tool Cluster retain their screen positions. Stage does not remove ordinary Canvas tools.

## Anatomy

**Select**
Returns to ordinary object/Canvas manipulation and exposes a mode dropdown for Select (`V`) or Hand (`H`). In Hand mode, left-drag pans the Canvas. Holding Space temporarily enters Hand and returns to the prior mode on release.

**Create**
Opens [[DSK-008 — Create World Material Menu]] for persistent world material.

**Compose**
Opens [[DSK-009 — Composition Tool Menu]] for Board-only organizational/visual objects.

**Connect**
Enters [[DSK-012 — Semantic Connect Interaction]] for creating meaningful Relationships, including batch-connect workflows.

## Appearance & behaviour

One horizontal authored instrument group of circular shared controls rather than a vertical rail. Each control has an accessible tooltip and keyboard shortcut.

Only one persistent tool mode can be active at a time.

Create and Compose normally open menus rather than locking a tool until the user selects a concrete creation action.

Connect receives a clear active mode because the cursor/selection behavior changes.

Create and Compose menus anchor above their bottom tool. Keyboard Escape closes an open menu or returns the active mode to Select.

## States & variants

- Select active;
- Create menu open;
- Compose menu open;
- Connect active;
- Stage overlay presentation.

## Relationships

- [[DSK-008 — Create World Material Menu]] — persistent world content creation.
- [[DSK-009 — Composition Tool Menu]] — composition-only creation.
- [[DSK-012 — Semantic Connect Interaction]] — semantic relationship mode.
- [[STG-001 — Stage Workspace State]] — overlays the left edge on standard desktop while preserving the full tool cluster's viewport anchor.

## Handoff

Build **DSK-007 — Canvas Tool Cluster** as the four-tool bottom-centred horizontal group: Select, Create, Compose, Connect.
