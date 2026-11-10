---
id: APP-009
status: active
kind: component
authority: current
system: SYS-01
family: global-controls
storybook: component
depends_on:
- APP-011
- SET-001
- DS-SRF-MENU
platforms:
- web
---

# APP-009 — Profile Menu

Parent: [[APP-008 — Profile Control]]

## Purpose

Profile Menu is the compact gateway to Relic's low-frequency account, configuration, support, and sign-out actions.

It prevents settings concerns from entering the primary product navigation.

## Context & placement

Anchored to the Profile Control and mounted through [[APP-011 — Global Overlay Host]].

It overlays the active surface and does not affect viewport bounds.

## Use

Likely primary entries:

- Settings;
- account / plan where applicable;
- Help / support;
- Sign out.

Provider preferences, AI configuration, appearance, data management, and similar detailed settings belong inside the Settings surface rather than expanding this menu.

## Anatomy

- small account identity area if useful;
- primary Settings action;
- secondary account/help actions;
- visually separated Sign Out.

Keep the number of entries low.

## Appearance & behaviour

Compact and conventional enough to be immediately understandable.

This is not a place where Relic needs unusual interaction design.

Use the product's typography, spacing, linework, and surface language, but prioritize clarity.

Escape/click-away closes the menu and returns focus through the shared Overlay Host.

## States & variants

- normal;
- account/plan item absent when irrelevant;
- sign-out in progress.

## Relationships

- [[APP-008 — Profile Control]] — opens the menu.
- [[APP-011 — Global Overlay Host]] — owns overlay behavior.
- [[SET-001 — Settings Surface & Scope Navigation]] — destination for detailed configuration.
- [[APP-003 — Relic Menu]] — owns product navigation instead.

## Settings entry

Profile Menu provides the primary entry to
[[SET-001 — Settings Surface & Scope Navigation]].

## Handoff

Build **APP-009 — Profile Menu** as the compact account/settings menu anchored to Profile Control.
