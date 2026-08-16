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
9. ~~Relationship assertions.~~ **Done** — a claim whose value is another World Object, both directions of a neighbourhood on every card, and Focus that reveals what an object is connected to instead of only suppressing everything else.
10. ~~Add Ink, provenance, and deliberate truth editing.~~ **Done** — maturity and truth separated onto the axes they belong to, one method as the only door to Ink, a previewed act that establishes, and every ruling attributed.
11. ~~Add Library/search and pull existing material into the Desk.~~ **Done** — one
    ranked index behind global search, the Library, and the relationship picker;
    retrieval that brings a thing to the composition you are on rather than
    taking you to it; and a way back for material that was cleared off the Desk.
12. ~~Make the Librarian understand current Board, focus, and selection.~~
    **Done** — a persistent carriage beside the world, a context assembled on the
    server from identifiers the browser cannot forge, citations that resolve to
    real objects or to nothing, and a model behind a port. Eyes, not yet hands.
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

**Capture produces Pencil, always.** Nothing on the capture or edit path can write `ink`. ~~Establishing Ink is step 10 and needs its own deliberate, previewed action.~~ **Landed at step 10** — and the rule is no longer a convention the write paths observe: they name no settling author, and the database refuses Ink without one.

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

## Decisions the Relationships slice settled

**A relationship is one nullable column on `claims`, not a table.** `object_value`
carries the id of the object at the other end, and everything a claim already
carries — truth, provenance, story position — applies to it unchanged. There is
one write path, so nothing downstream has to learn that relationships are
special, and Chronicle inherits story-ordered edges the day it arrives. A
`relationships` table would have had to grow all of that back.

**The words and the id are both kept, and neither is what gets shown.** The id is
what Relic follows; the text is what the GM wrote, and it keeps the claim
readable if the far end is ever archived. What a card displays is the other
object's name *now* — renaming the Harbour Guild renames it everywhere it is
referred to, because identity is stable and names are not.

**Linking is never a precondition for asserting.** A relational field takes text
first and offers to bind it to an identity second. A template naming a field
"Location" must not refuse a place nobody has captured yet — that would be
structure blocking thought, which is the one thing the Desk exists to prevent.

**Relational attributes are single-valued, deliberately.** Setting a location
retires the standing one, exactly as correcting text does, because the unit of
replacement is the claim kind. That is right for Location, Allegiance, Held by,
and Seat, and wrong for an Event's participants — so `participants` stays free
text until multi-valued relationships have a unit of their own. Guessing at one
now would have meant guessing without a case to answer to.

**A neighbourhood is a property of the world, not of the view.** Both directions
are resolved on every card and neither is scoped to the composition being
looked at, so a Board holding only Mara still knows the Guild is there. Following
a link to something absent *references it here* rather than navigating — pulling
the thread brings the thing to you, and Focus never leaves what you were reading.

**Attention now has three levels instead of two.** Focused, connected, and
receded. A neighbour keeps full weight and a quiet ring; only genuinely
unrelated material dims. Focus stopped being a uniform dimming of the world the
moment Relic could say what "related" meant.

## Decisions the Ink slice settled

**Maturity and truth are two axes, and the schema now says so.** How settled a
thing is belongs to the World Object; whether an assertion is believed belongs
to the claim. `fragments.truth_state` had been doing the first job under the
second name, and the card was drawing it as the object's truth — which told the
GM something false, because a Pencil Character holding an established occupation
and an Ink Character holding a disputed alibi are both ordinary. They are
different words, different marks, and different columns.

**One method is the only door to Ink.** `settleTruth` establishes; every other
write path produces Pencil. That concentration is the whole point: "Ink is
deliberate" stops being a rule each future write has to remember and becomes a
property of the one place that can do it. Three things are enforced there rather
than asked of callers — only the GM may establish, the claims must belong to the
subject, and the settlement commits as one change set.

**The rule is backed by the database, not only by the store.**
`claims_ink_is_deliberate` refuses any Ink row with no settling author recorded,
and `world_objects_ink_is_deliberate` does the same for maturity. No other write
names an author, so none of them *can* establish. A future path that forgets the
invariant fails loudly on its first insert instead of quietly establishing truth.
*Which* actors may establish stays in the store, because that is a judgment about
actors and it will grow roles; the row-level rule stays "somebody deliberate".

