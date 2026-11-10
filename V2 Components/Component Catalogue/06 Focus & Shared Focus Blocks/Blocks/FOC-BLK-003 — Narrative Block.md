---
id: FOC-BLK-003
status: active
kind: component
authority: current
system: SYS-06
family: blocks
storybook: component
depends_on:
- OBJ-010
- FOC-008
- FOC-BLK-014
- DS-FOC
platforms:
- web
---

# FOC-BLK-003 — Narrative Block

Parent: [[SYS-06 — Focus & Shared Focus Blocks]]

## Purpose

Provides the main durable prose/lore section of a Focus surface.

## Use

Examples:
- Character background/summary;
- Place description;
- Faction overview;
- Artifact history;
- Thread premise;
- Event account.

Family composition controls label and placement.

## Anatomy

- section heading where needed;
- rich prose body;
- Inline Object References;
- optional restrained subheadings;
- optional source/provenance cues at meaningful passages.

Avoid turning this into arbitrary page-builder content.

## Appearance & behaviour

Should feel like reading/writing a beautifully typeset notebook or editorial article.

Supports direct rich-text/Markdown-like editing.

Inline references remain natural inside prose.

## Relationships

- [[OBJ-010 — Inline Object Reference]] — embedded World Object links.
- [[FOC-008 — Focus Inline Editing]] — direct prose editing.
- [[FOC-BLK-014 — Sources & Provenance Block]] — deeper evidence.

## Handoff

Build **FOC-BLK-003 — Narrative Block** as the primary editorial prose block for durable Focus content.
