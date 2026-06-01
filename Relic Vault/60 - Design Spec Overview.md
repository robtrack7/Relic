---
status: active
authority: secondary
scope: mvp-design
read_after:
  - "[[00 - Start Here]]"
depends_on:
  - "[[11 - Product Basepoint]]"
  - "[[12 - MVP PRD]]"
  - "[[13 - Design System]]"
  - "[[30 - Sanctum UX Flow]]"
  - "[[31 - Session Prep Flow]]"
  - "[[32 - Stage UX Flow]]"
  - "[[33 - First Run UX Flow]]"
  - "[[34 - UI Implementation Spec]]"
  - "[[24 - Approval Queue]]"
  - "[[23 - AI Task Registry]]"
  - "[[72 - Navigation Design Spec]]"
supersedes: []
last_audited: 2026-05-31
source_file: "Relic Vault/60 - Design Spec Overview.md"
---

> [!info] How to use this spec
> Use this as the entry note for screen-level design work after reading [[00 - Start Here]] and the relevant upstream UX spec. It translates the active Relic MVP contracts into concise design direction for Claude Design, UI implementation, and review passes. It does not replace [[11 - Product Basepoint]], [[12 - MVP PRD]], [[13 - Design System]], or the owning UX specs.

# Design Spec Overview

This note defines the design-spec layer for Relic MVP. It sits between the broad product and UX contracts and the implementation-facing route/component plans. The owning upstream sources remain [[11 - Product Basepoint]], [[12 - MVP PRD]], [[13 - Design System]], [[30 - Sanctum UX Flow]], [[31 - Session Prep Flow]], [[32 - Stage UX Flow]], [[33 - First Run UX Flow]], [[34 - UI Implementation Spec]], [[24 - Approval Queue]], [[23 - AI Task Registry]], and [[72 - Navigation Design Spec]].

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
| [[66 - Stage Design Spec]] | Clean, focused live-session surface across web and mobile. |
| [[67 - Approval Queue Design Spec]] | Trust surface for draft review, source inspection, and canon commit. |
| [[68 - Ask Search Design Spec]] | Top context search, Ask Relic page/sidecar, and cited answers. |
| [[69 - Settings Usage Design Spec]] | Saga, World, Workspace, retention, usage, quota, and export controls. |
| [[70 - Mobile App Design Spec]] | Mobile adaptation of both Sanctum and Stage without reducing product scope. |
| [[71 - Component Inventory Design Spec]] | Shared component vocabulary, states, and constraints. |
| [[72 - Navigation Design Spec]] | Web navigation contract, top context bar, left rail, switcher, and global create. |

The requested `50` numbering could not be used because [[50 - Session Log Index]] already exists and is the canonical operations index. This layer uses `60` through `71` to preserve existing backlinks.

## Product decisions this layer preserves

The Sanctum dashboard is a clean contemporary/literary active Saga landing page and cockpit, not a generic Workspace overview. It is about the selected World/Saga, the next session, active Threads, recent canon movement, quick creation, and pending review. Workspace and World controls belong in the top context switcher, not as the dashboard's center of gravity. The default desktop dashboard should read as a two-column editorial cockpit with an optional utility sidecar, not a permanent three-column control room.

Session prep lives inside Sanctum. It can open as a fuller editor route, but it is not a third top-level surface and does not get its own navigation mode. Prep uses The Sanctum's parchment base with Amber-forward action accents and Sage thread-state signals.

The Stage is the clean, focused live-session surface on web and mobile. It is optimized for glance reading, quick capture, search, pinned cards, recording, Mark Moment, dice, and End Session. It must not become a tactical board, encounter manager, live transcript viewer, or proactive AI cockpit.

Threads are the continuity spine. They appear before generic entity browsing in the Sanctum navigation, drive dashboard carry-forward, frame prep, and give the GM a compact way to understand what still matters.

The Approval Queue is the trust surface. It is where AI and pipeline outputs become canon only after explicit GM action. It must show source/provenance before approval and must avoid prominent "approve all" behavior.