**Establishment is previewed, and the preview is versioned.** The sheet lists
exactly what is about to become Ink, one line per thing, and sends the version of
each claim as it was shown. A claim that moved underneath produces a conflict
rather than establishing wording nobody looked at. Object maturity carries no
version deliberately — it is a judgment about a whole thing, and it does not go
stale because one assertion changed beneath it.

**Every ruling is attributed, including the ones that unsettle.** `truth_by` and
`truth_at` record the last deliberate act on a state, not merely establishment.
Disputing something and withdrawing it are decisions, and "why did Relic stop
believing this" is asked as often as the other question. They sit alongside the
original provenance rather than replacing it, so "inferred by the Librarian ·
established by you" survives as two facts.

**Revising an established claim returns it to Pencil.** Correcting the wording
is a new assertion, and nobody has yet decided the new words are so. The
inspector makes established text read-only until a deliberate `Revise`, because
a blur handler that quietly rewrote Ink would break the invariant every time a
GM tabbed through the panel.

**Settling is the one Desk gesture that is not optimistic.** Everything else
paints first and writes behind, because a thought cannot wait for a round trip.
Truth can: it arrives through a confirmed act, and a card that read Ink for two
hundred milliseconds before the server refused would be the interface lying
about the world.

**`WriteResult` gained `refused`.** A refusal is not a missing row and not
malformed input — the request was well formed, everything existed, and Relic
declined. A truth system needs to be able to say that, and reporting "the
Librarian may not establish Ink" as an error would hide a decision behind a
failure.

**Full truth history waits for Chronicle.** One last-ruling record answers "why
do we believe this" today. A transition log is Chronicle's shape, and building
it here would mean building it against a world with no sessions in it.

## Decisions the Library slice settled

**One index read, not two.** `searchWorld` serves global search, the Library, and
the relationship picker, because they are one question asked with different
filters. The picker's need is a strict subset of the Library's — a second method
would have drifted, and the one that drifted would have been the one that could
not find something. Its tests moved with it: what "finding the other end" does is
now specified once, in `library.test.ts`.

**Searching ranks; it does not merely match.** An exact name beats a prefix, a
prefix beats a name containing the query, and any name beats a mention in prose.
A GM typing "mara" means the person called Mara, not the seventh Fragment that
mentions her. Matching reaches *every* representation's label rather than the one
a card happens to show, so a Place called "The Quay" that is also a Faction called
"Quay Wardens" answers to both. With no query this is a browse, ordered by name —
an index reads alphabetically, not by whatever was touched last.

**Retrieval never navigates.** Search brings the thing to the composition you are
already on, exactly as following a relationship does. This is the same gesture
from the other direction, so it is the same code: `pullIn` takes a batch, commits
as one change set, and returns what is already here rather than placing it twice.

**`cardHere` is the one composition-shaped fact on a world entry**, and it earns
its place. It is the difference between bringing something in and revealing what
is already in front of you. Referencing twice is already idempotent in the store,
so this is not about correctness — an interface that offered to "add" what the GM
is looking at would be misdescribing their world.

**Archived material is reachable, and pulling it back restores it.**
`removeCards` archives an object that loses its last reference, and until now
nothing could reach it again. The Library is that route, and `referenceObjects`
now restores rather than silently skipping — "archived, not destroyed" is only a
true promise if there is a way back. The restore happens *after* the composition
item is inserted, because the global lock order is `composition_items` →
`world_objects` and `removeCards` takes them in that order to decide the opposite
question.

**The Library is a surface over the composition, not a route.** Everything it
hands back needs a destination, and a world-scoped URL would have to guess which
composition that is. Keeping it over the Desk makes the destination the thing you
were already looking at, and names it in the sentence. Revisit when Sessions
arrives and there is a real second destination to navigate between.

**Where new material lands is asked of the surface, not lifted out of it.**
`SurfaceControls` is two imperative calls — `landing()` and `reveal()` — that the
canvas and the stack each answer their own way. Lifting the viewport into the
chrome would re-render the chrome on every frame of a pan, and where the GM is
looking is not the chrome's business. `reveal` pans and deliberately does not
zoom: the scale is how close the GM has chosen to stand to their world, and a
search result is not a reason to change it.

