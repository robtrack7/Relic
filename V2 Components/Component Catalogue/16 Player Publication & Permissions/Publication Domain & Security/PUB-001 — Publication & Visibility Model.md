---
id: PUB-001
status: deferred
kind: domain
authority: current
system: SYS-16
family: publication-domain-security
storybook: none
depends_on:
- FOC-BLK-015
---

# PUB-001 — Publication & Visibility Model

Parent: [[SYS-16 — Player Publication & Permissions]]

## Purpose

Defines publication as a visibility grant over settled world material rather than a duplicated player copy of an object.

## Independent dimensions

Truth state and visibility state are separate.

**Truth** may be:
- pending;
- settled;
- corrected/reverted.

**Visibility** initially may be:
- GM-only;
- published to all players in the Saga.

Settlement never implies publication.

## Projection rule

A published Character, Place, Faction, Artifact, Thread, or Event continues to reference the same persistent identity used by the GM experience.

Do not create `player_character`, `player_place`, or other duplicated mirrors merely to support publication.

## Granularity

The architecture should allow family-defined publishable blocks/fields rather than only whole-object yes/no visibility.

The initial UX may use sensible family presets to avoid permission micromanagement.

## Continuing grant versus frozen artifact

**Published World Object projection**
A continuing visibility grant over selected current settled content. Later edits to published-safe content can flow through the same grant.

**Published recap/handout artifact**
A versioned/frozen publication artifact with its own published text/version.

Do not collapse these into one model.

## Hard privacy exclusions

Generic publication must never implicitly expose:
- [[FOC-BLK-015 — GM Notes Block]];
- pending proposals;
- raw AI drafts;
- raw transcripts;
- private Source contents;
- unpublished Knowledge/secrets;
- other data explicitly marked structurally private.

## Handoff

When implemented, model publication as visibility over canonical identities plus separate versioned publication artifacts where freezing is required.
