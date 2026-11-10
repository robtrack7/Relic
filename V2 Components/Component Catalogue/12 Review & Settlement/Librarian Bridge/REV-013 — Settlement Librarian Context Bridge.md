---
id: REV-013
status: active
kind: behavior
authority: current
system: SYS-12
family: librarian-bridge
storybook: none
depends_on:
- STG-015
- REV-005
- REV-007
---

# REV-013 — Settlement Librarian Context Bridge

Parent: [[REV-002 — Session Settlement Workspace]]

## Purpose

Makes the full Session interpretation, evidence, affected world, exceptions, and settlement state part of the Librarian's operating context so conversational correction becomes the easiest path to fixing mistakes.

## Context supplied

Where authorized/relevant:
- active Session;
- Review Set / Session Change Set;
- recap;
- selected Story Change;
- selected mutation;
- evidence/transcript;
- current canonical target;
- affected World Objects;
- Relationships;
- Session Instances;
- Fragments;
- conflicts/protected flags;
- prep implications;
- settlement status;
- current Settlement Canvas selection.

## Core capabilities

The GM can naturally:
- ask why a change exists;
- request exact evidence/audio;
- correct identity attribution;
- rewrite one Story Change;
- combine/split Story Changes;
- remove unsupported changes;
- add missed Event/Thread/Relationship;
- resolve Session Instance into persistent world identity;
- edit recap;
- add prep implication;
- regenerate selected interpretation;
- settle selected changes or Session where policy allows;
- inspect/revert/correct prior settlement.

These are ordinary Librarian capabilities operating in Settlement context.

## Whole-story correction

A natural-language correction can revise multiple dependent mutations coherently.

Example:
`Mara didn't join the Crown. She only agreed to work for them until the debt was paid.`

The Librarian can update:
- relationship interpretation;
- Character state;
- Event consequence;
- Thread progression;
- recap;

while preserving evidence/audit and leaving unrelated settled truth untouched.

## Workflow origin

Post-session interpretation is valid human-initiated AI work because [[STG-015 — End Session & Undo]] explicitly triggers the configured processing workflow. Opening Settlement or selecting a Story Change does not itself start new model work. Further revision begins from GM instruction or an explicit workflow action.

## Trust boundary

The Librarian may explain, retrieve, edit/regroup proposals, invoke review tools, and perform allowed settlement actions.

It cannot infer Supervised approval from conversational tone. Explicit policy-compliant settlement intent is required.

## Relationships

- [[REV-005 — Settlement Canvas View]]
- [[REV-007 — Change Detail & Inline Edit]]
- [[REV-009 — Settlement Policy & Review Style]]
- Librarian system

## Handoff

Implement **REV-013 — Settlement Librarian Context Bridge** as the semantic correction/settlement context adapter for the core Librarian operating layer.
