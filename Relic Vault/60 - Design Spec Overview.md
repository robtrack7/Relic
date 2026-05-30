---
status: active
authority: secondary
scope: mvp-design
read_after:
  - "[[00 - Start Here]]"
depends_on:
  - "[[11 - Product Basepoint]]"
  - "[[12 - MVP PRD]]"
  - "[[14 - Design System Source]]"
  - "[[30 - Sanctum UX Flow]]"
  - "[[31 - Session Prep Flow]]"
  - "[[32 - Stage UX Flow]]"
  - "[[33 - First Run UX Flow]]"
  - "[[34 - UI Implementation Spec]]"
  - "[[24 - Approval Queue]]"
  - "[[23 - AI Task Registry]]"
supersedes: []
last_audited: 2026-05-30
source_file: "Relic Vault/60 - Design Spec Overview.md"
---

> [!info] How to use this spec
> Use this as the entry note for screen-level design work after reading [[00 - Start Here]] and the relevant upstream UX spec. It translates the active Relic MVP contracts into concise design direction for Claude Design, UI implementation, and review passes. It does not replace [[11 - Product Basepoint]], [[12 - MVP PRD]], [[14 - Design System Source]], or the owning UX specs.

# Design Spec Overview

This note defines the design-spec layer for Relic MVP. It sits between the broad product and UX contracts and the implementation-facing route/component plans. The owning upstream sources remain [[11 - Product Basepoint]], [[12 - MVP PRD]], [[14 - Design System Source]], [[30 - Sanctum UX Flow]], [[31 - Session Prep Flow]], [[32 - Stage UX Flow]], [[33 - First Run UX Flow]], [[34 - UI Implementation Spec]], [[24 - Approval Queue]], and [[23 - AI Task Registry]].

The design-spec layer has two jobs:

1. Keep each major screen family compact enough for a designer or coding agent to use without re-opening the whole vault.
2. Preserve the critical MVP product decisions that must not drift during UI generation, prompt writing, or implementation.

Reusable component guidance lives in [[71 - Component Inventory Design Spec]]. Every screen spec links there and should use its component names before inventing a new primitive.

## Design-spec map

| Note | Use for |
|---|---|
| [[61 - Sanctum Dashboard Design Spec]] | State-aware Saga cockpit, current prep, recent canon, quick create, pending review, and continuity restart. |
| [[62 - New Saga Design Spec]] | Entry flow for Build with AI, Bring your notes, and Start blank. |
| [[63 - Saga Scaffold Review Design Spec]] | Review and commit of AI-assisted starting material before canon write. |
| [[64 - Unified Library Detail Design Spec]] | Entity, Thread, Session, and note browsing/detail patterns inside The Sanctum. |
| [[65 - Session Prep Design Spec]] | Prep workspace inside The Sanctum and Ready for Stage handoff. |
| [[66 - Mobile Stage Design Spec]] | Dark, mobile-first live session surface. |
| [[67 - Approval Queue Design Spec]] | Trust surface for draft review, source inspection, and canon commit. |
| [[68 - Ask Search Design Spec]] | Top context search, Ask Relic page/sidecar, and cited answers. |
| [[69 - Settings Usage Design Spec]] | Saga, World, Workspace, retention, usage, quota, and export controls. |
| [[70 - Mobile Sanctum Lite Design Spec]] | Mobile-light Sanctum workflows that support the loop without becoming the main deep-work surface. |
| [[71 - Component Inventory Design Spec]] | Shared component vocabulary, states, and constraints. |

The requested `50` numbering could not be used because [[50 - Session Log Index]] already exists and is the canonical operations index. This layer uses `60` through `71` to preserve existing backlinks.

## Product decisions this layer preserves

The Sanctum dashboard is an active Saga cockpit, not a generic Workspace overview. It is about the selected World/Saga, the next session, active Threads, recent canon movement, quick creation, and pending review. Workspace and World controls belong in the shell, not as the dashboard's center of gravity.

Session prep lives inside The Sanctum. It can open as a fuller editor route, but it is not a third top-level surface and does not get its own navigation mode. Prep uses The Sanctum's parchment base with Amber-forward action accents and Sage thread-state signals.

The Stage is dark, mobile-first, and live-session-focused. It is optimized for glance reading, quick capture, search, pinned cards, recording, Mark Moment, dice, and End Session. It must not become a tactical board, encounter manager, live transcript viewer, or proactive AI cockpit.

Threads are the continuity spine. They appear before generic entity browsing in the Sanctum navigation, drive dashboard carry-forward, frame prep, and give the GM a compact way to understand what still matters.

The Approval Queue is the trust surface. It is where AI and pipeline outputs become canon only after explicit GM action. It must show source/provenance before approval and must avoid prominent "approve all" behavior.

AI is GM-invoked, not proactive. The only exception is the visible, canon-only prep briefing described in [[31 - Session Prep Flow]] and [[23 - AI Task Registry]]. AI never writes directly to canon. AI suggestions are ephemeral, draft-backed, or routed through documented synthetic approval paths depending on the task.

Search belongs in the top context bar. Ask Relic is a page, sidecar, or contextual action, not a permanent chatbot column. The GM should always be able to search current Saga canon plus relevant World canon without losing page context.

World/Saga switching belongs in the shell. The active Workspace, World, and Saga are persistent context, not dashboard content blocks. The shell must make scope visible because every search, AI task, entity list, Stage packet, and queue item depends on it.

Recently edited canon and quick create belong on the dashboard. These are not secondary flourishes: they let the GM continue the loop without remembering where they left off.

## Surface model

Relic has two product surfaces:

