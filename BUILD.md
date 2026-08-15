# Relic V2 — Build

The purpose of this file is to keep development moving toward a working product.

Build **vertical slices**, not administrative phases. Prefer visible product progress over speculative infrastructure.

## Current build order

****Port or adapt proven V1 capabilities when the V2 slice actually needs them.**** **this may happen at multiple times throughout the build*

1. ~~Start the clean V2 app and shell.~~ **Done.**
2. ~~Make the Desk a real infinite canvas.~~ **Done.**
3. ~~Create, edit, move, select, and persist Cards.~~ **Done.**
4. ~~Persist World Objects and loose Fragments.~~ **Done** — capture already creates a World Object with a Fragment body; the card is only a reference plus layout.
5. ~~Save and reopen Boards as reference-only compositions.~~ **Done** — a Board is a sibling composition of the Desk at `/c/[compositionId]`; selected cards are *referenced* onto it, never moved or copied.
6. Design the different type of cards we need for the different entities optimizing the backend for eventual ai interactions with them. remember this is for tabletop rpgs, things like ability scores etc matter in certain instances. we should set the groundwork for user assembled cards if they need a template that we've not provided.
7. Add Focus and progressively deepen/widen objects/cards without identity churn.
8. Add Ink, Pencil, provenance, and deliberate truth editing.
9. Add Library/search and pull existing material into the Desk.
10. Make the Librarian understand current Board, focus, and selection.
11. Let the Librarian manipulate the workspace and create Pencil material.
12. Build Prep as a composition of the same world.
13. Run that composition through Stage.
14. Settle session evidence and changes back into the world.
15. Migrate one representative real Saga and harden the beta loop.

This order may change when implementation teaches us something. Update it rather than preserving a bad sequence.

## Decisions the first slice settled

**Storage is a port, not a choice yet.** Everything reads and writes through `DeskRepository`. The only implementation today is local SQLite (`node:sqlite`, `.relic-data/relic.db`), which needs no service to run. A Postgres/Supabase implementation lands behind the same interface when Relic grows accounts — that is the slice that decides hosting, not this one.

**The schema enforces the composition invariant rather than documenting it.** `composition_items` holds placement and nothing else; `fragments` hold body text and nothing else. There is no column on a composition item that could hold world truth.

**A write conflict returns the whole composition.** Callers reconcile by replacing what they hold, so a partial list would read as "the Desk now contains only these" and silently drop the rest.

**Capture produces Pencil, always.** Nothing on the capture or edit path can write `ink`. Establishing Ink is step 8 and needs its own deliberate, previewed action.

## Decisions the Boards slice settled

**Boards are siblings of the Desk, not children.** Both are rows in `compositions`; both render through the same surface, because they are the same kind of thing. The Desk is only the composition a world opens at.

**An object appears at most once per composition.** Enforced by a partial unique index, not by the caller. Across compositions it may appear freely — that is what a reference is for. Referencing something already present returns the card that is already there, so the gesture is idempotent.

**Cross-world references are refused in the store.** `referenceObjects` re-resolves the object's world and compares it to the composition's. This is the seam that becomes tenancy enforcement when Relic grows accounts; it does not belong in whichever caller happens to hold both ids.

**Fitting never magnifies.** A composition holding one card opens at its natural size. Filling the screen with a single card at 400% was worse than empty space.

**The visual language is warm ivory, near-black ink, and one restrained orange**, per the UI core skill. Sans for chrome, serif for narrative material, mono for provenance and system metadata. Pencil is drawn with an interrupted edge — provisional, not disabled — and selection changes colour and lift but never border *style*, so a selected Pencil card cannot start reading as established.

## How to work

Act like senior staff engineers.

- The vision and durable invariants matter more than old implementation details.
- Existing contracts are accumulated knowledge, not bureaucracy to satisfy.
- Use judgment for ordinary implementation decisions.
- Escalate only changes that materially affect product direction, security, data integrity, or expensive-to-reverse architecture.
- Prefer simple implementations that can evolve.
- Reuse V1 only when the proven implementation is genuinely valuable.
- Do not build compatibility machinery merely to preserve obsolete structure.
- Documentation changes only when a durable decision changes or future engineers would otherwise misunderstand the system.

## Validation

Use three levels:

**During implementation:** run focused checks for the code being changed.

**At vertical-slice completion:** run the relevant subsystem suite and exercise the feature in the browser.

**At real milestones:** run the expensive repository, migration, security, and end-to-end gates.

Testing exists to enable confident movement, not to replace movement.

## Definition of progress

A milestone should leave Relic visibly more complete.

Prefer:

> “Capture, Cards, and Boards now work end to end.”

over:

> “The repository is now authorized to begin Cards.”
