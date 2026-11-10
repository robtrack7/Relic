---
id: PUB-009
status: deferred
kind: behavior
authority: current
system: SYS-16
family: gm-publication-ui
storybook: none
depends_on:
- REV-015
- PUB-006
- PUB-011
---

# PUB-009 — Settlement to Publication Handoff

Parent: [[SYS-16 — Player Publication & Permissions]]

## Purpose

Connects the completed GM settlement loop to optional player publication without adding publication work to the core Settlement requirement.

## Core boundary

> **Settlement never automatically publishes.**

A Session can be completely settled while every consequence remains GM-only.

## Future handoff

After Settlement, Relic may offer a lightweight player-publication handoff such as:
- recap ready to publish;
- newly revealable World Objects;
- Chronicle entries suitable for players.

This should be optional and skippable.

## No core-loop dependency

Section 12 must remain complete without Section 16 implementation.

Do not make Review/Settlement wait on player publication decisions.

## Automation

Automatic publication is not the default first-release behavior.

Any future publication automation requires explicit configuration and must remain bounded by structural permission rules.

## Relationships

- [[REV-015 — Completion & Carry Forward]]
- [[PUB-006 — Published Session Recap]]
- [[PUB-011 — Publication Audit & Reversal]]

## Handoff

When Section 16 is eventually implemented, add publication as a downstream optional workflow rather than reopening the Settlement architecture.
