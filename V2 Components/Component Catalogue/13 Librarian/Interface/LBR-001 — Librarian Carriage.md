---
id: LBR-001
status: active
kind: surface
authority: current
system: SYS-13
family: interface
storybook: scene
depends_on:
- APP-007
- APP-010
- LBR-002
- DS-WFL
platforms:
- web
---

# LBR-001 — Librarian Carriage

Parent: [[SYS-13 — Librarian]]

## Purpose

Provides the persistent right-hand control surface for Relic’s AI operating layer without reducing the Librarian to a chat sidebar.

## Context & placement

Opened through [[APP-007 — Librarian Toggle]] and positioned through [[APP-010 — Workspace Dock Manager]].

The same Librarian Carriage persists across Desk, Focus, Search / Library, Prepare, Stage, Settlement, and Chronicle. Opening another workspace does not create another Librarian instance.

## Anatomy

Suggested regions:
- concise current-context line;
- conversation / results stream;
- object references;
- citations;
- proposal/action results;
- bounded task progress where active;
- pinned working context;
- composer.

Avoid large assistant avatars, oversized chat bubbles, or UI that competes visually with the world workspace.

## Appearance & behaviour

Editorial, compact, warm, and operational. The carriage should feel like an intelligent margin to the world rather than a second application beside it.

Collapsing preserves the unsent composer draft and conversation. Already-authorized work may finish while collapsed; its world updates remain visible, but its results must not change Canvas selection, Focus, or camera until the GM deliberately attends to them.

## Responsive behaviour

Wide: `workspace | Librarian Carriage`

Prepare/Stage/Settlement: `left carriage | workspace | Librarian Carriage`

Constrained layouts can use overlay/sheet behaviour through the shared Dock Manager.

## Relationships

- [[APP-007 — Librarian Toggle]]
- [[APP-010 — Workspace Dock Manager]]
- [[LBR-002 — Conversation & Composer]]
- [[LBR-003 — Context Scope & Inspector]]

## Handoff

Build **LBR-001 — Librarian Carriage** as the single persistent visible surface for the broader Librarian operating layer.
