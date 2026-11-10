---
id: APP-003
status: active
kind: component
authority: current
system: SYS-01
family: global-controls
storybook: component
depends_on:
- APP-011
- APP-005
- DS-SRF-MENU
platforms:
- web
---

# APP-003 — Relic Menu

Parent: [[APP-002 — Relic Button]]

## Purpose

The Relic Menu is the compact global navigation surface.

It gives the GM access to Relic's primary destinations and Saga context without introducing a persistent navigation sidebar or top navigation bar.

## Context & placement

Anchored beneath or immediately adjacent to the Relic Button.

Mounted through [[APP-011 — Global Overlay Host]].

It overlays the current working surface and never changes its dimensions.

## Use

The GM opens it when they need to change major context rather than act within the current surface.

Primary navigation:

- Desk;
- Library;
- Sessions.

Saga context:

- current Saga identity;
- switch Saga;
- create/new Saga where appropriate.

A restrained recent-context area may expose a few recent Boards or working contexts if this proves useful, but it should not become a second Library.

Settings/account actions do not belong here; they remain under Profile.

## Anatomy

### Saga area

Current Saga name and subtle world/context identity.

May open the Saga-switching flow.

### Primary navigation

- Desk
- Library
- Sessions

One item clearly reflects the current destination.

### Optional recent work

A small number of genuinely useful recent destinations.

This section should disappear entirely when it has no value.

## Appearance & behaviour

Compact, text-forward, and editorial.

Not a large command centre.

Primary destinations should be immediately scannable.

The Saga area should be distinct but not visually louder than navigation.

Keyboard navigation and Escape dismissal should work through the shared Overlay Host.

Selecting a destination closes the menu and preserves the working state being left where possible.

## States & variants

- normal;
- current destination highlighted;
- Saga switch expanded/invoked;
- no recent work.

## Relationships

- [[APP-002 — Relic Button]] — opens this menu.
- [[APP-011 — Global Overlay Host]] — owns mounting/dismissal/focus restoration.
- [[APP-005 — Current Context Control]] — handles local Board/lens/session context rather than global navigation.
- [[APP-009 — Profile Menu]] — owns account/settings actions.

## Handoff

Build **APP-003 — Relic Menu** as the compact global navigation surface for Saga context plus Desk, Library, and Sessions.
