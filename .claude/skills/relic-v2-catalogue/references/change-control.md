# Lightweight Change Control

Keep catalogue maintenance proportional to actual product decisions.

## First question

After implementation, ask:

> **Did the observable product/design/domain contract change?**

## No contract change

Do not edit the catalogue.

Examples:

- hook/store refactor;
- package/folder merge;
- SQL index optimization;
- cache implementation change preserving behavior;
- test cleanup;
- performance improvement with no observable semantic change.

## Accepted `current` contract change

Update only:

- the smallest affected catalogue target(s);
- direct `depends_on` metadata if the implementation context truly changed;
- generated index/inventory through the existing cheap registry tooling.

Do not rewrite system summaries or create decision-note prose unless needed.

## Possible invariant change

Do not auto-edit the invariant. Return a concise conflict describing:

- the invariant;
- why current implementation/use challenges it;
- the proposed alternative;
- likely downstream impact.

Let the user/product owner decide.

## Lightweight sync agent

Prefer a low-cost follow-up agent for catalogue sync. Give it only:

- target catalogue ID(s);
- changed code/story files or concise diff summary;
- manual/test outcome;
- explicit implementation decision, if any.

Most tasks should produce zero documentation changes.
