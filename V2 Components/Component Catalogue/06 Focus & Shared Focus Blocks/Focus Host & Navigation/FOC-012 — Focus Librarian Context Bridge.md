---
id: FOC-012
status: active
kind: behavior
authority: current
system: SYS-06
family: focus-host-navigation
storybook: none
depends_on:
- LBR-001
- FOC-010
- DS-FOC
---

# FOC-012 — Focus Librarian Context Bridge

Parent: [[FOC-001 — Focus Host]]

## Purpose

Supplies the Librarian with authorized semantic context from the active Focus without placing redundant AI action blocks throughout the Focus document.

## Context supplied

Where authorized and useful:
- focused World Object identity;
- family/type;
- active story position;
- active Session/Stage state;
- current Focus section;
- selected nested item such as a Relationship, Knowledge entry, Event, or Mechanics ability;
- relevant Sources available to retrieval.

Context is semantic rather than a raw screenshot/page dump.

## Interaction

The GM can open or use Librarian normally while Focus remains central.

Examples:
- Character / Knowledge → `What does she know about the Crown?`
- Place / History → `When was this bridge destroyed?`
- Artifact / Mechanics → `What rule applies to this property?`
- Character / Relationships → `How has her relationship with Mara changed?`

Results remain Librarian output unless the GM deliberately captures/applies them.

## Boundaries

There is no persistent `Librarian Actions Block` in every Focus.

AI does not receive unauthorized GM/player-separated material.

The bridge supplies context; Librarian owns the conversation, retrieval, tools, and proposed actions.

## Relationships

- [[LBR-001 — Librarian Carriage]] — consumer of Focus context.
- [[FOC-010 — Focus Anchor & Deep Link]] — current section/item identity.
- object/permission systems — authorize contextual data.

## Model-call boundary

Opening Focus, changing Focus section, or selecting nested content updates Librarian context deterministically. These changes do not trigger model work by themselves.

## Handoff

Implement **FOC-012 — Focus Librarian Context Bridge** as the semantic context handoff from Focus to the persistent Librarian Carriage.
