---
id: OBJ-007
status: active
kind: component
authority: current
system: SYS-03
family: shared-projection-components
storybook: component
depends_on:
- OBJ-008
- DS-OBJ
platforms:
- web
---

# OBJ-007 — Object Maturity Treatment

Parent: [[OBJ-001 — World Object Representation Framework]]

## Purpose

Communicates whether a World Object is still developing as **Pencil** or is substantially settled as **Ink**.

Maturity is a creative-workflow signal. It is not a truth badge.

## Use

Pencil can describe material that is newly captured, incomplete, unresolved, AI-developed but unsettled, or deliberately rough.

Ink indicates that the object itself has reached a settled authored maturity.

Individual claims, Relationships, Events, and Sources can still have their own truth/provenance status independently of the object's maturity.

## Appearance & behaviour

Keep the treatment subtle and compatible with Relic's editorial language.

Possible expressions include:
- restrained line/edge treatment;
- a tiny Pencil/Ink mark or label;
- slightly rougher/dashed presentation in compact contexts.

Do not use large `DRAFT` badges, green=true language, or treatments that make Pencil material look temporary or unsafe.

## States & variants

- Pencil;
- Ink;
- explicit transition-to-Ink state where the hosting surface exposes that action.

## Relationships

- World Object family projections — consume this treatment.
- claim/truth model — separate concern.
- [[OBJ-008 — Object Provenance Cue]] — separate origin/evidence concern.

## Data / utility relationship

Reads object-level maturity only and never infers claim truth from it.

## Handoff

Build **OBJ-007 — Object Maturity Treatment** as the shared subtle Pencil/Ink language while keeping maturity distinct from truth, provenance, visibility, and authorship.
