---
status: active
authority: secondary
scope: mvp
read_after:
  - "[[00 - Start Here]]"
  - "[[13 - Design System]]"
  - "[[34 - UI Implementation Spec]]"
  - "[[72 - Navigation Design Spec]]"
depends_on:
  - "[[00 - Start Here]]"
  - "[[13 - Design System]]"
  - "[[30 - Sanctum UX Flow]]"
  - "[[31 - Session Prep Flow]]"
  - "[[32 - Stage UX Flow]]"
  - "[[33 - First Run UX Flow]]"
  - "[[34 - UI Implementation Spec]]"
  - "[[72 - Navigation Design Spec]]"
supersedes: []
last_audited: 2026-06-01
source_file: "Relic Vault/35 - Web Design Wireframe.md"
---

# Web Design Wireframe

This note translates the active Relic design system and UX specs into the first authenticated web-app wireframe pass. It is not a new product scope. Build against [[00 - Start Here]], [[13 - Design System]], [[34 - UI Implementation Spec]], and [[72 - Navigation Design Spec]] first; use this note to keep the visual structure consistent across the current web routes.

## Design Authority

`Relic Vault` remains canonical. The refined Claude design package is a production reference bundle for typography, local fonts, token values, wordmark, component grammar, and Sanctum/Stage mood. Its UI kit examples are visual vocabulary, not app code.

Use:

- Cormorant Garamond for Saga names, entity names, page display titles, and literary excerpts.
- Instrument Sans for interface copy, body text, forms, and buttons.
- DM Mono for labels, timestamps, status chips, source labels, and command hints.
- Parchment page ground, Cream cards, Ink text and Stage background, Amber for canon/prep/consequential actions, Rust for destructive or blocked states, and Verdigris for approved, ready, active, or resolved progress states.
- Tight radii: 2px chips, 4px controls, 8px cards and panels.
- Quiet borders, warm shadows, and a subtle paper-grain overlay.

Do not use glossy gradients, decorative illustrations, broad icon strips, emoji, autonomous AI prompts, real-time transcript/live-caption UI, graph/constellation surfaces, player surfaces, image generation, BYOK controls, or local-model controls.

## App Shell

The web app opens into The Sanctum by default, but it includes both Sanctum and Stage surfaces. The Sanctum should feel literary, modern, and relaxing. Use a top context bar for active Workspace/World/Saga, Search, Relic Guide, `+ Create`, current session, Review, usage state, and account controls. Use a left navigation rail with the Relic wordmark and primary work surfaces. Keep the rail parchment/cream, not a dark top header.

Primary navigation order:

1. Threads
2. Library
3. Prepare
4. Sessions
5. Review
6. Export
7. Settings

Home is represented by the Relic mark or first rail item depending on density. Stage is not a primary rail item; it is reached from Prepare, session state, Home cards, notifications/deep links, app resume, and a bright Return to Stage affordance while live. Search and Relic Guide are not rail items. Search lives in the top bar, and Relic Guide is always available as a collapsible sidecar/sheet plus fallback route.

The main content area uses a constrained readable column by default, expanding only for list/detail and review layouts. Page heads use a mono eyebrow, Cormorant title, concise support copy, and restrained action buttons.

## Screen Wireframes

### New Saga

Use a focused parchment page with one large Cream form panel. The form captures Saga name, game system, World choice, GM profile, and help level. Show Build with AI, Bring your notes, and Start blank as radio-card choices, but keep AI-assisted actions disabled or routed to manual fallback until runtime acceptance. Start blank is the active path in the current implementation.

### Sanctum Home

The home screen is state-aware. With no session, the primary card is Plan your first session. With a planned or ready session, the primary card becomes a prep-forward panel with Amber left rule, status chip, Open Prepare, and Open Stage when allowed. With a live session, show Return to Stage as the brightest top-right action and a matching primary card. Review and recent canon appear nearby but do not compete with the next playable action.

### Threads

Threads are the continuity spine and should feel first-class. Use state chips for active, loose, dormant, and resolved groupings. The read-only Thread Timeline is a derived view; do not introduce a writable timeline editor. Detail views prioritize summary, objectives, related entities, source references, and disabled/manual-gated AI assists when runtime is not accepted.

### Library

Entity cards use Cream surfaces with meaningful type left rules. Character, place, faction, artifact, thread, and note surfaces share the same card anatomy: mono type label, Cormorant name, short Instrument Sans summary, scope/canon chips, and subdued provenance hints. Detail pages keep the editor primary and source/provenance in a right inspector on desktop.

### Prepare And Sessions

Prepare is the rail destination for the active or next planned session. It remains inside The Sanctum, with Amber density rather than a separate visual mode. The Prepare page should evolve toward session brief, agenda/scenes, context rail, Relic Guide sidecar, packet preview, Ready for Stage, and disabled/manual-gated assist affordances. Sessions list rows show session number/name, status, objective/opening cue, and Open Prepare/Stage actions.

### Review

Review uses grouped approval cards with source context, field-level diff language, and careful Rust/Amber/Verdigris state. The GM may approve one, an explicit selection, or use prominent Approve All for the exact visible compatible set; blocked, dirty, merge, and archive-confirmation items remain one-by-one. Review stays a controlled canon change even when the GM chooses a faster compatible batch workflow.

### Relic Guide

Relic Guide is always available as a collapsible right sidecar on desktop and sheet/drawer on mobile; it is not a primary left-rail item or autonomous chat column. It can answer with citations and prepare create/edit actions. The current implementation must not call providers or route to live task execution until runtime acceptance. Until then, render or document it as a disabled/manual-gated surface with copy that explains Guide will answer from current canon and prepare reviewed actions once runtime wiring is accepted.

### Settings

Settings stay lightweight: Saga, World/Workspace context, usage, retention/export placeholders, and sign out. Do not expose Era editor, full World dashboard, BYOK, local model, or billing implementation beyond planned usage readouts.

### Browser Stage Fallback

Stage is clean, focused, dark, and separate from Sanctum chrome. The web Stage surface uses Ink background, Cream text, translucent Stage cards, session title/status, persistent literal search, agenda, pinned cards, Relic Guide sidecar, quick capture, quick stub, and a sticky action bar for Record state, Mark Moment, and End Session. Stage opens from Prepare/session context rather than default rail navigation. Do not add live transcript captions, autonomous AI, or decorative motion beyond a record-state indicator.

## First Implementation Pass

The first pass should install the visual foundation without broad route rewrites:

- Copy local fonts and the wordmark into the web app public assets.
- Map design tokens into `globals.css`.
- Update shared primitives for buttons, cards, chips, fields, page heads, entity rows, command/search affordance, Sanctum shell, and Stage shell.
- Update `SanctumShell` so the left rail follows [[72 - Navigation Design Spec]] and the top context bar carries Search, Relic Guide, `+ Create`, current session, Review, Usage, Account, and Return to Stage affordances.
- Build the web Stage surface using Stage tokens while preserving existing manual actions.

Future passes can convert individual routes to richer page-specific components once the foundation is stable.

## Acceptance

- Authenticated web screens inherit the design system without adding provider calls or AI runtime behavior.
- The Sanctum/Stage split is obvious as a mode split, not a platform split: Sanctum is literary, modern, relaxing; Stage is clean and focused; both exist on web and mobile.
- Session prep reads as Sanctum work with Amber emphasis, not a third mode.
- Search is available through the top context bar, and Relic Guide is always available as a collapsible sidecar/sheet without becoming a rail item or autonomous chat column.
- Local fonts and wordmark load from web public assets.
- Existing manual Create -> Organize -> Prep -> Run -> Review surfaces remain functional.
