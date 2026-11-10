---
id: OBJ-015
status: active
kind: behavior
authority: current
system: SYS-03
family: representation-framework
storybook: pattern
depends_on:
- DSK-027
- DS-OBJ
platforms:
- web
---

# OBJ-015 — Object Reference Navigation

Parent: [[OBJ-001 — World Object Representation Framework]]

## Purpose

Defines how activating a World Object reference opens or locates that same identity in the most natural current Relic context instead of always routing to a generic detail page.

## Interaction law

> **Primary interaction orients; deliberate deep interaction opens depth.**

Use context-appropriate gestures:
- single click / primary activation → locate, select, or shallow-open;
- double-click or explicit deep-open → Focus/deep detail where supported;
- hover/focus → preview identity/relevance where useful.

Do not force every disclosure step when intent is clearly deep inspection.

## Interaction

Contextual examples:

**Search Result** — open Focus or locate/highlight on an appropriate Board according to the chosen result action.

**Inline Object Reference** — optional Peek for inspection; primary open deepens to Focus or natural contextual destination.

**Prepare** — preserve Session context while opening Prepare detail or Focus.

**Stage** — primary activation locates/selects the canonical projection; deliberate deep activation opens Focus/deep detail without abandoning Stage. Compact rail/bubble projections remain shortcuts rather than duplicate full cards.

**Chronicle** — open the object projected at the selected story position.

**Board** — normal Card/Expanded/Focus behavior remains owned by Desk.

## Boundaries

Navigation preserves originating context whenever practical so close/back returns to the same reading, Board, viewport, Session, or temporal position.

Historical references retain their story-position context unless the GM explicitly returns to Now.

## Relationships

- [[OBJ-010 — Inline Object Reference]] — common source.
- [[OBJ-011 — Object Peek]] — intermediate inspection.
- [[DSK-027 — Focus Invocation]] — Board-specific deepening.
- Search, Prepare, Stage, Chronicle — contextual destinations.

## Future input adaptation

A later mobile/native implementation can map tap/long-press or other input semantics to the same shallow-versus-deep intent without changing the current web interaction contract.

## Handoff

Implement **OBJ-015 — Object Reference Navigation** as context-preserving deep navigation to the same persistent identity across Relic surfaces.
