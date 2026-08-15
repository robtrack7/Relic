# Interaction model

## Core ontology

Relic is a persistent fictional world. UI objects are representations of underlying identity and state.

### Fragment
Unclassified creative material: prose, image, question, quote, loose name, promise, possibility, source excerpt, scene thought or Mark. Fragments may remain fragments forever or acquire identity/structure later.

### World Object
Stable persistent identity: Character, Place, Faction, Artifact, Thread, Event, Source, persistent Fragment, and future types supported by the repository.

### Placement
A reference to a World Object inside a Desk/Board composition. Placement stores spatial/presentation state, never canonical identity.

### Claim
A meaningful assertion about a World Object or relationship. Claims carry truth/epistemic state, provenance and story validity.

## Pencil and Ink: maturity, not truth

Use maturity to communicate how settled a thing is.

- **Pencil**: persistent but unfinished, unresolved, provisional in shape, or awaiting refinement.
- **Ink**: substantially settled and usable as a mature world object.

Do not require Pencil objects to disappear from search, Stage, Chronicle or Boards. Pencil material is real product state.

Examples:
- Orin may be Pencil while `occupation = locksmith` is an established claim.
- Mara may be Ink while `Mara killed him` remains disputed.
- A Thread may be Ink as a defined narrative current while its future consequences remain Pencil.

Promotion to Ink should be legible and intentional/accepted; never infer “finished” silently just because an AI generated many fields.

## Claim truth

Keep at least these dimensions independent:

### Epistemic/truth state
- established;
- provisional;
- disputed;
- unknown.

### Provenance
- GM;
- player/session evidence;
- imported source;
- Librarian;
- deterministic system process.

### Visibility
- GM-only;
- shared/player-visible;
- future finer scopes if supported.

A GM can speculate without creating truth. A player statement can be preserved without being canon. A Librarian inference can persist without being established.

## Boards

**Desk** = current working composition.

**Board** = remembered composition of the same world: selected identities, placements, stacks/groups, local annotations, viewport and presentation.

Never say or code “move entity into Board” as ownership. Prefer “place/show on Board”. The same identity may appear on many Boards.

Boards default to the **current projection** of each object. Historical inspection happens through Focus and Chronicle rather than duplicating old entity cards as separate records.

## Focus / deep editing

Selection deepens in stages.

Recommended desktop progression:

1. **Hover** — subtle highlight/affordances; no state jump.
2. **Click** — card expands slightly in place; important relationships/actions appear.
3. **Deeper intent / double-click** — open a contextual entity surface to the right of the canvas while preserving the Board.
4. **Deep entity state** — edit prose, claims, relationships, history and sources in that entity surface; autosave working edits.
5. **Close** — entity surface collapses and the Board representation reflects the updated state immediately.

Typical desktop frame may become:

`tools | canvas | entity surface | Librarian carriage`

The exact pixels/components belong to `relic-ui`; preserve the context hierarchy.

A route may exist for deep links/browser history, but it should *feel* like Mara expanded, not like navigating to Character Administration.

## Pull the thread

Focus is composable:
- one object → reveal its story footprint;
- two objects → reveal what meaningfully connects them;
- a Thread → reveal events, objectives, participants, evidence and unresolved pressure;
- a Fragment/question → reveal nearby evidence and candidate structure.

Reveal a relevant neighborhood, not the whole graph.

## Lenses as layout gravity

Think of Desk lenses as **different layout gravity applied to the same world**:

- **Free Desk/Board** — human spatial composition is dominant.
- **Relationships** — relational forces/graph topology dominate.
- **Chronicle** — story time dominates horizontally; semantic clustering/Threads organize the other axis.
- **Map** — geography dominates.
- **Focus** — attention suppresses unrelated material.

Identity, selection and context persist across lens changes.

## Natural-medium interaction

Examples:

`Put the lighthouse people together.` → semantic grouping/placement operation, then layout.

`What happened at the lighthouse?` → concise sourced answer; expand for events/sources.

`Could Mara be involved?` → temporal/relational reasoning plus optional Pencil structure.

`Make this an opening scene.` → scene/session material appears in Prepare/current composition.

`Show how these became connected.` → Chronicle/relationship projection, not merely prose.

## Undo

Record conceptual intent, not low-level UI operations.

- one drag = one undo;
- one alignment/grouping action = one undo;
- one Librarian request = one undo even if many placements changed;
- truth corrections keep audit/history and use explicit reversal when domain semantics require it.
