---
id: SES-003
status: active
kind: component
authority: current
system: SYS-10
family: sessions
storybook: component
depends_on:
- SRH-001
platforms:
- web
---

# SES-003 — Session Index Item

Parent: [[SES-002 — Sessions Surface]]

## Purpose

Provides the reusable Session summary representation inside Sessions and Search.

## Anatomy

Possible fields:
- Session number/title;
- planned or played date;
- play-state status;
- concise objective/summary;
- downstream review status where relevant;
- optional lightweight result counts if genuinely useful.

Example upcoming:

**Session 14 — The Winter Court**  
Saturday · Ready  
The party confronts Seraphine about the ledger.

Example past:

**Session 13 — A Debt at Brassgate**  
August 19 · Settled

## States & variants

- Planned;
- Ready;
- In Progress;
- Ended;
- processing;
- Review Ready;
- Review Pending;
- Settled.

The last four are downstream indicators, not additional Session lifecycle states.

## Behaviour

Primary activation opens the Session's natural current destination: Planned/Ready → Prepare; In Progress → Stage; Ended with pending Review → Review when appropriate; settled historical Session → Session history/Chronicle context.

## Relationships

- [[SES-002 — Sessions Surface]]
- [[SRH-001 — Search System]]
- Review/Chronicle systems

## Handoff

Build **SES-003 — Session Index Item** as the compact lifecycle-aware Session representation shared by Sessions and Search.
