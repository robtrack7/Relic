---
id: PLT-009
status: active
kind: platform
authority: current
system: SYS-19
family: ai-retrieval-async
storybook: none
---

# PLT-009 — Search Indexing & Retrieval

Parent: [[SYS-19 — Platform & Data Architecture]]

## Purpose

Implements one authorized hybrid retrieval substrate with distinct contracts for human Search and Librarian/task grounding.

## Public contracts

**Search UI contract**
Optimized for speed, exact identity, snippets, filters, Stage boosts and user navigation.

**Task retrieval contract**
Optimized for grounding, richer evidence/provenance, task profiles and temporal context.

Do not make the UI Search response shape the AI grounding contract.

## Query precedence

Prefer the database's strongest source of truth:
1. exact identity / structured domain lookup;
2. temporal resolver / structured historical query;
3. lexical search;
4. semantic/vector retrieval;
5. fusion/reranking when helpful.

Do not use vector search to guess answers that structured temporal/domain data can resolve exactly.

## Scope inputs

Retrieval should carry explicit authorization/context such as:
- Workspace;
- World;
- Saga;
- Story Position;
- allowed truth layers;
- allowed resource types;
- active Session context where relevant.

## Truth boundary

Ordinary Search defaults to current settled truth.

Prepare/Settlement may explicitly include Pending context with clear state labels.

Session Instances may be searchable in relevant Session scopes without becoming Library World Objects.

## Hybrid index

Maintain lexical and pgvector-capable derived documents where useful. Exact fusion algorithm/weights are tunable implementation details.

## Embedding contract

Embeddings are:
- derived;
- rebuildable;
- model/version tagged;
- visibility/RLS scoped;
- never canonical.

Private GM material may be indexed only inside an authorized corpus whose rows enforce the same access boundary. Future Player retrieval uses a narrower authorized corpus, never prompt filtering.

## Citation safety

AI-visible retrieved evidence receives stable source IDs/anchors. Server-side validation rejects citations that were not in the authorized supplied context.

## Evaluation

Maintain a frozen synthetic retrieval Saga covering:
- exact lookup;
- semantic recall;
- source/page citation;
- temporal query;
- sibling-Saga exclusion;
- GM-private content;
- future player-safe retrieval.

## Flexibility

Chunking, embedding model, fusion constants, index schemas and reranking may evolve behind the stable Search/Task Retrieval contracts.

## Handoff

Build retrieval APIs around authorization + temporal scope first; tune semantic retrieval against evaluation data rather than intuition.
