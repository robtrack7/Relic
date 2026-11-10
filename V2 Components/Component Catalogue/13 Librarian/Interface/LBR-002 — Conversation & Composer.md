---
id: LBR-002
status: active
kind: component
authority: current
system: SYS-13
family: interface
storybook: component
depends_on:
- OBJ-010
- LBR-003
- LBR-004
platforms:
- web
---

# LBR-002 — Conversation & Composer

Parent: [[LBR-001 — Librarian Carriage]]

## Purpose

Provides the natural-language interaction surface for questions, creation, editing, navigation, composition, live Session work, and Settlement correction.

## Conversation presentation

Use compact editorial conversation rather than generic chat UI. Messages can contain natural prose, [[OBJ-010 — Inline Object Reference]], citations, proposal previews, semantic action results, and concise progress summaries.

## Composer behaviour

The composer inherits current semantic context. The GM should be able to write `What does she know about the Crown?` when Mara / Knowledge is already the active context.

Keep the multiline composer at the carriage bottom while the conversation scrolls independently. Enter sends, Shift+Enter adds a line, and Ctrl/Cmd+Enter also sends; text composition must not submit. Show opening, idle, submitting, and unavailable states with a visible context summary. Drafting remains available while a request runs or AI is unavailable; sending requires an available, idle Librarian and nonblank text.

Interrupted requests retain the question when no newer draft exists, preserve partial results and reported changes, and allow a deliberate new send. Never retry a request automatically.

## Intent types

One composer handles questions, navigation, retrieval, Canvas composition, World creation/editing, Session preparation, live Stage operations, and Settlement correction. Do not add Ask/Create/Edit/Agent mode switches.

## Examples

- `What happened to the Iron Deed?`
- `Open Mara’s mechanics.`
- `Arrange these by faction.`
- `Create a dockworker named Orin who owes Seraphine money.`
- `Make her motivation more conflicted.`
- `Add those three to the Audience.`
- `Add four goblins to the encounter.`
- `No, Mara never joined the Crown. Fix that interpretation.`

## Relationships

- [[LBR-003 — Context Scope & Inspector]]
- [[LBR-004 — Grounded Answer & Citation]]
- [[LBR-009 — Intent, Authority & Autonomy Gate]]
- [[LBR-010 — Action Planning & Change Sets]]

## Handoff

Build **LBR-002 — Conversation & Composer** as one context-aware natural-language surface over all Librarian capabilities.
