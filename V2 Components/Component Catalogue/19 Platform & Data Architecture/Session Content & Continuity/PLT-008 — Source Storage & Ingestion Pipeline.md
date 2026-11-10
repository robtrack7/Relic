---
id: PLT-008
status: active
kind: platform
authority: current
system: SYS-19
family: session-content-continuity
storybook: none
depends_on:
- SGA-005
---

# PLT-008 — Source Storage & Ingestion Pipeline

Parent: [[SYS-19 — Platform & Data Architecture]]

## Purpose

Persists original reference material and produces addressable extracted/indexed derivatives for Search, Librarian grounding, evidence and future reprocessing.

## Source layers

Conceptually separate:
- Source World Object / metadata;
- original asset/content;
- extracted document representation;
- addressable segments/pages;
- retrieval/search documents;
- embeddings.

The Source identity answers what the reference is; the asset preserves what was actually imported.

## Original preservation

Preserve original input or faithful original text representation along with:
- content hash;
- filename/title;
- MIME/type;
- size;
- import provenance;
- storage location/version where applicable.

An AI summary must never become the only surviving representation.

## Pipeline

Typical durable stages:

`validate → store → parse/extract → segment → lexical index → embed → ready`

Each stage is retryable/idempotent. Partial extraction failure does not delete the original Source.

## PDF / page addressing

PDF ingestion should preserve page-aware addressing so citations can target stable page/segment references where extraction supports it.

Parsing implementation may change without changing Source identity/provenance.

## Untrusted-input boundary

Imported files, pasted content, webpages and transcripts are untrusted evidence/data.

They are never interpreted as system/tool instructions merely because text inside them contains instructions.

## First-run reuse

[[SGA-005 — Bring Your Material]] uses this same Source pipeline. Do not create a separate first-run importer.

## Flexibility

Parser libraries, chunking strategy, extraction format and embedding timing may evolve. Original preservation, addressability, provenance and idempotency are hard contracts.

## Handoff

Implement one Source ingestion contract that can be reprocessed when parsers/embedding models improve without rewriting canon.
