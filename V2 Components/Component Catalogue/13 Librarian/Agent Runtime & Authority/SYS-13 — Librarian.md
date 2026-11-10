---
id: SYS-13
status: active
kind: system
authority: current
system: SYS-13
storybook: none
---

# SYS-13 — Librarian

## Purpose

Defines Relic’s persistent AI operating layer across the world, workspace, Sessions, Stage, Settlement, retrieval, and semantic tools.

## Core product law

> **The Librarian is Relic’s persistent operating layer over the world. Conversation is one interface to it, not the boundary of what it can do.**

> **Relic is proactive. The Librarian is agentic.**

## Responsibilities

Section 13 owns Librarian Carriage, conversation/composer, semantic context, grounded answers/citations, memory boundary, context assembly, temporal retrieval/reasoning, semantic tools, authority/autonomy, bounded planning, contextual proposals, execution contract, receipts/Undo integration, human-initiated agentic work, and failure behaviour. Section 19 owns provider/runtime implementation details.

## Non-negotiable rules

- no passive model calls on navigation/selection/context change;
- deterministic-first context/product logic;
- model calls correspond to understandable GM goals or explicit workflows;
- every AI run has traceable origin/goal/context snapshot/authorized scope;
- agentic continuation allowed after authorization; agentic self-assignment not allowed;
- explicit GM-authored semantic commands may execute directly in Supervised mode when safe/unambiguous;
- AI-invented semantic content remains proposed in Supervised mode;
- protected operations remain conspicuous;
- autonomy controls authority, not self-starting initiative;
- Search finds; Librarian reasons and acts;
- conversation is not canon;
- settled/pending/untrusted context remain distinct;
- no raw SQL/arbitrary DB access for the model;
- provider changes cannot alter permissions/canon policy;
- manual Relic remains usable when Librarian is unavailable.

## Catalogue

### Agent Runtime Authority

- [[LBR-009 — Intent, Authority & Autonomy Gate]]
- [[LBR-010 — Action Planning & Change Sets]]
- [[LBR-011 — Proposal, Preview & In-Place Editing]]
- [[LBR-012 — Execution, Progress, Receipt & Undo]]
- [[LBR-013 — Human-Initiated Agentic Work]]
- [[LBR-014 — Failure, Insufficiency & Recovery]]

### Grounding Memory

- [[LBR-007 — Retrieval & Temporal Reasoning]]
- [[LBR-008 — Semantic Capability & Tool Registry]]

### Interface

- [[LBR-001 — Librarian Carriage]]
- [[LBR-002 — Conversation & Composer]]
- [[LBR-003 — Context Scope & Inspector]]
- [[LBR-004 — Grounded Answer & Citation]]
- [[LBR-005 — Conversation History & Memory Boundary]]
- [[LBR-006 — Context Assembly & Grounding Layers]]
