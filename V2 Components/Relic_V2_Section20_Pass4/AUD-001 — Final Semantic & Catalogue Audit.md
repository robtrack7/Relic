---
id: AUD-001
status: active
kind: reference
authority: current
system: SYS-20
storybook: none
depends_on:
- 00-PRODUCT-LAWS
- 00-AUTHORITY-POLICY
---

# AUD-001 — Final Semantic & Catalogue Audit

## Audit basis

Audited the Pass 3 restructured 00–19 catalogue as one product. Older project source documents and superseded per-section audits are historical context, not competing authority.

## Resolved contradictions / stale assumptions

1. **Platform ownership** — Current V2 is the complete web product. Stage remains web-first. Browser-local durable persistence replaces the old current-use Expo SQLite assumption; Expo/SQLite remains a later mobile adapter.
2. **World Object family granularity** — Section 07 now matches the Storybook-first catalogue: concise family packets plus atomic independently rendered projections. Catalogue granularity does not dictate production module granularity.
3. **Sequential-authoring residue** — references to “future/later Librarian/Stage/Review/Chronicle/Settings” were normalized where those systems now exist.
4. **Old MVP label** — active V2 exclusions now say current V2 rather than pointing back to an obsolete MVP planning phase.
5. **Current web interaction** — primary/deep interaction language is expressed for the web; future mobile input mapping is explicitly an adaptation.
6. **Dependency metadata** — generated system/parent backlinks were removed; several core inverted dependencies were corrected. Direct dependencies are one-hop implementation context, not project ordering.
7. **Pass 3 structural cleanup remains valid** — Search/Library Index Projection unification, domain-vs-platform vocabulary, Storybook granular design system, retired legacy workspace terminology and generalized Change Set architecture remain canonical.

## Core semantic consistency confirmed

No unresolved contradiction was found across the following product laws:
- Canvas/Board composition remains separate from persistent world truth.
- World Object identity persists while temporal state and projections change.
- Story time is distinct from edit/audit time; Now excludes Pending.
- Relationship is first-class semantic data but not a World Object.
- Session, Scene/Beat, Session Instance and Encounter Participant retain distinct identity/lifecycle roles.
- Pencil/Ink maturity remains distinct from Proposed/Pending/Settled authority/truth.
- Search finds, Library browses, Librarian reasons/acts.
- AI model calls remain human/workflow initiated and tools execute through validated Relic authority.
- Settlement and Chronicle share one temporal/change-set truth model rather than separate histories.
- settled truth and player publication remain independent.
- manual Relic remains usable when AI is unavailable.

## Intentionally unresolved / prototype decisions

These are **not blockers** and should be tested rather than paper-designed further:
- exact Canvas implementation/library and performance strategy;
- Current Context interaction/details;
- semantic zoom thresholds and resize/disclosure feel;
- some Chronicle projection details;
- Related References block usefulness;
- exact design tokens/typography/palette/elevation/motion values;
- JSONB versus typed domain extension tables;
- temporal snapshot/cache strategy;
- queue/worker topology;
- embedding/chunking/reranking choices;
- exact browser-local persistence library/schema;
- AI model/provider aliases and routing.

## Deferred product scope

Section 16 Player Publication & Permissions remains intentionally deferred. BYOK/local-model configuration is architected but later. Current exclusions such as speaker diarization, real-time transcription, relationship graph, custom calendar engine and automated combat adjudication remain outside current V2 unless deliberately reopened.

## Audit rule going forward

Do not reopen settled product questions during implementation merely because a code abstraction is inconvenient. Likewise, do not preserve a `current` UX/implementation decision when Storybook or integrated manual testing clearly demonstrates a better product answer. Escalate invariants; revise current decisions; freely improve implementation details.
