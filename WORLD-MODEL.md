# Relic V2 — World Model

Keep the model small and durable. Implementation details may evolve as the product is built.

## World Object

The stable identity seam.

A World Object is one persistent thing in Relic. It keeps the same identity wherever it appears and as it becomes more resolved.

## Fragment

The lightest starting state of an object: captured thought before classification.

A Fragment may later gain richer representations without conversion, duplication, or identity replacement.

## Representation

A useful way to understand or edit a World Object: Character, Place, Faction, Thread, Event, Artifact, Source, Note, or another deliberate domain view.

Representations describe the same object; they are not separate copies of it.

A representation may carry a **mechanical sheet** — the rules data a game cares
about, such as ability scores. That is not a truth unit: nobody disputes a
Dexterity score or cites a source for it, and it does not change because of what
happened in the fiction. Narrative attributes that *do* — occupation, allegiance,
location, status — are Claims.

## Truth units

Facts live in independently addressable:

- Claims;
- Relationship assertions;
- Events.

Truth is primarily:

- **Ink** — deliberately established;
- **Pencil** — provisional, inferred, speculative, or unresolved;
- **Disputed** — explicitly contested.

Authorship, provenance, visibility, truth, and lifecycle remain separate concerns.

### Maturity is not truth

A World Object carries **maturity** — Pencil while unsettled, Ink once
substantially settled. A truth unit carries **truth**. They are different axes
and neither implies the other: a Pencil Character may hold established claims, an
Ink Character may hold disputed ones.

Do not put a truth column on a World Object. Truth belongs to the addressable
unit that asserts something.

### Claims are assertions, not cells

A claim is something asserted at a point in story time, not a mutable field. Two
claims of the same kind about the same subject may both be true at different
story positions, and the value Relic shows is a projection: the latest claim at
or before the position being viewed.

Correcting a claim replaces it; recording that the world changed appends a new
one. Never enforce one claim per subject per kind — that constraint is the
temporal axis being quietly removed.

## Story time

**Identity is permanent. State is temporal. Presentation is projected.**

Mara in Session 4 and Mara now are the same identity at two story positions.
Meaningful change is retained, not overwritten.

Two clocks, never conflated:

- **Story time** — when something was true in the fiction.
- **Transaction time** — when Relic recorded or corrected it.

A retcon entered today may change what was true years earlier while the audit
still records that the edit happened today.

Relic keeps a fast **Now projection** for Desk, Library, Stage, and ordinary
Librarian work, with story history retained beneath it. This is *not* event
sourcing — Now is materialized, and historical state is reconstructed only when
asked.

Only narratively meaningful state is temporal: location, status, office,
allegiance, holder, significant conditions and goals, relationships, and
character knowledge. Story position tolerates uncertainty — `before Session 4` is
a valid position and must not be resolved into an invented date.

Deep guidance lives in
[`.claude/skills/relic-ux/references/temporal-chronicle.md`](.claude/skills/relic-ux/references/temporal-chronicle.md).
Read it before schema work in this area.

## Source and provenance

Important world assertions should retain why Relic believes them: source material, author, session evidence, Librarian inference, or deliberate GM action.

Pencil may change when its evidence changes. Ink must never be silently rewritten by inference.

## Composition

Desk, Board, Prep, and Session views reference World Objects.

They may own layout, ordering, grouping, annotations, focus, and filters.

They **never own copied world truth**.

## Change set

One semantic user or Librarian intent should commit as one coherent operation and, where practical, undo as one coherent operation.

## Guiding rule

Prefer the simplest data model that preserves:

**stable identity, intentional truth, provenance, scope, reversibility, story time, and one world seen through many views.**
