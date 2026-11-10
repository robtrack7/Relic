---
id: MEC-003
status: active
kind: component
authority: current
system: SYS-05
family: mechanics-components
storybook: component
depends_on:
- DS-MEC
platforms:
- web
---

# MEC-003 — Mechanics Layout Renderer

Parent: [[SYS-05 — Mechanics & Rules]]

## Purpose

Renders mechanics data according to a template and requested presentation profile.

## Inputs

Template, object mechanics data, role variant, presentation profile, responsive width, and edit/read-only state.

## Appearance & behaviour

Same renderer supports Character Focus, Expanded Mechanics Back, compact summaries, and encounter reference. System differences come from template structure and symbol packs rather than bespoke app code where practical.

## Responsive behaviour

Templates define layout priorities rather than fixed-pixel character sheets; sections can move from columns to stack without losing semantic grouping.

## Handoff

Build **MEC-003 — Mechanics Layout Renderer** as the responsive template-driven renderer shared by mechanics projections.
