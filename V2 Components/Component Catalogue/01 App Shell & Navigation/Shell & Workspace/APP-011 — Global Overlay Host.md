---
id: APP-011
status: active
kind: component
authority: current
system: SYS-01
family: shell-workspace
storybook: component
depends_on:
- DS-BHV-OVERLAY
platforms:
- web
---

# APP-011 — Global Overlay Host

Parent: [[APP-001 — Global App Shell]]

## Purpose

Global Overlay Host provides one consistent screen-space mounting and interaction layer for transient interface that must sit above active Relic surfaces.

It prevents Search, menus, popovers, and contextual overlays from each inventing their own stacking and dismissal rules.

## Context & placement

Covers the shell viewport as a transparent interaction layer.

It has no visible resting appearance.

It only becomes perceptible through the components mounted into it.

## Use

Hosts components such as:

- Relic Menu;
- Profile Menu;
- Search Results;
- context menus;
- create menus;
- popovers;
- tooltips;
- narrow-layout carriage overlays;
- modal confirmations where required.

Docked carriages are **not** normal overlay-host content.

## Behaviour

The host owns:

- correct screen-space anchoring;
- viewport-edge collision handling;
- stacking order;
- click-away dismissal;
- Escape dismissal;
- returning keyboard focus to the invoking control;
- closing incompatible sibling overlays;
- carriage-aware available screen bounds.

Opening a global menu should close another unrelated global popover rather than piling surfaces indefinitely.

The topmost dismissible overlay receives Escape first.

Tooltips and other subordinate transient elements may coexist where appropriate.

## States & variants

The Host itself has no meaningful visual states.

Interaction cases include:

- anchored popover;
- free-position context menu;
- Search Results;
- modal layer;
- responsive sheet/carriage overlay.

## Relationships

- [[APP-003 — Relic Menu]] — anchored global menu.
- [[APP-009 — Profile Menu]] — anchored account menu.
- [[APP-004 — Global Search & Quick Open]] — invokes Search Results.
- [[APP-010 — Workspace Dock Manager]] — may hand constrained carriages to overlay mode.
- shared tooltip/popover/menu primitives — use this host where appropriate.

## Handoff

Build **APP-011 — Global Overlay Host** as the shared shell-level mounting, stacking, dismissal, and focus-restoration layer for transient UI.
