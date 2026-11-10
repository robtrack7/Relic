---
id: SES-001
status: active
kind: domain
authority: current
system: SYS-10
family: sessions
storybook: none
depends_on:
- SES-002
- PREP-001
- PREP-010
---

# SES-001 — Session Model & Lifecycle

Parent: [[SYS-10 — Sessions & Prepare]]

## Purpose

Defines Session as the durable lifecycle/container around an occurrence of play. Session is not a World Object family. It owns the local planning, live-play, capture, and downstream review lifecycle around a specific game session.

## Core identity

A Session should conceptually include:
- stable Session ID;
- Saga;
- sequence/number;
- title;
- optional planned date;
- objective;
- opening;
- Session-local Scene/Beat composition;
- prepared/pinned World Object references;
- active Threads;
- checklist/reminders;
- references;
- readiness timestamp/state;
- started/ended timestamps;
- downstream processing/review relationship.

The exact persistence schema can be finalized later, but these product concepts should remain stable.

## Product-facing lifecycle

Keep the Session lifecycle simple:

**Planned** — Prep exists but the GM has not intentionally marked it Ready.

**Ready** — The GM has indicated the Session is ready to enter Stage.

**In Progress** — Stage is active.

**Ended** — Live play has ended.

Post-session processing/review status is tracked separately from the Session's play-state lifecycle.

## Review / pipeline separation

Do not overload Session status with processing details. Downstream states can include processing, Review ready, Review pending, and settled. These belong to the Review/Settlement pipeline and can be surfaced on Session history without becoming additional Session lifecycle states.

## Session-local versus world state

Session owns prep order, Scene/Beat structure, checklist/reminders, prepared/pinned references, Session Relevance cues, readiness, and live capture relationship. Session does not own duplicate copies of World Object canon. Prepared Character/Place/etc. references always point to persistent identities.

## Relationships

- [[SES-002 — Sessions Surface]]
- [[PREP-001 — Prepare Workspace State]]
- [[PREP-010 — Stage Readiness & Session Packet]]
- Stage system
- Review & Settlement system

## Handoff

Implement **SES-001 — Session Model & Lifecycle** as the stable play-session container with a simple Planned → Ready → In Progress → Ended lifecycle and separate review/pipeline status.
