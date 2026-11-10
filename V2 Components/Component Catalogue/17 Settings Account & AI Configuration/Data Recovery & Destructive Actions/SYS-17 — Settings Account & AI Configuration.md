---
id: SYS-17
status: active
kind: system
authority: current
system: SYS-17
storybook: none
---

# SYS-17 — Settings Account & AI Configuration

## Purpose

Defines the configuration surfaces for personal preferences, account/workspace usage,
Saga behavior, Librarian authority, recording/privacy, data ownership, and AI
connections without turning Settings into a second application.

## Core product law

> **Settings configures Relic. It should never become work the GM has to maintain.**

And:

> **Personal preferences belong to the GM. Campaign behavior belongs to the Saga.
Infrastructure belongs to Relic.**

## Configuration scopes

**Personal**
- account identity;
- appearance;
- notifications.

**Account / Workspace**
- plan and usage;
- AI credits/activity;
- storage;
- provider credentials/connections where supported.

**Saga**
- identity and World association;
- mechanics profile;
- Librarian authority;
- Review Style;
- recording retention/privacy behavior.

Keep these scopes distinct in data and UI.

## AI configuration principles

- built-in AI is presented as **Relic AI**;
- the GM does not need to understand provider/model routing;
- AI source and AI authority are independent;
- provider fallback cannot broaden permissions or canon authority;
- no proactive-Librarian slider;
- no raw temperature/token/reasoning controls;
- no giant per-tool permission matrix in the initial product.

## Catalogue

### Ai Usage

- [[SET-007 — Usage Credits & AI Activity]]
- [[SET-008 — AI Provider & Model Connections]]

### Data Recovery Destructive Actions

- [[SET-010 — Data Export & Ownership]]
- [[SET-011 — Archive Delete & Protected Actions]]
- [[SET-012 — Sync Recovery & Diagnostics]]

### Personal Shell

- [[SET-001 — Settings Surface & Scope Navigation]]
- [[SET-002 — Account & Identity]]
- [[SET-003 — Appearance & Interface Preferences]]
- [[SET-004 — Notifications]]

### Saga Policy

- [[SET-005 — Current Saga General Settings]]
- [[SET-006 — Librarian Authority & Review Policy]]
- [[SET-009 — Recording Retention & Privacy]]
- [[SET-013 — Settings Scope & Inheritance]]
