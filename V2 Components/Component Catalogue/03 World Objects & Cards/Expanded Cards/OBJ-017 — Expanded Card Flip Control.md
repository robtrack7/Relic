---
id: OBJ-017
status: deferred
kind: component
authority: current
system: SYS-03
family: expanded-cards
storybook: component
depends_on:
- DS-FND-MOTION
- DS-OBJ
platforms:
- web
---

# OBJ-017 — Expanded Card Flip Control

Parent: [[OBJ-016 — Two-Sided Expanded Card Host]]

> **Current notice — superseded presentation.** The user-facing Expanded Card flip is deferred with the two-sided card host. Expanded Cards remain single bounded surfaces; no mechanics back or additional disclosure level is introduced. This stable contract remains for historical traceability.

## Purpose (historical)

Provides the small persistent affordance for turning an eligible Expanded Card between front and back.

## Context & placement

Anchored just outside the **upper-right edge of the Expanded Card**. It travels with the Placement but sits outside card content so it does not consume layout space.

## Anatomy

- small turn/flip symbol;
- accessible label/tooltip such as `Show mechanics` or `Show character`.

## Appearance & behaviour

A tiny physical-card affordance rather than another toolbar button. Quiet at rest, clearer on hover/focus. Used identically on ordinary Desk and Stage Canvas.

## States & variants

- front active;
- back active;
- hover/focus;
- transition in progress.

## Handoff

This deferred contract is retained for historical traceability and is not a current implementation target.


## Transition contract

The historical flip choreography is retained for traceability only and is not a current implementation target.

The flip must preserve object identity, card position, and deliberate disclosure continuity. Respect reduced motion.
