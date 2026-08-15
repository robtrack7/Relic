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
7. ~~Representations, typed Cards, and claims.~~ **Done** — eight kinds as representations of one identity, a mechanical sheet for what the rules care about, claims as the addressable truth unit carrying a story position, and a contextual surface to edit both.
8. ~~Add Focus and progressively deepen/widen objects/cards without identity churn.~~ **Done** — semantic zoom tiers, Focus as a second deliberate stage after selection, and the entity surface beside the canvas rather than over it.
9. **Relationship assertions.** A claim whose value is another World Object. This is what makes "pull the thread" mean anything — Focus can then reveal a neighbourhood instead of only suppressing everything else, and Chronicle later has edges to draw. *Added to the order: `WORLD-MODEL.md` lists relationship assertions as one of the three truth units and the build order never sequenced them.*
10. Add Ink, provenance, and deliberate truth editing.
11. Add Library/search and pull existing material into the Desk.
12. Make the Librarian understand current Board, focus, and selection.
13. Let the Librarian manipulate the workspace and create Pencil material.
14. Build Prep as a composition of the same world.
15. Run that composition through Stage.
16. Settle session evidence and changes back into the world.
17. **Chronicle as a Desk lens** — story ordering, Thread currents, the Now line, entity history as-of a past point, retcons.
18. Migrate one representative real Saga and harden the beta loop.

This order may change when implementation teaches us something. Update it rather than preserving a bad sequence.

### Why Chronicle is late but the temporal seam is early

Chronicle needs Events with participants, Threads with membership, and sessions
that actually happened. None of that exists until step 16, so building the lens
sooner means building it against invented content.

What cannot wait is the **shape**. Step 7 landed claims with a story position and
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

**Capture produces Pencil, always.** Nothing on the capture or edit path can write `ink`. Establishing Ink is step 10 and needs its own deliberate, previewed action.

## Decisions the Boards slice settled

**Boards are siblings of the Desk, not children.** Both are rows in `compositions`; both render through the same surface, because they are the same kind of thing. The Desk is only the composition a world opens at.

**An object appears at most once per composition.** Enforced by a partial unique index, not by the caller. Across compositions it may appear freely — that is what a reference is for. Referencing something already present returns the card that is already there, so the gesture is idempotent.

**Cross-world references are refused in the store.** `referenceObjects` re-resolves the object's world and compares it to the composition's. This is the seam that becomes tenancy enforcement when Relic grows accounts; it does not belong in whichever caller happens to hold both ids.

**Fitting never magnifies.** A composition holding one card opens at its natural size. Filling the screen with a single card at 400% was worse than empty space.

**The visual language is warm ivory, near-black ink, and one restrained orange**, per the `relic-ui` skill. Sans for chrome, serif for narrative material, mono for provenance and system metadata. Pencil is drawn with an interrupted edge — provisional, not disabled — and selection changes colour and lift but never border *style*, so a selected Pencil card cannot start reading as established.

## Decisions the Focus slice settled

**Focus is one piece of state, not two.** Opening the entity surface and making
the rest of the world recede are the same idea seen from the panel and from the
canvas, so they are one `focusId`. Two would drift apart.

**Selection is not focus.** Clicking a card reveals what can be done with it;
a second deliberate act — double-click, `F`, or the `Open` control — deepens into
it. The entity surface used to appear on any single selection, which skipped a
stage and made the panel flicker as the selection moved. Escape leaves the
deepest thing first: Focus, then the selection.

**Double-click deepens; Enter still edits.** Prose editing belongs in the entity
surface, but the inline editor is the fast path capture depends on, so it keeps
the keyboard route the hints already advertised.

**Zoom changes information, not size.** Three tiers with hysteresis: far shows a
kind and a name, mid adds claims and the sheet, near adds the prose underneath.
The tier is state rather than a pure function of scale, because hysteresis has to
know which side it came from — otherwise a card sitting on a threshold rewrites
itself on every frame of a pinch. `tierFor` settles rather than stepping one
level per call, so fit-to-bounds jumping from 0.2 to 4 lands in the right tier
immediately instead of one short.

**Recession, not removal.** Unfocused material dims and desaturates but stays in
place, legible and clickable. Attention suppresses; it does not hide.

## Decisions the Representations slice settled

**A representation is a way of seeing an object, not a new record.** Deepening a
Fragment into a Character adds a row keyed to the object that was already there.
The id survives, the Fragment body survives underneath, and every composition
already referencing it shows a Character without anything being moved or
recreated. `unique (object_id, kind)` means one Character view of a thing, not
two — an object may still hold several different kinds, because a Place that is
also a Faction's seat is one identity seen two ways.

**The sheet and the claims are different things, and the line is worth stating.**
A representation's `fields` hold the mechanical sheet — ability scores, armour
class, level. Rules data: nobody disputes a Dexterity score, nobody cites a
source for it, and it does not change because of what happened in the fiction.
Claims hold narrative assertions — occupation, allegiance, location, status —
which *are* contested, sourced, and temporal. The test: if it would ever appear
in a sentence beginning "we believe this because…", it is a claim. Putting a
statblock in claims would drown the truth system in bookkeeping; putting
allegiance in a JSON blob would make it unciteable and untemporal.

**Claims are append-only assertions, not mutable cells.** There is deliberately
no `unique (subject_id, claim_kind)`. Mara's allegiance before the cathedral and
after it are two claims, both true, at different story positions — and the value
Relic shows is a projection, the latest claim at or before the position being
viewed. This is the whole reason story position exists before anything reads it:
a schema assuming one current value per fact would need rewriting to gain a
temporal axis, and this one only needs a query.

The distinction is in the write path already. `setClaim` with no story position
*replaces* — a GM correcting themselves should not leave two contradictions
standing at the same moment. With a story position it *appends*, because that is
the world changing rather than the record being fixed.

**Built-in templates live in TypeScript; the `templates` table is for the GM's
own.** Built-ins will churn constantly while the product finds its shape, and
editing a constant beats writing a migration to rename a field. A row in that
table is always somebody's own template.

**Nothing on this path writes Ink.** A claim asserted by hand is Pencil with
`gm_assertion` provenance. Establishing Ink is step 10 and needs its own
deliberate, previewed action.

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

**Supabase comes before the durable schema, not after it.** Steps 7–10 write the
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
