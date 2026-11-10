---
id: PREP-001
status: active
kind: surface
authority: current
system: SYS-10
family: prepare
storybook: scene
depends_on:
- PREP-002
- PREP-003
- PREP-009
- DS-WFL
platforms:
- web
---

# PREP-001 — Prepare Workspace State

Parent: [[SYS-10 — Sessions & Prepare]]

## Purpose

Defines Prepare as a workspace state applied to Relic's normal spatial working environment rather than as a detached conventional page. Prepare combines a left Prep Carriage, the central Canvas in Prep Lens state, and the persistent Librarian Carriage on the right when open.

## Workspace composition

Primary wide composition:

`Prepare Carriage | Prep Canvas | Librarian Carriage`

Prepare Carriage is the structured Session-planning surface. Prep Canvas remains the ordinary Canvas with normal tools and World Object representations. Librarian remains the same global AI operating layer used elsewhere.

## Context & placement

Prepare is entered from Sessions Surface, Active Session Return, Session actions, and other explicit session-navigation flows. Leaving Prepare preserves Session state. Prepare is not a separate Board type.

## Use

The GM uses Prepare to define Session intent/opening, arrange Scenes/Beats, select relevant Characters/Places/Factions/Artifacts/Threads/Sources, foreground those identities on the Canvas, create/edit world material naturally, write checklist/reminders, review carry-forward context, work with the Librarian in Session context, and mark the Session ready for Stage.

## Appearance & behaviour

Prepare should feel like the world has entered a session-planning mode, not like the GM has left the world for a form. The carriage supplies vertical sequence and structure. The Canvas supplies spatial/world context. The Librarian supplies the product's persistent AI operating layer.

## States & variants

- Planned;
- Ready;
- Librarian closed/open;
- selected Scene;
- selected prepared World Object;
- degraded/offline;
- transitioning to Stage.

## Responsive behaviour

Wide: dock Prepare Carriage left, keep central Canvas fully interactive, dock Librarian right. Medium: reduce central layout complexity before removing the Canvas tool set; Librarian can overlay if necessary. Narrow: carriage/lens can become sequential/overlay states while preserving the same semantic structure. Prepare Carriage should not permanently replace the Canvas.

## Relationships

- [[PREP-002 — Prepare Carriage]]
- [[PREP-003 — Prep Canvas Lens]]
- [[PREP-009 — Prep Librarian Context Bridge]]
- [[APP-010 — Workspace Dock Manager]]
- [[DSK-002 — Canvas Viewport]]

## Handoff

Build **PREP-001 — Prepare Workspace State** as the three-part planning state: left Prep Carriage, central Prep Canvas Lens, persistent Librarian.
