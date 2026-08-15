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
6. ~~Move storage to Supabase behind the existing port.~~ **Done** — Postgres via the local Supabase stack, same five tables, no new features. The suite is the proof: the same specification, a new engine.
7. **Representations, typed Cards, and claims.** The entity kinds a TTRPG actually needs — Character, Place, Faction, Thread, Event, Artifact, Source, Note — as representations of one identity, with structured fields where the game cares (ability scores, statblocks) and user-assembled templates where we have not provided one. Claims become the addressable truth unit, and carry a story position from day one.
8. Add Focus and progressively deepen/widen objects/cards without identity churn.
9. Add Ink, provenance, and deliberate truth editing.
10. Add Library/search and pull existing material into the Desk.
11. Make the Librarian understand current Board, focus, and selection.
12. Let the Librarian manipulate the workspace and create Pencil material.
13. Build Prep as a composition of the same world.
14. Run that composition through Stage.
15. Settle session evidence and changes back into the world.
16. **Chronicle as a Desk lens** — story ordering, Thread currents, the Now line, entity history as-of a past point, retcons.
17. Migrate one representative real Saga and harden the beta loop.

This order may change when implementation teaches us something. Update it rather than preserving a bad sequence.

### Why Chronicle is late but the temporal seam is early

Chronicle needs Events with participants, Threads with membership, and sessions
that actually happened. None of that exists until step 15, so building the lens
sooner means building it against invented content.

What cannot wait is the **shape**. Step 7 lands claims with a story position and
validity from the first migration, even while every view shows only Now. Adding a
temporal axis to a schema that assumed one current value per fact is the kind of
change that rewrites everything downstream — so we pay for it once, cheaply, up
front. See `WORLD-MODEL.md` § Story time.

If Chronicle needs to come forward, the piece to pull earlier is Events and
Thread membership as first-class structures — not the lens.

## Decisions the first slice settled

**Storage is a port.** Everything reads and writes through `DeskRepository`. The first implementation was local SQLite (`node:sqlite`, `.relic-data/relic.db`), which needed no service to run and let the first three slices move fast. ~~A Postgres/Supabase implementation lands when Relic grows accounts.~~ **Superseded — Postgres landed at step 6, and SQLite is retired.** The port earned its keep: `actions.ts` and both pages changed by one import specifier each.

**The schema enforces the composition invariant rather than documenting it.** `composition_items` holds placement and nothing else; `fragments` hold body text and nothing else. There is no column on a composition item that could hold world truth.

**A write conflict returns the whole composition.** Callers reconcile by replacing what they hold, so a partial list would read as "the Desk now contains only these" and silently drop the rest.

**Capture produces Pencil, always.** Nothing on the capture or edit path can write `ink`. Establishing Ink is step 9 and needs its own deliberate, previewed action.

## Decisions the Boards slice settled

**Boards are siblings of the Desk, not children.** Both are rows in `compositions`; both render through the same surface, because they are the same kind of thing. The Desk is only the composition a world opens at.

**An object appears at most once per composition.** Enforced by a partial unique index, not by the caller. Across compositions it may appear freely — that is what a reference is for. Referencing something already present returns the card that is already there, so the gesture is idempotent.

**Cross-world references are refused in the store.** `referenceObjects` re-resolves the object's world and compares it to the composition's. This is the seam that becomes tenancy enforcement when Relic grows accounts; it does not belong in whichever caller happens to hold both ids.

**Fitting never magnifies.** A composition holding one card opens at its natural size. Filling the screen with a single card at 400% was worse than empty space.

**The visual language is warm ivory, near-black ink, and one restrained orange**, per the `relic-ui` skill. Sans for chrome, serif for narrative material, mono for provenance and system metadata. Pencil is drawn with an interrupted edge — provisional, not disabled — and selection changes colour and lift but never border *style*, so a selected Pencil card cannot start reading as established.

## Decisions the Postgres slice settled

