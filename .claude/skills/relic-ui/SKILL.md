---
name: relic-ui
description: 'The design and interaction language for building Relic v2 — the spatial TTRPG worldbuilding web app (Desk, Boards, Cards, Focus, Librarian, Prep, Stage, Review). Use this skill for ANY user-facing Relic work: writing or refactoring components, choosing colors/type/spacing/motion, building canvas behaviour, styling the Librarian, implementing Ink/Pencil states, designing Stage or mobile layouts, or critiquing existing Relic UI. Trigger it even when the request sounds purely technical ("add a card component", "fix the zoom", "build the session screen") — the visual and behavioural contracts here are not recoverable from the code alone.'
metadata:
  version: "2.0"
  supersedes: "Relic UI Core Skill, relic-visual-language, Relic DMA Design Direction"
---

# Relic UI

## What is being built

Relic is a spatial workspace for creating, remembering and running fictional worlds. It should make a world feel **present**, not make a campaign feel **managed**.

**The Desk** is the persistent between-session surface: an infinite canvas of World Objects — people, places, factions, events, Threads, sources, unfinished ideas. **The Stage** is the same world projected for live play at the table.

The product loop is fundamental and every surface serves it:

> **Prep enters Stage → play creates evidence → Review proposes continuity → GM approval updates the world → the changed world shapes the next Prep.**

**The Librarian** is Relic's ambient intelligence. It reads the current Board, Focus and selection, and acts on the workspace directly. Chat is one surface of it, not its home.

**North star:** a beautiful private desk where a living fictional world has accumulated. Hold it to award-winning standards — the bar is a considered, authored piece of design, not a competent one.

**Shorthand:** warm editorial minimalism × archival research desk × spatial knowledge canvas × quiet fictional atmosphere.

## How to use this skill

**Proportionality first.** This is a reference, not a gate. Tokens, laws and component contracts are the parts you need on almost every task; the review checklist at the bottom is for a surface you are about to call finished, not for every edit. Mechanical work — a token swap, a stated fix, a rename — needs none of it. Do not run this checklist *and* `relic-ux`'s on the same change; one pass, at the altitude the change deserves.

Read this file for laws, tokens and contracts. Load one reference when the work goes deep:

| Working on | Read |
|---|---|
| Desk/Board layout, Focus, Prep, Stage, Review, mobile | `references/surfaces.md` |
| Card anatomy, tints, imagery, stacks, Ink/Pencil/selected states, semantic zoom tiers | `references/objects-and-cards.md` |
| Librarian carriage, proposals, diffs, undo, context assembly | `references/librarian.md` |
| Pan/zoom physics, hit-testing, performance, motion timings | `references/canvas-and-motion.md` |

## The laws

Apply these in order when solutions conflict.

1. **The canvas is a view, not the database.** Moving, grouping, resizing or tinting changes composition only. Truth changes only through explicit world operations.
2. **World Objects have one stable identity everywhere** — Board, search, Focus, Prep, Stage, history, Librarian. Never fork a record because it appeared in another view.
3. **Truth requires intent.** Ink is established; Pencil is unsettled — speculative, inferred, proposed or simply not yet resolved. Nothing becomes Ink without a deliberate GM act. Pencil must read as provisional, never as broken or disabled. *Maturity is not truth:* a Pencil object may hold established claims, and an Ink object may hold disputed ones. Render both, and never let one state stand in for the other.
4. **Selection deepens; it does not depart.** Prefer Focus and contextual controls over navigating to a detail page. The surrounding world stays perceptible.
5. **AI acts in the medium of the answer.** A spatial request moves cards. A factual question returns short sourced language. A prep request populates Prep. Never describe an action that should have been performed.
6. **AI mutation is observable, attributable, interruptible and reversible.** One request = one undo, however many objects it touched.
7. **Capture before classification.** The GM must be able to record something in seconds without choosing a schema. Forms never block creation.
8. **Complexity is revealed, not resident.** Use semantic zoom, Focus, search, proximity and progressive disclosure instead of permanent chrome.
9. **Mystery comes from the fiction**, never from interface decoration or obscure mechanics.
10. **The interface recedes once the GM starts thinking or performing.**

