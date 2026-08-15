# Relic V2 — how we work

This is the tool-neutral contract for anyone (human or agent) building Relic V2.

## Direction

Read these first. They are short on purpose and they are the north star:

| File | What it settles |
| --- | --- |
| [`VISION.md`](VISION.md) | Why Relic exists and how it should feel |
| [`PRODUCT.md`](PRODUCT.md) | The pieces — Desk, World Objects, Cards, Boards, Focus, Librarian, Prep, Stage |
| [`INTERACTION.md`](INTERACTION.md) | Spatial canvas model, Focus, Librarian carriage, responsive parity |
| [`WORLD-MODEL.md`](WORLD-MODEL.md) | Identity, Fragments, Representations, Ink/Pencil, provenance, composition, change sets |
| [`AI.md`](AI.md) | What the Librarian knows, what it may do, what it may never do |
| [`BUILD.md`](BUILD.md) | Build order, working style, validation levels |
| [`docs/reference/Relic UI — Core Skill.md`](docs/reference/Relic%20UI%20%E2%80%94%20Core%20Skill.md) | The look and feel: north star, core laws, palette, typography, decision test |

The UI core skill is direction, not reference — read it before any user-facing
design or interaction decision. Its companion
[`visual-language.md`](docs/reference/visual-language.md) goes deeper on Cards,
spatial behaviour, the Librarian carriage, Stage, and density; read that one only
when the decision needs it. `docs/reference/UI Concept Direction/` holds concept
renders of where this is going.

Everything else under `docs/reference/` is **reference, not required reading**. Consult it when you need it; do not read it per task.

## Durable invariants

These are the things that are expensive to get wrong. Everything else is ordinary engineering judgment.

1. **Stable identity.** A World Object keeps one identity wherever it appears and as it becomes more resolved. Deepening a Fragment into a Character never creates a new thing.
2. **Compositions never own truth.** Desk, Board, Prep, and Session views hold references plus layout, grouping, ordering, annotation, and focus. Moving, grouping, or deleting a composition never changes world content.
3. **Ink is deliberate.** Ink is established only by an explicit, previewed GM action. Typing, pasting, importing, capture, transcripts, and model output produce Pencil. The Librarian may never establish Ink.
4. **Provenance survives.** An assertion records why Relic believes it. Pencil may change when its evidence changes; Ink is never silently rewritten by inference.
5. **One intent, one change set.** A semantic user or Librarian intent commits as one coherent operation and, where practical, undoes as one.
6. **Truth cues are never colour alone.** Ink, Pencil, disputed, and hidden states read through text plus shape or icon.
7. **Workflow parity on narrow screens.** Not canvas parity — every core path stays usable without pointer-dependent spatial manipulation.

If a change would break one of these, stop and escalate. If it would not, decide it yourself.

## Roles

**Orchestrator.** Owns direction, sequencing, integration, and difficult architectural calls. Chooses the next vertical slice, decides what gets ported from V1, holds the integration gate. Makes architecture decisions; specialists do not.

**Implementation specialist.** Owns a meaningful vertical slice or a clearly bounded subsystem — UI, data, and its own focused tests together. Works within the slice, uses judgment inside it, and stops rather than silently redesigning something outside it.

**Independent reviewer.** Used *selectively* — security, tenancy and authorization, data integrity, truth/Ink semantics, major architecture, and milestone review. Reviews work it did not implement and is not asked to repair it. Not used for ordinary changes.

### Model mapping

| Role | Claude Code | Codex / other |
| --- | --- | --- |
| Orchestrator | Opus | strongest reasoning model |
| Implementation specialist (ambiguous or high-impact) | Opus | strongest reasoning model |
| Implementation specialist (bounded, decided) | Haiku | fast/cheap model |
| Bounded research, mechanical edits, tests, command runs | Haiku | fast/cheap model |
| Independent reviewer | Opus | strongest reasoning model |

Use Haiku aggressively. A Haiku packet must have a checkable answer and no open judgment. If a Haiku worker reports its packet contained a decision, that is a correct refusal — re-scope it, do not re-run it.

## Working rule

Act like senior engineers, not contract executors.

- V1 and the partial migration are a **quarry of proven solutions**, not a specification. Reuse what genuinely accelerates a V2 slice. Leave behind compatibility machinery and structure that does not serve V2.
- Prefer simple implementations that can evolve over speculative infrastructure.
- Escalate only what materially affects product direction, security, data integrity, or expensive-to-reverse architecture.
- Update docs when a durable decision changes — not as a per-task ritual.
- Do not create session logs, delivery logs, or parallel source maps.

## Validation levels

**During implementation** — focused checks for the code you are changing.
**At vertical-slice completion** — the subsystem suite, typecheck, build, and the feature exercised in a browser.
**At real milestones** — full repository, migration, security, and end-to-end gates.

Testing exists to enable confident movement, not to replace it.

## Commands

Node 22+ and `pnpm@10.11.0`. `pnpm` is not on PATH on this host; call it through `npx`.

```bash
npx pnpm@10.11.0 install
```

```bash
npx pnpm@10.11.0 dev
```

```bash
npx pnpm@10.11.0 test
```

```bash
npx pnpm@10.11.0 lint
```

```bash
npx pnpm@10.11.0 build
```

## Layout

```
VISION/PRODUCT/INTERACTION/WORLD-MODEL/AI/BUILD.md   product direction
apps/web/                Next.js App Router client (the whole product today)
  app/                   routes and server actions
  components/desk/       canvas, cards, selection, editing
  lib/world/             World Object + composition domain and repository port
  lib/desk/              canvas math, viewport, interaction state
  tests/                 vitest
docs/reference/          long-form vision, precedents, V1 quarry index
```

`docs/reference/V1-QUARRY.md` indexes what lives in the V1 worktree and what is worth taking from it.