**The store speaks SQL directly, through `postgres.js`, not `supabase-js`.** The
port promises that one intent commits as one operation, and the browser never
touches the database — every read and write already goes through a server
action. A `plpgsql` RPC would also be atomic, so atomicity is not the argument;
the argument is that `WriteResult`, the branded ids, and the whole three-state
contract are TypeScript, and the 18 tests that specify them are TypeScript.
Moving the write primitives into SQL functions would relocate the specification
out of the language it is written in. V1 needed an RPC boundary because its
browser held a Supabase client. That constraint is gone; the boundary should not
be inherited without its reason. Supabase's client is still the right tool the
day the browser or the Librarian needs direct, RLS-enforced access.

**SQLite was hiding a lost update, and the fix is explicit row locks.** SQLite
took a whole-database write lock, so read-verify-then-write was atomic against
other writers for free. Under Postgres READ COMMITTED it is not: two writers can
both read version 3, both pass their optimistic check, and both write. This was
measured, not assumed — with a barrier forcing the interleave, two concurrent
moves both returned `ok` and the version advanced twice. Every verify phase now
takes `for no key update`, and three further races the whole-database lock had
been covering are closed with it: `max(z)` allocation, which no row lock can
cover and which is instead serialised on the composition row; the last-reference
count in `removeCards`, which spans compositions and so locks the object; and
the check-then-insert in `referenceObjects`. Lock order is fixed and documented
in the store: compositions → composition_items → world_objects → fragments.

**`referenceObjects` validates the whole batch before writing any of it.** The
SQLite original checked each placement as it inserted, so a mixed batch could
refuse halfway and still commit what it had already placed. Returning from
inside a transaction commits — which is why the rule is now stated in the file:
no write may precede its verification.

**RLS is enabled with no policies.** Relic has no actor, so there is nothing to
write a policy against. Enabled-and-empty denies everything to `anon` and
`authenticated`, which means the tables are closed the day anything points
PostgREST at them rather than open. No `owner_id` yet: a tenancy column with
nothing to put in it is speculative, and adding it later is one `alter table`.
The seam that matters already exists in `referenceObjects`.

**Tests share the development database, isolated by a fresh world per test.**
Everything is world-scoped, so tests cannot see each other and files stay
parallel-safe. Rolling back instead would mean the suite never exercises a real
commit — and committing at the wrong moment is precisely the failure mode
Postgres introduces. The cost is that `pnpm test` leaves test worlds behind;
`npx supabase db reset` clears them.

**Relic's local stack runs on the 544xx ports.** V1's local Supabase occupies
543xx on this machine and must keep it. See `supabase/config.toml`.

## Decisions taken before the schema deepens

**Supabase comes before the durable schema, not after it.** Steps 7–9 write the
schema Relic will live with: representations, claims, provenance, story position.
Designing that against SQLite and again against Postgres is doing the hard part
twice, and tenancy and RLS are schema-shaped concerns that cannot be bolted on
afterwards. The port made the swap cheap; four tables is the cheapest this will
ever be. V1's Supabase work — the server boundary where routes pass opaque IDs
and the server re-resolves scope with the authenticated actor, and the thinking in
the uncommitted `_v2_` migrations — is proven and worth quarrying. Its migration
chain is not; those files chain onto 70 V1 migrations and drag the whole V1 schema
with them.

**Maturity and truth are different axes.** A World Object has maturity — Pencil
while unsettled, Ink once settled. A claim has truth — Ink, Pencil, or disputed.
Neither implies the other. No truth column goes on a World Object. Today
`truthState` sits on the Fragment, which is a truth unit, so the current schema is
already on the right side of this; step 7 generalises Fragment into claims rather
than lifting truth up onto the object.

**Claims carry story position from the first migration.** Every view can show
only Now for a long time. The columns still exist. See the build-order note above.

**The Librarian emits typed semantic intents, never geometry.** `place_near`,
`cluster_by`, `attach_to_thread`, `set_story_position` — deterministic layout code
turns those into coordinates. Nothing asks a model for a bezier path. This is
settled now because it shapes the tool surface built at step 12.

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
