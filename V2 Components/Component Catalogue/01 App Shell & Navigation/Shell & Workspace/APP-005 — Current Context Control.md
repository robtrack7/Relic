---
id: APP-005
status: prototype
kind: component
authority: current
system: SYS-01
family: shell-workspace
storybook: component
depends_on:
- CHR-004
- CHR-006
- APP-004
platforms:
- web
---

# APP-005 — Current Context Control

Parent: [[APP-001 — Global App Shell]]

## Purpose

Current Context gives the GM a quiet, persistent answer to: **Where am I?**

It replaces traditional breadcrumbs and prevents each major surface from inventing a different header/navigation language.

## Context & placement

Lives in the upper working frame adjacent to Global Search.

It occupies screen space, not canvas coordinates.

The Shell owns its placement and outer visual language.

The active surface supplies its relevant context and switching options.

## Use

The control changes its content according to what the GM is currently doing.

Examples:

- `The Harbour Board`
- `The Harbour Board · Chronicle`
- `Library`
- `Session 12 · Prepare`
- `Session 12 · Stage`
- `Mara Venn · Focus`

The Saga name should only appear when useful for disambiguation; the control should not constantly display a verbose hierarchy.

Selecting it opens contextual switching relevant to the current surface.

On Desk this may include:

- Board switching;
- active lens.

In Prepare/Stage it may provide:

- Session identity;
- path between Prepare and Stage where appropriate.

It should not become a generic action menu.

## Chronicle context

On Desk, Chronicle is a lens/workspace option supplied through Current Context rather than a permanent global navigation destination.

Examples:
- `The Harbour Board`
- `Chronicle · Session 8 · The Bargain`

Chronicle switching/navigation is defined by [[CHR-004 — Chronicle Workspace State]] and [[CHR-006 — Story Position Control]].

## Anatomy

- dominant current-context label;
- optional secondary qualifier such as lens or mode;
- subtle disclosure affordance where switching is available.

## Appearance & behaviour

Typography-forward and quiet.

It should feel more like a caption identifying the current working material than a breadcrumb bar.

Changes between contexts should preserve its physical location so the GM develops stable orientation.

Long context names truncate gracefully rather than expanding the shell dramatically.

## States & variants

- static context;
- switchable context;
- menu open;
- loading/transitioning;
- long-name truncation.

## Relationships

- [[APP-001 — Global App Shell]] — owns placement.
- [[APP-004 — Global Search & Quick Open]] — neighbouring global retrieval.
- [[APP-006 — Active Session Return]] — disappears into this control while already in Session context.
- [[BRD-001 — Board Context Popover]] — may supply Desk-specific switching content.
- [[STG-001 — Stage Workspace State]] — supplies Stage context.

## New Saga entry

`+ New Saga` routes through [[SGA-001 — New Saga Entry & Saga Shell]]. After minimal setup the GM lands directly on [[DSK-001 — Desk Surface]].

## Handoff

Build **APP-005 — Current Context Control** as the consistent upper-frame orientation/switching component whose content is supplied by the active Relic surface.
