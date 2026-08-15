---
name: relic-ux
description: "UX and interaction architecture for Relic v2, the AI-operated TTRPG world workspace. Use for ANY user-facing Relic design, implementation, refactor, or critique: Desk/Boards, fragments and World Objects, Focus/lenses, Chronicle and temporal history, Librarian interactions, saga creation, Prepare, Stage, Review, Library/Search, Ink/Pencil maturity, truth/provenance, AI actions, undo, navigation, responsive behavior, or continuity across the create→play→review loop. Trigger even for local coding tasks such as 'add an NPC card', 'build timeline', 'fix Stage search', or 'wire the Librarian sidebar' because Relic's UX laws determine the correct state model. This skill owns behavior and flow; use the companion relic-ui skill for visual styling, canvas physics, tokens, motion, and component appearance."
compatibility: "Agent Skills compatible. Designed for Claude Code and OpenAI Codex."
metadata:
  status: "final"
  version: "1.0"
  product: "Relic v2"
---

# Relic UX

## Mission

Build Relic as a **living fictional world**, not campaign-management software.

The database holds the world. The Desk, Boards, Chronicle, relationships, map, Prepare and Stage are projections of it. The Librarian is the operator woven through those projections. The GM should be able to think loosely, deepen ideas without re-filing them, play without administrative interruption, and return to a world that has visibly evolved.

**The interface changes. The world does not.**

Use `relic-ui` beside this skill when available. `relic-ux` owns interaction semantics, state, attention, authority, temporal behavior and flow. `relic-ui` owns visual expression and physical interaction feel. Repository schema/security contracts outrank both.

### Important V2 semantic correction

Do not model `Ink`/`Pencil` as the entire truth system.

- **Pencil / Ink = maturity of a world object or piece of material.** Pencil is persistent but unsettled/incomplete; Ink is substantially settled.
- **Truth lives at the claim/event/relationship level** and remains separate from provenance and visibility.
- A Pencil Character may contain established facts. An Ink Character may still contain disputed or unknown claims.
- Librarian-created or session-captured material may persist everywhere while Pencil.

If older code or the companion UI skill uses `WorldObject.truth: 'ink'|'pencil'`, treat that as shorthand to refactor rather than V2 domain law.

## Proportionality

This skill is a reference, not a gate. Match the ceremony to the change.

- **Mechanical or already-decided work** — a rename, a token swap, a stated fix: just do it. Do not run the tests, the questions or the priority list.
- **Ordinary slice work**: skim the laws, load at most one reference, build. The checklists below are for when a decision is genuinely contested — reach for them then, not by default.
- **A durable or expensive-to-reverse decision** — schema, identity, truth, temporal shape, Librarian authority: this is what the full apparatus is for.

Never run both this skill's checklists and `relic-ui`'s on the same change. One pass, at the altitude the change deserves. If you have re-read a section without it changing your answer, you are done deliberating — build the thing.

## Load only what you need

| Work | Read |
|---|---|
| Fragments, identity, maturity, claims, Boards, Focus, lenses | `references/interaction-model.md` |
| Desk shell, navigation, first run, deep editing, Prepare, Stage, Review, mobile | `references/surface-patterns.md` |
| Chronicle, entity history, story time, Threads, temporal retrieval | `references/temporal-chronicle.md` |
| Librarian carriage, Story Kernel, authority and semantic operations | `references/librarian-ux.md` |
| State machines, async/offline UX, focus, performance, implementation boundaries | `references/coding-contracts.md` |
| Critique/regression checks | `references/anti-patterns.md` |

## The five tests

Every meaningful interaction must survive these.

1. **Zero barrier** — Can the GM capture or develop the thought before software demands classification?
2. **Legibly yours** — Can the GM tell what is settled, provisional, true, disputed, sourced and visible?
3. **Faster than the table** — Under live-play attention pressure, does the first useful result arrive before attention moves on?
4. **The world stays present** — Does this feel like acting on the fictional world rather than leaving it to operate software?
5. **Intelligence reaches through the interface** — Can the Librarian act on the world when acting is more useful than explaining?

Fail one: question it. Fail two: redesign it.

## Interaction laws

### 1. Thought before structure
Fragments come first. Text, image, question, quote, name, promise, hypothesis or Mark may exist without a type, template, folder or title. Structure may emerge later.

### 2. One identity everywhere
A Character, Place, Faction, Artifact, Thread, Event, Source or persistent Fragment is one identity regardless of Board, Focus, Chronicle, map, Prepare, Stage, search or Librarian conversation. Views reference identity; never fork records because they appear elsewhere.

### 3. Views compose; they do not contain
The Desk is the current working composition. Boards are remembered compositions. Placement is not ownership. Deleting or moving a placement does not delete or mutate the world object.

