---
id: SES-002
status: active
kind: surface
authority: current
system: SYS-10
family: sessions
storybook: scene
depends_on:
- SES-003
- PREP-001
- APP-006
platforms:
- web
---

# SES-002 — Sessions Surface

Parent: [[SYS-10 — Sessions & Prepare]]

## Purpose

Provides the durable Sessions destination for upcoming preparation, active session return, and played-session history.

## Context & placement

Sessions is one of Relic's durable high-level destinations alongside Desk and Library. It is the home for Session lifecycle—not the place where the world itself is authored.

## Major content regions

**Up Next**
- next Planned/Ready Session;
- title/date;
- objective/opening summary where present;
- Continue Prep;
- Enter Stage / Ready for Stage;
- New Session.

**Past Sessions**
- chronological session history;
- title/date;
- concise summary where available;
- processing/review/settlement state;
- open Session/Review/Chronicle context as appropriate.

## Appearance & behaviour

A calm campaign session log rather than a metrics dashboard. The next Session receives clear editorial emphasis. Past Sessions form a readable history. Avoid excessive counts, cards, and KPI-like presentation.

## New Session

Creating a Session must not require AI. A new blank Planned Session can be created with minimal friction. The title may default from sequence/date conventions if desired, but the GM can rename immediately.

## Responsive behaviour

Wide layouts can visually separate upcoming and historical Sessions. Narrow layouts stack them. Session actions remain clear and compact.

## Relationships

- [[SES-003 — Session Index Item]]
- [[PREP-001 — Prepare Workspace State]]
- [[APP-006 — Active Session Return]]
- Review & Settlement

## Handoff

Build **SES-002 — Sessions Surface** as the durable entry point for upcoming Prep and played-session history.