AI is GM-invoked, not proactive. The only exception is the visible, canon-only prep briefing described in [[31 - Session Prep Flow]] and [[23 - AI Task Registry]]. AI never writes directly to canon. AI suggestions are ephemeral, draft-backed, or routed through documented synthetic approval paths depending on the task.

Search and Ask belong in the top context bar as a combined `Search or ask...` omnibox with Find/Ask behavior. Ask Relic may also appear as a collapsible sidecar, page, or contextual action, but it is not a primary left-rail destination by default and must never become a permanent chatbot column. The AI surface should feel like a sourced utility layer that opens when summoned, then gets out of the way. The GM should always be able to search current Saga canon plus relevant World canon without losing page context.

World/Saga switching belongs in the top context switcher. The active Workspace, World, and Saga are persistent context, not dashboard content blocks. The shell must make scope visible because every search, Ask task, Library filter, Stage packet, and queue item depends on it.

Recently edited canon and quick create belong on the dashboard. These are not secondary flourishes: they let the GM continue the loop without remembering where they left off.

## Surface model

Relic has two product surfaces:

| Surface | Primary role | Design stance |
|---|---|---|
| The Sanctum | Create, organize, prep, review, approve, continue. | Literary, modern, relaxing on web and mobile. |
| The Stage | Run live sessions. | Clean, focused, high-contrast, resilient offline where the platform supports it. |

The Sanctum uses Parchment as the frame and Cream as card/elevated surface. It should feel literary, modern, and relaxing while still structured enough for serious continuity work. The Stage uses Ink as the base, Cream foreground, Amber for current action/state, Rust for recording or blocked/destructive states, and should remain clean and focused.

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

[[72 - Navigation Design Spec]] is the navigation contract. The top context bar owns Relic/Home, Workspace/World/Saga switcher, `Search or ask...` omnibox, `+ Create`, current session pill, Review badge, usage chip when relevant, and account menu. The desktop left rail should include Home, Threads, Library, Sessions, Stage, Review, Export, and Settings. Use **Library**, not **Entities**, as the rail label. Ask is handled through the omnibox, sidecar, page, or contextual actions, not the default left rail.

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
- Is Ask handled through the top omnibox, page, sidecar, or contextual action rather than the default left rail?
- Are World/Saga controls in the top context switcher?
- Does the left rail use Home, Threads, Library, Sessions, Stage, Review, Export, Settings?
- Is global create scoped and type-specific?
- Are recently edited canon and quick create visible on the dashboard?
- Are MVP exclusions absent from navigation and primary actions?
- Are empty/loading/error/offline/quota/conflict states represented?

## Claude Design prompt primer

When using these specs with Claude Design, start with this shared context:

```text
Design Relic, an AI-assisted Saga creation and continuity workspace for tabletop Game Masters. Use the active Relic design system: Parchment #EFEBE4, Cream #F7F4EF, Ink #1A1916, Amber #B8702A, Rust #8A3828, Sage #496640; Cormorant Garamond for names/titles, Instrument Sans for UI, DM Mono for metadata. Preserve two surfaces on both web and mobile: The Sanctum should feel literary, modern, and relaxing for create/organize/prep/review/approve/continue; The Stage should feel clean, focused, and live-session-ready. Build the web app first with the full Sanctum/Stage loop, then adapt the full product to mobile. Use a top context bar for Workspace/World/Saga, Search or Ask, + Create, current session, Review, Usage, and Account. Use a left rail for Home, Threads, Library, Sessions, Stage, Review, Export, Settings. AI is GM-invoked, never proactive, and never writes canon without explicit GM approval or a documented inline review path. Ask Relic is an omnibox mode/page/sidecar/contextual action, not a permanent chatbot column. Do not include MVP-excluded features.
```

Then append the relevant screen's `Claude Design prompt` section.

For Claude Design wireframe work, use a small packet rather than the whole vault: this overview, [[72 - Navigation Design Spec]], [[71 - Component Inventory Design Spec]], the relevant screen spec, and [[35 - Web Design Wireframe]] for the first web pass. Add [[70 - Mobile App Design Spec]] only when asking for mobile adaptations.
