---
id: SYS-09
status: active
kind: system
authority: current
system: SYS-09
storybook: none
---

# SYS-09 — Search & Library

## Purpose

Owns Relic's direct retrieval and systematic browsing experiences.

Search finds existing material quickly.

Library browses the world's structured knowledge/reference material.

The Librarian is a separate broader system: it reasons, answers questions, creates and manages world content, invokes tools, and proposes/executes changes according to its own autonomy rules.

## Product boundary

The relationship between these systems is:

**Search**
`Find this existing thing or matching passage.`

**Library**
`Show me what exists in this category.`

**Librarian retrieval/Q&A**
`Use authorized world/source context to answer or reason about my question.`

**Librarian world management**
`Create, edit, organize, propose, and manage the world through registered tools and canon safeguards.`

Section 09 defines only the first two plus a narrow context handoff into the Librarian's **retrieval/Q&A path**.

It does not define the Librarian's broader world-management behavior.

## Search rules

- Search is global.
- Current Saga + relevant World is the default scope.
- Sibling Sagas are excluded by default.
- Exact identity wins over vague semantic similarity.
- No Literal/Hybrid user toggle.
- Search uses Now projections.
- Source matches deep-link to exact context.
- Stage uses the same Search with contextual ranking boosts.
- Offline Search can degrade to cached scope.

## Library rules

- Library indexes World Objects + Sources.
- Boards remain Desk-oriented.
- Sessions remain in Sessions.
- Search and Library reuse family Index Projections.
- Library has category browsing, not folders.
- Saved/ad-hoc Library collections remain deferred until a real need is demonstrated.

## Catalogue

### Library

- [[LIB-001 — Library Surface]]
- [[LIB-002 — Library Category Navigator]]
- [[LIB-003 — Library Index Collection]]
- [[LIB-004 — Library Filter Bar]]
- [[LIB-005 — Library Object Actions]]

### Search

- [[SRH-001 — Search System]]
- [[SRH-002 — Quick Search Results]]
- [[SRH-003 — Full Search Surface]]
- [[SRH-004 — Search Result Match Context]]
- [[SRH-005 — Search Scope & Filters]]
