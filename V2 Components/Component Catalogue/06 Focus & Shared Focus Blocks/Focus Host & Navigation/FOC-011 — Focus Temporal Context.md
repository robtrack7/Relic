---
id: FOC-011
status: active
kind: behavior
authority: current
system: SYS-06
family: focus-host-navigation
storybook: none
depends_on:
- OBJ-009
- REV-006
- CHR-011
- DS-FOC
---

# FOC-011 — Focus Temporal Context

Parent: [[FOC-001 — Focus Host]]

## Purpose

Ensures historical/as-of Focus genuinely projects the focused World Object at the selected story position and cannot be mistaken for Now.

## Interaction

Focus may open historically from:
- Chronicle;
- historical Event;
- as-of Librarian request;
- temporal deep link;
- history inspection.

When historical context is active:
- [[OBJ-009 — Historical & As-Of Indicator]] remains visible;
- temporally aware blocks resolve to the selected story position;
- durable/non-temporal material remains stable as appropriate;
- `Return to Now` is available in deep contexts.

## Temporal blocks

Depending on family, temporal projection may affect:
- status;
- location;
- goals/motives;
- allegiance;
- relationships;
- knowledge/beliefs;
- holdings;
- Thread state;
- other narratively meaningful state.

Family/domain rules determine what is temporal rather than treating every field as versioned.

## Editing boundary

Default historical Focus is safe/read-first.

Normal inline editing must not silently overwrite present state while historical context is active.

Editing historical canon, if supported, requires an explicit temporal editing action that clearly identifies the story position being changed.

## Recent change trace

During/after Session settlement, Focus sections can expose [[REV-006 — Recent Change & Temporal Trace]] for fields/blocks that changed.

The cue remains subtle and progressive:
- section mark;
- Session/source label on inspection;
- before/after detail on activation.

Pending interpretation must never look identical to settled state.

## Temporal editing semantics

Historical editing follows [[CHR-011 — Historical Editing, Correction & Retcon]]. End, Correct, and Retcon are different intents; ordinary historical Focus remains read-first.

## Relationships

- [[OBJ-009 — Historical & As-Of Indicator]] — visible temporal cue.
- [[CHR-004 — Chronicle Workspace State]] — major historical entry point.
- [[CHR-003 — Temporal Resolver & Now Projection]] — resolves as-of state.
- [[FOC-008 — Focus Inline Editing]] — constrained in historical mode.

## Handoff

Implement **FOC-011 — Focus Temporal Context** as the explicit as-of projection and editing-safety layer for Focus.
