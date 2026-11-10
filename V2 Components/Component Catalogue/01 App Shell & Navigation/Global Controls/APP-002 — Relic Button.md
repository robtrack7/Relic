---
id: APP-002
status: active
kind: component
authority: current
system: SYS-01
family: global-controls
storybook: component
depends_on:
- APP-003
- DS-CTL-ICON-BUTTON
platforms:
- web
---

# APP-002 — Relic Button

Parent: [[APP-001 — Global App Shell]]

## Purpose

The Relic Button is the persistent top-left product mark and global navigation entry.

It replaces both a conventional logo/home link and a hamburger-menu control.

It should be recognizable enough that the GM quickly learns: **Relic lives here.**

## Context & placement

Floats in screen space at the top-left of the **active central workspace**. With no left carriage this is the normal working corner; when Stage docks at far-left, the Relic Button shifts right with the central workspace instead of overlaying the Stage Carriage.

It does not reserve header height and does not participate in canvas coordinates.

The active surface must leave enough visual breathing room that the control does not collide with its own surface-specific chrome.

On Desk, the Canvas Tool Cluster begins below it rather than competing beside it.

## Use

Selecting the control opens [[APP-003 — Relic Menu]].

The menu provides navigation between the small set of major Relic destinations and Saga-level switching.

The control itself should not navigate immediately on single click; its primary role is opening global navigation.

## Anatomy

- distinctive Relic mark or symbol;
- clickable/tappable control surface;
- optional subtle active/open treatment.

No label is required in its normal state.

## Appearance & behaviour

This is one of the few pieces of interface allowed to carry stronger product character.

It should feel authored and slightly object-like rather than like a generic rounded-square icon button.

Its resting state should remain quiet.

Hover/focus may reveal a slight surface, movement, underline, frame, or other restrained affordance consistent with the design system.

Opening the menu should feel anchored to the mark.

## States & variants

- resting;
- hover/focus;
- pressed;
- menu open.

## Relationships

- [[APP-003 — Relic Menu]] — menu opened by this control.
- [[APP-001 — Global App Shell]] — owns its top-left placement.
- [[DSK-007 — Canvas Tool Cluster]] — occupies the left edge below it on Desk.

## Handoff

Build **APP-002 — Relic Button** as Relic's persistent top-left identity/navigation control.
