---
id: 00-CATALOGUE-MAP
status: active
kind: reference
authority: current
storybook: none
depends_on:
- 00-PRODUCT-LAWS
- 00-AUTHORITY-POLICY
- 00-REG-SCHEMA
---

# Catalogue Map

The skill embeds this topology, not the full component inventory. Open the exact target file and only direct dependencies needed for the task.

## Systems

- **SYS-01 — App Shell & Navigation** — Locked Global App Shell registry section.
- **SYS-02 — Desk & Boards** — The Desk is Relic's default spatial working environment. The Canvas renders remembered Board compositions of persistent World Objects plus composition-only material. This folder owns spatial interaction, Board composition, and Desk-specific chrome; World Objec
- **SYS-03 — World Objects & Cards** — World Objects are persistent fictional identities whose narratively meaningful state can change over story time and whose presentation changes by surface, task, disclosure, and spatial scale.
- **SYS-04 — Characters** — Character is the reference implementation for rich World Object families. One persistent identity is projected through separately coded spatial, retrieval, preparation, Stage-navigation, temporal, and Focus representations.
- **SYS-05 — Mechanics & Rules** — Relic mechanics use one modular engine with curated first-party templates and GM-created/derived templates. Character Focus remains designed by Relic; only the mechanics block is initially customizable.
- **SYS-06 — Focus & Shared Focus Blocks** — Focus is Relic's shared deep-object workspace infrastructure.
- **SYS-07 — World Object Families** — Contains the canonical implementation specifications for Place, Faction, Artifact, Thread, Event, Source, and Fragment. Character remains the reference exemplar in Section 04. Section 03 owns shared World Object representation infrastructure. Section 06 owns s
- **SYS-08 — Relationships** — Owns Relic's meaningful semantic connections between World Objects, including predicate vocabulary, creation/editing, Focus rows, Canvas projections, temporal history, provenance, AI proposals, and shared relationship resolution.
- **SYS-09 — Search & Library** — Owns Relic's direct retrieval and systematic browsing experiences. Search finds existing material quickly. Library browses the world's structured knowledge/reference material. The Librarian is a separate broader system: it reasons, answers questions, creates a
- **SYS-10 — Sessions & Prepare** — Owns Session lifecycle, the durable Sessions destination, and the Prepare workspace state that bridges the living world into live play.
- **SYS-11 — Stage** — Owns live Session operation: workspace state, carriage, Canvas attention, scenes, entity rail, capture/recording, dice, system-flexible Encounter Flow, Session Instances, optional live mechanics, Librarian context, and End Session boundary.
- **SYS-12 — Review & Settlement** — Owns the post-session trust loop: interpret what happened, show the resulting world change coherently, let the GM correct misunderstandings effortlessly, settle according to autonomy policy, and carry trusted state into the next Session.
- **SYS-13 — Librarian** — Defines Relic’s persistent AI operating layer across the world, workspace, Sessions, Stage, Settlement, retrieval, and semantic tools.
- **SYS-14 — Chronicle & Temporal Model** — Owns Relic's story-time model and Chronicle lens: how identity persists while state changes, how Now and historical/as-of projections resolve, how settled/pending/corrected truth is distinguished, and how story history remains separate from edit/audit history.
- **SYS-15 — Saga Creator & First Run** — Owns the shortest trustworthy path from no Saga to a useful real Desk and then into Session 1.
- **SYS-16 — Player Publication & Permissions** — Defines the future player-facing publication and access contract without making player features a prerequisite for completing Relic's core GM loop.
- **SYS-17 — Settings Account & AI Configuration** — Defines the configuration surfaces for personal preferences, account/workspace usage, Saga behavior, Librarian authority, recording/privacy, data ownership, and AI connections without turning Settings into a second application.
- **SYS-18 — Relic Design System** — Defines the living visual/component system used to design and manually test Relic on the web before and during integration. Storybook is the primary component workshop and reproducible visual test fixture layer.
- **SYS-19 — Platform & Data Architecture** — Defines the engineering contracts that make Sections 01–18 true under real database writes, AI calls, retries, offline play, imports, temporal corrections, usage limits and future player access.
- **SYS-20 — Catalogue Audit & Implementation Plan** — Defines how Codex/Claude retrieves, implements, manually tests and evolves the catalogue without treating current implementation guesses as invariants.

## Retrieval rule

`global laws/map → exact target → direct dependencies → applicable design/platform contract → inspect current code → build/test`

Do not recursively crawl wikilinks or load an entire system by default. The generated JSON index is the full searchable inventory.