## Tokens

Define these once at the root and derive everything from them. Values are a starting point — tune in context, but keep the relationships.

```css
:root {
  /* Foundation */
  --paper:        #FCF9F3;  /* porcelain — the Desk field */
  --paper-raised: #FFFDF8;  /* card surfaces sitting on the field */
  --paper-sunk:   #F4F0E7;  /* trays, wells, inset regions */
  --carbon:       #171715;  /* ink black — never #000 */
  --charcoal:     #2F2F2F;  /* inverse surfaces, focused objects, Stage field */

  /* Ink ramp (derived) */
  --ink-1:        #171715;  /* names, headings, prose */
  --ink-2:        #4A4741;  /* secondary text */
  --ink-3:        #857F73;  /* metadata, captions, mono labels */
  --ink-4:        #B4AC9C;  /* pencil text, disabled-adjacent */
  --hairline:     #E2DCCF;  /* 1px rules, card edges */

  /* Primary signal */
  --orange:       #FF6D1F;  /* Relic Orange — active, current, intelligent */
  --orange-soft:  #FFE7D8;  /* wash for proposal fills, active rows */

  /* World colors — secondary, not universal UI states */
  --tan:          #CBBD9F;  /* archive, sources, older material */
  --rust:         #A15445;  /* recording, destructive, session-ending */
  --sage:         #627F61;  /* synced, offline-safe, confirmed */
  --slate:        #6C7293;  /* cool categorical accent */

  /* Type roles — families are swappable at this layer only */
  --font-sans:  "Instrument Sans", ui-sans-serif, system-ui, sans-serif; /* UI, names, controls */
  --font-serif: "Cormorant Garamond", ui-serif, Georgia, serif;          /* prose, quotes, Stage */
  --font-mono:  "DM Mono", ui-monospace, monospace;                      /* metadata only */

  /* Scale — editorial, few steps, decisive jumps */
  --t-display: 44px/1.05;   /* Stage titles, empty states */
  --t-title:   27px/1.15;   /* Focus headers, Board titles */
  --t-head:    18px/1.3;    /* card names */
  --t-body:    15px/1.55;   /* interface prose */
  --t-small:   13px/1.45;   /* secondary */
  --t-micro:   11px/1.2;    /* mono labels, uppercase, tracking 0.08em */

  /* Space — 4px base, canvas snaps to 8 */
  --s-1: 4px; --s-2: 8px; --s-3: 12px; --s-4: 16px;
  --s-5: 24px; --s-6: 32px; --s-7: 48px; --s-8: 72px;

  /* Form — architectural, not bubbly */
  --r-control: 3px;
  --r-card:    5px;
  --r-sheet:   12px;        /* mobile sheets only */
  --lift-1: 0 1px 2px rgb(23 23 21 / 0.05);   /* resting card */
  --lift-2: 0 4px 14px rgb(23 23 21 / 0.09);  /* dragged, focused, stacked top */

  /* Motion */
  --m-instant: 90ms;   /* selection, hover */
  --m-quick:   160ms;  /* disclosure, inspector */
  --m-settle:  240ms;  /* focus expand, layout shift */
  --m-stage:   480ms;  /* Stage entry, scene change — cinematic only */
  --ease:      cubic-bezier(0.2, 0, 0, 1);
}
```

**Color discipline.** Orange is powerful because most of the interface is quiet — it marks selection, active Threads, Librarian activity, provisional creation and current session state, and nothing else. Rust is for recording and terminal actions. Sage is for confirmed/synced. Tan and slate are world texture, not status. Photography may introduce richer color locally; the chrome never does.

**Type discipline.** Sans carries the interface. Serif appears only in narrative material, quotations, lore and Stage. Mono is metadata only — IDs, timestamps, provenance, coordinates, `INK`/`PENCIL` labels, counts. If Relic starts looking like developer tooling, the mono has escaped its job.

## Not the default cream-and-terracotta look

