# Relic V2 — Build

The purpose of this file is to keep development moving toward a working product.

Build **vertical slices**, not administrative phases. Prefer visible product progress over speculative infrastructure.

## Current build order

1. ~~Start the clean V2 app and shell.~~ **Done.**
2. ~~Make the Desk a real infinite canvas.~~ **Done.**
3. ~~Create, edit, move, select, and persist Cards.~~ **Done.**
4. ~~Persist World Objects and loose Fragments.~~ **Done** — capture already creates a World Object with a Fragment body; the card is only a reference plus layout.
5. Save and reopen Boards as reference-only compositions. *(The Desk is already a `composition` row; a Board is a second one.)*
6. Add Focus and progressively deepen objects without identity churn.
7. Add Ink, Pencil, provenance, and deliberate truth editing.
8. Add Library/search and pull existing material into the Desk.
9. Make the Librarian understand current Board, focus, and selection.
10. Let the Librarian manipulate the workspace and create Pencil material.
11. Build Prep as a composition of the same world.
12. Run that composition through Stage.
13. Settle session evidence and changes back into the world.
14. Port or adapt proven V1 capabilities when the V2 slice actually needs them.
15. Migrate one representative real Saga and harden the beta loop.

This order may change when implementation teaches us something. Update it rather than preserving a bad sequence.

## Decisions the first slice settled

**Storage is a port, not a choice yet.** Everything reads and writes through `DeskRepository`. The only implementation today is local SQLite (`node:sqlite`, `.relic-data/relic.db`), which needs no service to run. A Postgres/Supabase implementation lands behind the same interface when Relic grows accounts — that is the slice that decides hosting, not this one.

**The schema enforces the composition invariant rather than documenting it.** `composition_items` holds placement and nothing else; `fragments` hold body text and nothing else. There is no column on a composition item that could hold world truth.

**A write conflict returns the whole composition.** Callers reconcile by replacing what they hold, so a partial list would read as "the Desk now contains only these" and silently drop the rest.

**Capture produces Pencil, always.** Nothing on the capture or edit path can write `ink`. Establishing Ink is step 7 and needs its own deliberate, previewed action.

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