### 4. The Saga opens onto the Desk
Returning users land exactly where they were working: Board, viewport, selection/focus and working context when safe. Do not put a dashboard in front of the world.

### 5. Selection deepens
Hover reveals affordance. Click deepens locally. Further intent may expand the object or open a contextual entity surface while the canvas stays visible. Prefer progressive focus over navigation away.

### 6. Maturity, truth, provenance and visibility are separate
Pencil means unsettled; Ink means substantially settled. Truth requires deliberate assertion/evidence at the claim level. Authorship does not equal truth. Provenance survives every transition.

### 7. History is real
**Identity is permanent. State is temporal. Presentation is projected.** The present is a fast projection of accumulated story history, not the only state Relic stores.

### 8. Conversation is a control surface
The Librarian has a persistent carriage because conversation is useful. Chat is not its boundary. Selection, current Board/lens, Focus, session and task context flow into it automatically.

### 9. Act in the natural medium
A spatial request changes composition. A relationship request changes or proposes semantic relationships. A factual question returns concise sourced language. A prep request builds Prepare. Do not describe an action the Librarian should have performed.

### 10. AI operates semantics, not pixels
The Librarian manipulates structured world concepts and typed intents: create, connect, group, attach to Thread, place-near, order, set story position, establish knowledge, prepare session, create view. Deterministic application logic turns those semantics into coordinates, routes, splines, clustering and visual layout.

### 11. Powerful agency must be reversible
The Librarian is an operator, not a cautious suggestion bot. Read, compose and create Pencil freely when safe. One request = one conceptual undo. Ink mutations require clear GM intent; destructive operations retain stronger confirmation.

### 12. Inference may recompute; settled truth may not
Corrected evidence may redraw dependent provisional interpretations automatically. Conflicts with settled truth are surfaced, never silently rewritten.

### 13. Capture is attention
During play, favor tiny durable actions that record evidence or salience over organization workflows. Capture now; interpret after.

### 14. Complexity is revealed
Use semantic zoom, Focus, lenses, search, proximity, context and progressive disclosure. Do not keep the whole world resident in chrome.

## Minimal navigation model

Default durable destinations:

**Desk · Library · Sessions**

- **Desk** is home and contains Boards plus lenses such as Chronicle and Relationships.
- **Library** is the systematic index into the world, not its primary home.
- **Sessions** manages session lifecycle/history and enters Prepare/Stage contextually.
- **Search** is global, preferably in the top frame.
- **Librarian** is global, normally a collapsible right carriage/sheet.
- **Prepare** is a session composition, reached from session context rather than permanent primary navigation.
- **Review** is primarily the `Since last session` world delta; a completeness index is secondary tooling.
- **Threads** are first-class story structures but second-class navigation; index them through Library/search when systematic management is needed.
- **Chronicle / Relationships / Map** are Desk lenses, not separate databases or mandatory app sections.

Do not add top-level navigation merely because a domain object exists.

## Product loop

Treat this as one continuous world, not feature handoffs:

**Think/create → arrange → prepare → play/capture → synthesize → review in context → settle → changed world → continue**

Prepare and Stage project the same identities plus session working state. Review returns changes to the part of the world they affect. Nothing is copied merely to cross a phase boundary.

## Before coding a user-facing change

Resolve:

1. Where is the GM in the loop?
2. What is the attention budget: contemplative Desk, purposeful Prepare, or interruption-intolerant Stage?
3. What changes: composition, working state, evidence, maturity, claim truth, or history?
4. What must remain present: Board, Focus, entity, source, session, conversation?
5. What can the Librarian do directly, and what requires deliberate truth/destructive intent?
6. Does this state vary over story time? If yes, read `references/temporal-chronicle.md` before inventing schema/UI.

Then build the smallest interaction that satisfies the intent.

## Default priority under ambiguity

1. preserve world identity and temporal integrity;
2. preserve truth/provenance boundaries;
3. preserve the user's current context;
4. reduce classification and navigation;
5. return the smallest useful result first;
6. expose depth progressively;
7. let the Librarian act directly but reversibly;
8. optimize for the current attention budget;
9. only then optimize conventional IA.

## Expected agent behavior

When designing or implementing Relic:

- Reuse stable World Objects; create placements/projections rather than copies.
- Describe or implement meaningful state transitions, not a page inventory.
- Include empty, loading, failure, stale/conflict, undo/recovery and narrow-screen behavior when applicable.
- Preserve keyboard/focus and accessible alternatives to spatial interaction.
- For Librarian work specify context, semantic operation, authority, provenance, visible effect and undo.
- For Stage explicitly check latency, offline durability, interruption cost and smallest-useful-result disclosure.
- For Review prefer in-world delta plus a compact completeness index over queue-first administration.
- For history distinguish story time from database/edit time.
- Preserve useful lifecycle/recovery contracts from older specs without resurrecting their obsolete dashboard/page/queue ontology.