Relic's palette lands near a pattern that appears in a lot of generated design — cream ground, warm accent, hairline rules. Relic must be distinguishable at a glance, and the difference is structural, not chromatic:

- **Registration and index language.** Selection uses corner ticks and an ink frame, not a glow. Metadata reads like an accession record.
- **Safety orange, not terracotta.** `#FF6D1F` is a mineral signal color used at small area. Do not soften it toward clay, and do not tint large surfaces with it.
- **Objects on a plane, not sections on a page.** The composition is spatial and unevenly dense: clusters, empty regions, a photograph beside a scrap of handwriting.
- **Cards vary by content.** No universal rectangle. See `references/objects-and-cards.md`.
- **The tension is the point:** rigorous modern minimalism holding messy accumulated imagination.

## Object and state model

The visual laws only hold if the data layer keeps them. Structure state so that violating a law requires effort.

```ts
// Identity — the world. An object carries no truth value of its own.
type WorldObject = {
  id: ObjectId;
  type: 'person' | 'place' | 'faction' | 'artifact' | 'event' | 'thread' | 'fragment' | 'source';
  name: string;
  maturity: 'pencil' | 'ink';   // how settled this object is — NOT whether it is true
  visibility: 'gm' | 'shared';
  // ...representations, claims, relationships
};

// Truth lives on the addressable unit, never on the object.
type Claim = {
  id: ClaimId;
  subject: ObjectId;
  truth: 'ink' | 'pencil' | 'disputed';
  provenance: SourceRef[];      // why do we believe this
  visibility: 'gm' | 'shared';
};

// Composition — the view. Never merged into WorldObject.
type Placement = {
  boardId: BoardId;
  objectId: ObjectId;           // reference, never a copy
  x: number; y: number; w: number; h: number; z: number;
  tint?: TintKey;               // one of ~12 palette-derived tints
  collapsed?: boolean;
};

// Librarian output — always staged, never applied silently
type Proposal = {
  id: ProposalId;
  origin: 'librarian';
  rationale: string;
  cites: SourceRef[];
  ops: Op[];                    // creates, edits, moves, connections
  status: 'pending' | 'accepted' | 'rejected';
};
```

Rules the code must enforce:

- Deleting a Placement never deletes the WorldObject. Deleting a Board deletes no world content.
- The same `objectId` may appear on many Boards. Render from one store; never duplicate.
- Librarian writes land as a `Proposal`, or as Pencil material with Pencil claims. **Nothing AI-authored establishes Ink.**
- The undo stack records **intent**, not operations: one entry per user gesture or per Librarian request, even if 27 objects moved.
- Search must retrieve any object regardless of where it sits. Spatial memory is an assist, never a requirement.

## Component contracts

Build these as the vocabulary; resist inventing more until a pattern genuinely repeats.

- **Card** — the base surface. Hairline edge, `--r-card`, generous internal whitespace, `--lift-1`. Resizable, draggable, tintable, stackable. Variants differ by content, not by wrapper.
- **SelectionFrame** — ink frame + orange registration corners + exposed connection points. No glow, no thick border.
- **PencilTreatment** — dashed or interrupted hairline, reduced contrast text (`--ink-4`), optional dot-matrix wash, `PENCIL` mono label. Fully interactive.
- **ProposalGhost** — orange hairline, patterned fill, diff markers, inline accept/reject/undo. Rendered in place, never in a separate panel.
- **Connector** — delicate curve, contextual only. Never render the whole graph by default; a selected object's neighbourhood emerges around it.
- **ContextualInspector** — emerges from selection; holds metadata, provenance, history, sources, advanced relationships. Common controls keep stable positions.
- **LibrarianCarriage** — persistent collapsible rail. Compact chronological entries, visible scope, cited objects, action records with undo. No speech bubbles, no avatar, no sparkle.
- **StageCard** — the same object at collapsed / expanded / focused resolution. Larger type, larger targets, fewer fields.
- **CommandPalette + Search** — global, instant, always able to retrieve.
- **Sheet** — narrow-screen disclosure. Avoid stacking sheets on Stage.

