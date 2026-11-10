---
id: APP-007
status: active
kind: component
authority: current
system: SYS-01
family: global-controls
storybook: component
depends_on:
- APP-010
- LBR-001
- DS-CTL-ICON-BUTTON
platforms:
- web
---

# APP-007 — Librarian Toggle

Parent: [[APP-001 — Global App Shell]]

## Purpose

The Librarian Toggle is the persistent shell-level control for opening and collapsing Relic's contextual assistant.

It keeps the Librarian always reachable without allowing AI chrome to dominate the workspace.

## Context & placement

Floats in the top-right immediately before Profile.

It remains in the same location across major surfaces.

On Canvas surfaces, the top-right toggle remains available alongside the collapsed labeled Librarian edge capsule.

On activation, it opens [[LBR-001 — Librarian Carriage]].

Docking/overlay behavior is owned by [[APP-010 — Workspace Dock Manager]].

## Use

The GM invokes it when they want to:

- ask a contextual question;
- retrieve something through the Librarian;
- ask Relic to perform an appropriate semantic action;
- review an explicit Librarian result.

It can quietly signal when a user-requested Librarian operation has completed.

It should not expose model/provider state.

## Anatomy

- Librarian-specific icon/mark;
- optional tiny state indicator;
- accessible label/tooltip.

No permanent text label is required.

## Appearance & behaviour

Should feel related to the Relic Button but clearly secondary.

Avoid generic sparkle/AI-gradient styling.

When the carriage is open, the control receives a clear selected/open treatment.

A completed requested operation may produce a brief restrained state change, after which the control returns to rest.

## States & variants

- resting;
- hover/focus;
- carriage open;
- explicitly processing;
- requested result ready;
- Librarian unavailable.

## Relationships

- [[LBR-001 — Librarian Carriage]] — opened/collapsed by this control.
- [[APP-010 — Workspace Dock Manager]] — determines whether the carriage docks or overlays.
- [[APP-008 — Profile Control]] — neighbouring top-right global control.
- [[APP-012 — Global Action Receipt]] — may confirm completed Librarian mutations.

## No invocation on open

Opening/closing the Librarian Carriage is deterministic UI state and does **not** itself trigger a model call. AI work begins only under [[LBR-013 — Human-Initiated Agentic Work]].

## Handoff

Build **APP-007 — Librarian Toggle** as the persistent top-right control for opening and collapsing the Librarian Carriage.
