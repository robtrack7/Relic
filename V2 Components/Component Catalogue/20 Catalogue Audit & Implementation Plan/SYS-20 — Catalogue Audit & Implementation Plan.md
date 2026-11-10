---
id: SYS-20
status: active
kind: system
authority: current
system: SYS-20
storybook: none
depends_on:
- 00-PRODUCT-LAWS
- 00-AUTHORITY-POLICY
- 00-CATALOGUE-MAP
---

# SYS-20 — Catalogue Audit & Implementation Plan

## Purpose

Turns the 00–19 product catalogue into a practical implementation operating system without freezing Relic into today's guesses.

Section 20 owns **how to use and build from the catalogue**, not the product semantics already owned by Sections 01–19.

## Core implementation law

> **Implement systematically, test manually as early as possible, and change the plan when real use proves a better answer.**

The catalogue is authoritative about product intent, semantics, interaction contracts, ownership and current design decisions. It is not authoritative about exact component folders, hooks, database table shapes, queue topology or other implementation compartmentalization unless an invariant explicitly requires it.

## Operating model

- Storybook is the primary workshop for reusable visual components and reproducible UI states.
- Product/domain contracts remain individually retrievable Markdown files.
- The implementation skill loads the exact target and only one-hop direct context.
- Build order is defined here as a professional sequence/vertical-slice plan; `depends_on` metadata is not treated as a global DAG.
- Manual verification happens before a component/behavior is considered ready to propagate through the product.
- Automated tests accumulate around behavior after the intended behavior is visible and understood.
- A lightweight follow-up agent updates the catalogue only when implementation changed a product contract.

## Catalogue

- [[AUD-001 — Final Semantic & Catalogue Audit]]
- [[IMP-001 — Context Loading & Dependency Policy]]
- [[IMP-002 — Implementation Build Sequence]]
- [[IMP-003 — Storybook-First UI Workflow]]
- [[IMP-004 — Manual & Automated Testing Workflow]]
- [[IMP-005 — Codex Catalogue Skill Specification]]
- [[IMP-006 — Lightweight Documentation Sync]]
- [[IMP-007 — Work Ledger Scope & Change Control]]

## Flexibility

This implementation plan is itself a **current/implementation-level strategy**. Codex and the GM may reorder work when prototypes, technical constraints, or manual testing expose a better sequence. Preserve the product laws and update the plan rather than forcing the code through a stale route.
