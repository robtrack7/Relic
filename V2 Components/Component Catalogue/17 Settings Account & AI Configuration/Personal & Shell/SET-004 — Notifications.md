---
id: SET-004
status: active
kind: component
authority: current
system: SYS-17
family: personal-shell
storybook: component
depends_on:
- LBR-013
- REV-001
platforms:
- web
---

# SET-004 — Notifications

Parent: [[SET-001 — Settings Surface & Scope Navigation]]

## Purpose

Configures deterministic product notifications without creating proactive Librarian
activity or hidden AI consumption.

## Core rule

> **Notifications are Relic workflow signals, not Librarian proactivity.**

Notification generation should use deterministic application state wherever possible.

## Useful categories

Strong candidates:
- Session processing ready;
- Session processing failed;
- important usage/account issue.

Optional / likely quieter defaults:
- unsettled Session reminder;
- recovery/sync issue;
- product reminders.

## Channels

Support only channels the product/platform actually implements:
- in-app;
- email;
- push.

Do not design unsupported channels into the current V2 UI.

## No AI requirement

Examples such as:
- `Session 14 is ready for review`;
- `Audio processing failed`;
- `Storage is nearly full`

do not require a model call.

## Relationships

- [[LBR-013 — Human-Initiated Agentic Work]]
- [[REV-001 — Post-Session Processing Pipeline]]

## Handoff

Build **SET-004 — Notifications** around deterministic workflow events with no background
Librarian invocation.
