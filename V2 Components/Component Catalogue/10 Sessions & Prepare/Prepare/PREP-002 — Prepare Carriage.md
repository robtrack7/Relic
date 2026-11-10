---
id: PREP-002
status: active
kind: component
authority: current
system: SYS-10
family: prepare
storybook: component
depends_on:
- PREP-004
- PREP-005
- PREP-006
- DS-WFL
platforms:
- web
---

# PREP-002 — Prepare Carriage

Parent: [[PREP-001 — Prepare Workspace State]]

## Purpose

Provides the structured vertical planning interface for an active Session. It is the Prepare counterpart to the Stage Carriage and should transition naturally into it.

## Context & placement

Docked at the far-left of the workspace. The central Canvas begins to its right. The Canvas Tool Cluster remains attached to the left edge of the shifted central Canvas region, not inside the Prep Carriage.

## Primary contents

The carriage can contain:
- [[PREP-004 — Session Brief]]
- [[PREP-005 — Scene & Beat Stack]]
- [[PREP-006 — Session Context Collection]]
- [[PREP-007 — Prep Checklist & Reminders]]
- [[PREP-008 — Carry-Forward Briefing]]
- references/pinned material;
- [[PREP-010 — Stage Readiness & Session Packet]] controls.

## Appearance & behaviour

Vertical, editorial, compact. Designed for sequence and glanceability rather than dense database editing. Sections can collapse. A selected Scene receives clear emphasis and controls the Prep Canvas Lens. Long-form deep editing can temporarily deepen a Scene/brief into the central workspace without making Scene a World Object.

## Prepare → Stage continuity

The Prep Carriage should be architected so the same Session composition can transition into Stage rather than being rebuilt. Scene stack remains recognizable; prepared references carry forward; checklist/reminders can remain available where relevant; left-dock geometry stays stable; Stage adds live tools and runtime state.

## Responsive behaviour

Wide: docked. Medium: narrower dock with progressive disclosure. Narrow: overlay/drawer-style representation with central Canvas preserved as the primary workspace when possible.

## Relationships

- [[PREP-005 — Scene & Beat Stack]]
- [[PREP-006 — Session Context Collection]]
- [[PREP-010 — Stage Readiness & Session Packet]]
- Stage Carriage

## Handoff

Build **PREP-002 — Prepare Carriage** as the structured left-dock Session planning surface that can transform naturally into Stage Carriage.
