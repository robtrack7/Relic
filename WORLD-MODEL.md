# Relic V2 — World Model

Keep the model small and durable. Implementation details may evolve as the product is built.

## World Object

The stable identity seam.

A World Object is one persistent thing in Relic. It keeps the same identity wherever it appears and as it becomes more resolved.

## Fragment

The lightest starting state of an object: captured thought before classification.

A Fragment may later gain richer representations without conversion, duplication, or identity replacement.

## Representation

A useful way to understand or edit a World Object: Character, Place, Faction, Thread, Event, Artifact, Note, or another deliberate domain view.

Representations describe the same object; they are not separate copies of it.

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

**stable identity, intentional truth, provenance, scope, reversibility, and one world seen through many views.**
