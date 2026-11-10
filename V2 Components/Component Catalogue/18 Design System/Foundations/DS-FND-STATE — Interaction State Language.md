---
id: DS-FND-STATE
status: active
kind: primitive
authority: current
system: SYS-18
family: ds-fnd
storybook: primitive
platforms:
- web
---

# DS-FND-STATE — Interaction State Language

## Purpose

Defines the shared visual/behavioral grammar for interactive state so hover, focus, selection and disabled treatment do not drift between systems.

## Interaction states

At minimum distinguish where applicable: resting; hover; focus-visible; pressed/active; selected/toggled; drag/resize active; disabled; loading/busy; invalid/error.

These are **interaction** states. They are separate from Relic domain/trust states such as Pencil/Ink, Proposed/Pending/Settled, recent change, historical/as-of, LIVE and REC. Those consume [[DS-TRUST — Temporal Proposal & Trust Visual System]] or feature-specific semantics.

## Rules

- keyboard focus must remain unmistakable without becoming visually dominant at rest;
- selected and hover cannot look identical;
- disabled must not be confused with read-only/settled content;
- combine interaction state with proposal/temporal state without replacing either meaning;
- pointer-only hover cannot be required to discover essential actions.

## Storybook / manual test

Create a state matrix across Button, Icon Button, Field, Menu Item, Card/Placement and Relationship edge. Test keyboard-only navigation and combined selected+proposed/recent states.
