---
id: SYS-19
status: active
kind: system
authority: current
system: SYS-19
storybook: none
---

# SYS-19 — Platform & Data Architecture

## Purpose

Defines the engineering contracts that make Sections 01–18 true under real database writes, AI calls, retries, offline play, imports, temporal corrections, usage limits and future player access.

## Core laws

> **Supabase is the source of truth. Every other representation is a projection, cache, index, proposal or runtime overlay unless this section explicitly says otherwise.**

> **Authorization is structural. RLS and validated server-side operations decide what can be read or written; prompts never do.**

> **The model proposes semantic operations. Relic validates and executes them. The model never owns the database.**

## Locked stack

Current V2 implementation uses:
- Next.js for the complete web product;
- Supabase Postgres, Auth, Storage and pgvector;
- LiteLLM as the provider-routing seam;
- an OpenAI-compatible transcription pipeline;
- durable browser-local persistence for web continuity where offline/crash recovery requires it.

Expo / React Native remains the intended later mobile adaptation path, with a mobile-local persistence adapter such as Expo SQLite when that work begins. Mobile delivery is not a current implementation dependency and must not distort the web architecture.

Section 19 refines architecture inside the locked product stack rather than reopening the core platform choices.

## V2 supersession

Where older project specifications conflict with the canonical V2 registry, Section 19 follows V2 semantics.

Important supersessions include:
- generalized Change Sets replacing a `drafts`-centric write model;
- persistent World Object families from Sections 03/07;
- first-class temporal state from Section 14;
- explicit GM-via-Librarian semantic writes from Section 13;
- Session Instances, Encounter Flow and live mechanics from Section 11;
- normal-Saga first run from Section 15.

## Hard invariants versus flexible implementation

**Hard invariants** define product/security correctness and should not drift during implementation without revisiting the registry.

**Flexible implementation choices** may change as Codex/Claude profiles, prototypes and migrates the system.

Flexible examples:
- JSONB versus typed extension tables;
- exact Story Position ordering representation;
- snapshot frequency;
- queue topology;
- Edge Function versus dedicated worker boundaries;
- chunk sizes/embedding models;
- cache structure;
- exact local-persistence physical schema.

When implementation evidence conflicts with an assumed physical design, preserve the invariant and change the implementation.

## Data classification

Every stored data structure should clearly belong to one class:

**Authoritative domain state** — World Objects, Relationships, Sessions, Boards, Change Sets.

**Immutable provenance/history** — evidence, audit, committed mutations, correction lineage.

**Operational runtime** — queue messages, pipeline/job state, temporary locks.

**Derived projection/index** — embeddings, search documents, cached briefs, denormalized read models.

If the class is unclear, do not add the table yet.

## Catalogue

### Ai Retrieval Async

- [[PLT-009 — Search Indexing & Retrieval]]
- [[PLT-010 — Librarian Task Runtime & Semantic Tool Executor]]
- [[PLT-011 — AI Routing Context & Run Ledger]]
- [[PLT-012 — Durable Jobs Queues & Pipeline Orchestration]]

### Core Domain Security

- [[PLT-001 — Runtime Repository & Contract Boundaries]]
- [[PLT-002 — Tenancy Authentication RLS & Security]]
- [[PLT-003 — Core Domain Persistence & Scope]]
- [[PLT-004 — Temporal State & Change-Set Transaction Engine]]
- [[PLT-005 — Spatial Board Persistence]]

### Operations Delivery

- [[PLT-015 — Usage Quotas Notifications Retention & Export]]
- [[PLT-016 — Observability Evaluation & Security Tests]]
- [[PLT-017 — Deployment Environments Secrets & Migrations]]

### Session Content Continuity

- [[PLT-006 — Session Stage & Runtime Persistence]]
- [[PLT-007 — Mechanics Persistence]]
- [[PLT-008 — Source Storage & Ingestion Pipeline]]
- [[PLT-013 — Recording Transcription & Evidence]]
- [[PLT-014 — Offline Cache Sync & Conflict Recovery]]


## Current implementation scope

Build the complete V2 product for web first. Expo/mobile architecture may remain future-compatible, but mobile delivery must not constrain current web implementation unless a platform invariant truly requires it.
