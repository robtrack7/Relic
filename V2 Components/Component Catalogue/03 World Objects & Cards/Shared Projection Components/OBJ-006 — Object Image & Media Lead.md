---
id: OBJ-006
status: active
kind: component
authority: current
system: SYS-03
family: shared-projection-components
storybook: component
depends_on:
- DS-OBJ
platforms:
- web
---

# OBJ-006 — Object Image & Media Lead

Parent: [[OBJ-001 — World Object Representation Framework]]

## Purpose

Defines shared behavior for a World Object's primary visual material across projections without requiring every object to have an image.

## Context & placement

Used by image-forward components such as Character, Place, and Artifact Cards and Focus identities.

Deep galleries, source lists, and multiple media assets belong in reusable Focus media blocks rather than this lead component.

## Anatomy

- primary image;
- crop/focal treatment;
- loading state;
- failed-image state;
- no-image collapse behavior;
- optional swap/edit affordance in editable contexts.

No-image state must collapse cleanly rather than reserve a blank media rectangle.

## Appearance & behaviour

Images should feel like meaningful world material, not generic decorative thumbnails.

Support representation-specific aspect/crop choices while preserving the same focal region where possible.

Transitions between Card, Expanded Card, and Focus should preserve image continuity where the family design supports it.

## Relationships

- [[OBJ-003 — Representation Transition Coordinator]] — visual continuity.
- [[OBJ-004 — Object Identity Lockup]] — may integrate image and name.
- Image / Media Focus Block — deeper media/gallery content.

## Data / utility relationship

Reads the object's declared primary media reference and display metadata. Uploading, processing, and ingestion are owned elsewhere.

## Handoff

Build **OBJ-006 — Object Image & Media Lead** as shared primary-image behavior that supports image-led and image-less projections equally well.