| Surface | Primary role | Design stance |
|---|---|---|
| The Sanctum | Create, organize, prep, review, approve, continue. | Editorial, warm, calm, structured, web-optimized, responsive enough for mobile-light work. |
| The Stage | Run live sessions. | Dark, fast, high-contrast, mobile/tablet-optimized, quiet, resilient offline. |

The Sanctum uses Parchment as the frame and Cream as card/elevated surface. It should feel like a modern field journal with enough structure to handle serious continuity work. The Stage uses Ink as the base, Cream foreground, Amber for current action/state, Rust for recording or blocked/destructive states.

Session prep is visually distinguished within The Sanctum by Amber density, agenda left rules, Ready for Stage CTA treatment, and Sage/Amber/Stone thread chips. It does not use a separate mode palette.

## Design language

Use the Relic design system as authoritative: Cormorant Garamond for names, titles, and literary emphasis; Instrument Sans for UI and body; DM Mono for metadata, timestamps, source labels, status chips, quota labels, and small system text.

Relic should feel editorial and authored. Avoid generic SaaS dashboard tropes: oversized metrics, glassy panels, decorative gradients, mascot-like AI affordances, and permanent assistant columns. Cards should serve repeated records, framed tasks, modals, and focused panels. Whole-page floating-card layouts should be avoided unless the route is a focused creation/review flow.

Material 3 and Checklist Design may be used only as coverage references: check whether components, states, accessibility affordances, and interaction patterns exist. Do not copy their visual style. Relic's palette, typography, density, shape, and voice remain authoritative.

## MVP boundary guardrails

Do not promote or visually imply MVP-excluded features:

- initiative tracking
- encounter tracking
- VTT integration
- relationship graph
- writable timeline editor
- full map editor
- player wiki
- per-player permissions
- real-time transcription
- BYOK UI
- local model settings
- image generation
- collaborative co-GM editing
- custom calendars

Some deferred concepts may appear as future-compatible data foundations in upstream specs. In design work, they should not receive navigation, active controls, empty-state CTAs, or hero placement. Thread Timeline is the exception: it is MVP only as a read-only derived view.

## AI and canon rules

AI output must always be visually inspectable as one of three things:

1. Ephemeral suggestion: useful text/cards the GM can copy, insert, or discard. No draft row. No canon write.
2. Reviewable draft: AI proposal with source/provenance that routes through Approval Queue or an inline review surface.
3. Canon-only answer/briefing: read-only output grounded in approved canon, with citations or source stamps, and no proposed write.

The GM remains the author. Use verbs like Draft, Propose, Suggest, Brainstorm, Compose, Review, Approve, Reject, and Commit. Avoid language that implies the system decided truth, such as "Relic updated canon" unless the preceding explicit GM approval is clear.

All canon-mutating moments need a state boundary. Examples: Commit saga, Ready for Stage, Approve, Edit & Approve, Save as GM summary, Pin AI Quick Stub after inline review. Destructive or irreversible actions need confirmation and Rust treatment where appropriate.

## Source/provenance rules

Sources are not implementation trivia; they are part of the trust UI. Any answer, draft, proposal, review item, or AI-assisted change that depends on evidence must expose where it came from.

Use source badges for compact surfaces, a provenance panel or bottom sheet for medium detail, and a source dock for review-heavy desktop screens. Transcript-derived citations need timestamp and frozen excerpt behavior per [[24 - Approval Queue]]. Ask answers need inline citations. Prep briefing needs a composed-at stamp plus source count. Stage live cards should stay deterministic and should not require source inspection unless the GM opens a cached read-only detail.

## Navigation principles

The top context bar owns Workspace, World, Saga, global search, and quota/usage indicators when relevant. The Sanctum nav order is Threads, Entities, Sessions, Review, Ask. Settings is secondary and shell-level.

Dashboard navigation should answer: what is live, what needs review, what should I prep next, what changed recently, and what can I create quickly? It should not try to expose every route.

Stage navigation should be minimal. A GM mid-session should see session title, state, search, agenda, pinned content, capture, record, mark, dice, and End Session. Everything else belongs in a sheet or after-session surface.

## Review checklist for generated designs

Use this checklist when reviewing any mockup, Claude Design output, or UI implementation:

- Does it preserve the Sanctum/Stage split?
- Does session prep appear inside The Sanctum rather than as a third top-level mode?
- Does the dashboard read as an active Saga cockpit?
- Are Threads visibly treated as continuity spine?
- Is AI invoked by the GM, except the visible canon-only prep briefing?
- Is any AI/canon write gated by review, approval, or a documented GM-direct path?
- Are sources/provenance visible where trust depends on them?
- Is search in the top context bar?
- Is Ask a page, sidecar, or contextual action rather than a permanent chatbot column?
- Are World/Saga controls in the shell?
- Are recently edited canon and quick create visible on the dashboard?
- Are MVP exclusions absent from navigation and primary actions?
- Are empty/loading/error/offline/quota/conflict states represented?

## Claude Design prompt primer

When using these specs with Claude Design, start with this shared context:

```text
Design Relic, an AI-assisted Saga creation and continuity workspace for tabletop Game Masters. Use the active Relic design system: Parchment #EFEBE4, Cream #F7F4EF, Ink #1A1916, Amber #B8702A, Rust #8A3828, Sage #496640; Cormorant Garamond for names/titles, Instrument Sans for UI, DM Mono for metadata. Preserve two surfaces: The Sanctum is the editorial Saga cockpit for create/organize/prep/review/approve/continue; The Stage is dark, mobile-first, and live-session-focused. AI is GM-invoked, never proactive, and never writes canon without explicit GM approval or a documented inline review path. Search lives in the top context bar. Ask Relic is a page/sidecar/contextual action, not a permanent chatbot column. Do not include MVP-excluded features.
```

Then append the relevant screen's `Claude Design prompt` section.