**Icons:** sparse geometric line marks — editorial, cartographic, technical, archival. Phosphor (Regular for primary, Light for secondary) as the placeholder family; wrap each icon in a semantic component (`<Icon.Thread/>`, `<Icon.Provenance/>`) so Relic's own marks can replace them later. Never an AI sparkle.

**Imagery:** one of the primary ways the world becomes tangible. Allow full-bleed cards, strong crops, contact-sheet arrangements, image stacks, isolated hero images. Do not carpet images with UI. On Stage, one image may become the environmental field behind the working material.

## Chrome and density

Density is **moderate** — rich worlds without enterprise compression. Achieve it with semantic zoom, progressive disclosure, spatial grouping, Focus, contextual inspectors, search and real whitespace; not by shrinking everything.

Minimize persistent chrome. Prefer small anchored tool clusters, contextual commands, keyboard shortcuts, the command palette and collapsible rails over a permanent wall of buttons on four edges. **Stage exception:** Record, Mark, Capture, Dice and Search stay anchored because they are time-critical — their constancy should reduce attention, not add chrome.

## Quality floor

- Every spatial action has a keyboard equivalent: nudge, align, group, connect, focus, collapse.
- Visible focus states that use the ink-frame language, not a browser default outline.
- Text meets AA on both `--paper` and `--charcoal` fields. Verify Pencil text specifically — provisional must not mean illegible.
- Stage touch targets ≥ 44px; Stage must work one-handed and survive going offline mid-session.
- Honour `prefers-reduced-motion`: cross-fade instead of transform, keep canvas pans instant.
- Pointer Events (not mouse events) throughout, so pen and touch behave.

## Anti-patterns

Hard no: parchment or faux-leather; fantasy borders, glowing runes, galaxy backgrounds, particle fields; RPG HUD framing on Stage; AI sparkle icons; purple/cyan "AI" color language; gradients used to manufacture sophistication; fake technical markings scattered as decoration; permanent full relationship graphs as wallpaper; approval inboxes as the primary continuity experience; modal bureaucracy during play; invisible or irreversible AI changes; classification required before creation; live AI chatter competing with players; UI that gets visually louder as the world gets richer.

## Build order

Prove the language on a vertical slice before expanding the component library. Use real fictional content, never lorem ipsum.

1. **Desk — working state.** 12–20 varied objects, several clusters, loose Pencil material, imagery, relationships, genuinely different card treatments.
2. **Desk — far zoom.** Clusters, Threads, minimal labels, faint relationship structure.
3. **Focus.** One Person or Place expanded in context with prose, provenance, related objects, editing.
4. **Librarian open.** Implicit context; one answer in language; one in-canvas proposal; one completed action with undo.
5. **Prep.** Session material as ordered spatial stacks.
6. **Stage.** Image-led, instantly readable; objective and opening material; 3–5 pinned objects collapsed and expanded; persistent search; capture and a Pencil stub; visible recording + Mark Moment; End Session into Review.
7. **Mobile.** Same Board as ordered stacks; Focus, Librarian, capture, search — and a Stage that is convincingly primary, not a squeezed desktop.
8. **Empty state.** A blank Desk must feel inviting, not sterile.
9. **Error / offline.** Same language, no whimsy.

Judge the visual identity on Desk and Focus. Judge the product thesis on whether Prep → Stage → Review feels like one continuous world.

## Review checklist

Before shipping a Relic surface:

1. Does this feel like a world on a desk rather than a database UI?
2. Is the hierarchy clear without extra borders, controls or labels?
3. Does the representation fit this kind of object and its current state?
4. Can the GM capture or develop an idea before the software interrupts?
5. Can they tell what is true, what is uncertain, and where it came from?
6. Does the first useful result arrive before attention moves on?
7. Is the AI reaching through the interface — and is every change visible and reversible?
8. With the branding removed, could this be mistaken for Miro, Notion, Milanote, Linear, Obsidian, Scrintal, Heptabase or a chat app?

Their interaction lessons may be present. Their visual identity may not. Fail one — question it. Fail two — redesign it.