## Decisions the Librarian-context slice settled

**The model is behind a port, exactly as storage is.** `LibrarianProvider` is the
interface; `AnthropicLibrarian` is the one file in Relic that knows a model
exists. Everything the Librarian *is* — its identity, the truth laws it works
under, what it may see, what it may cite — is assembled above that line and
arrives as a `Turn`. `AI.md` says models are replaceable workers behind a stable
product intelligence, and this is what makes that checkable rather than
aspirational: swapping the provider cannot change what the Librarian believes
about Ink, because the provider was never told.

**The client sends identifiers; the server reads the world.** A request carries a
composition id, a focused card id, a list of selected card ids, and one sentence.
Every word of world content in the prompt is re-read on the server from those
ids. A card id naming something on another composition resolves to nothing
rather than to context, which is specified in the suite because it is the whole
security property: nothing able to write to the page is able to write to the
Librarian's grounding. It is the same seam `referenceObjects` already holds, and
it becomes tenancy enforcement the day Relic grows accounts.

**The conversation is persisted, and that is a security decision before it is a
product one.** The transcript is part of the prompt. Had the browser held it, the
server would have to trust the client's account of what it had previously said —
a direct route for anything that can write to the page to rewrite the Librarian's
instructions. Reading it from Postgres by world id costs one table and closes
that. It is world-scoped rather than composition-scoped because the Librarian is
one presence: moving from the Desk to a Board changes what you are looking at,
not who you are talking to.

**A citation is a number into a list Relic built, and it fails closed.** The
grounding numbers what it names and the Soul asks for `[3]`. A model asked to
quote an identifier will eventually invent one that resolves to nothing; a model
asked for a number can only be right or out of range, and out of range is visible.
Unbacked numbers are dropped rather than repaired — an answer carrying one fewer
source is better than a chip pointing confidently at the wrong thing.

**One numbering per turn, across the brief and every search result.** The Harbour
Guild found by search and the Harbour Guild sitting on the Desk are one identity
and get one number. A second counter would have made the conversation the one
place in Relic where identity is not stable.

**Retrieval is `searchWorld` again.** The Librarian's reach is exactly the GM's
reach — the same ranked index behind global search, the Library, and the
relationship picker. A second retrieval path would have drifted, and the one that
drifted would be the one that could not find something.

**Eyes before hands.** Every tool at this step is a read, so "the Librarian may
never establish Ink" is not a rule the model is asked to keep — it is a
capability it does not have. The Soul states the law anyway, because the model
should be able to explain the boundary it is working inside rather than merely
hit it. Writes, and the authority tiers that go with them, are step 13.

**The carriage sits beside the world and the Inspector moves over.** What the GM
is looking at *is* the subject of the conversation, so a panel covering the canvas
would hide its own context. Two panels sharing the right edge would have made
deepening into an object and asking about it mutually exclusive, which is exactly
the pair a GM wants together. The Library still draws above both, because it is a
different act — looking something up rather than working.

**A route handler rather than a server action, because the answer streams.**
Everything else in Relic commits and returns, and a server action is the right
shape for that. A sentence arriving a word at a time is not. The wire format is
newline-delimited JSON: Relic owns both ends, and SSE's field grammar would be
ceremony over a channel carrying four kinds of event.

**Relic works without a model.** No key means the carriage says so and everything
else behaves normally. The world is the product; a Librarian that could make the
Desk unusable by being unconfigured would have the dependency backwards.

**The Story Kernel is deliberately absent.** `librarian-ux` puts a short living
brief — premise, tone, central forces, dramatic question — between the Soul and
the current view. Relic has nowhere to keep one: there is no record of a world's
premise or direction, and inventing the schema now would mean designing it
against a world with no sessions in it. The seam is the ordering of the context
stack, which is already right, so adding it later is one more section in the
brief rather than a rewrite.

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
Neither implies the other. No truth column goes on a World Object. ~~Today
`truthState` sits on the Fragment, which is a truth unit, so the current schema is
already on the right side of this.~~ **Corrected at step 10** — it was not. There
is one Fragment per object, so that column was already per-object, and a
Fragment's prose is unclassified material whose settledness is exactly maturity.
It was maturity wearing the name of truth, and the card was rendering it as
though the object had a truth state. It now lives on `world_objects.maturity`.

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
