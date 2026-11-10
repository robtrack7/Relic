# Relic V2 agent router

Relic is a web-first spatial workspace for GMs to create, remember, prepare, play, and advance persistent fictional worlds. The same world moves through Desk, Boards, Focus, Prepare, Stage, Settlement, and Chronicle, with the Librarian acting as a contextual AI operating layer. The Canvas is a view, not the database; identity persists, state is temporal, and presentation is projected.

## Authority

- Current V2 sources and the canonical Component Catalogue supersede historical Relic material.
- Product Laws are invariants. Stop and surface a conflict before weakening one.
- Catalogue entries with `authority: current` are strong defaults. Challenge them when implementation or manual testing produces clear evidence for a better product answer.
- Entries with `authority: implementation` are flexible. Preserve the contract and use ordinary engineering judgment.
- Never mirror catalogue Markdown mechanically into code structure.

The canonical index is:

`V2 Components/Component Catalogue/00 Catalogue/00 — Catalogue Index.json`

Use `.claude/skills/relic-v2-catalogue/scripts/catalogue.py` for deterministic lookup. Historical, backup, pass, V1, and quarry material are never current authority.

## Default context route

1. Understand the task.
2. Inspect the relevant code before deciding architecture.
3. Locate the exact catalogue target by ID, name, or keyword.
4. Load that target and its direct `depends_on` entries once; do not recurse.
5. Invoke only the specialist skills relevant to the task.
6. Load broader current V2 source docs only when the exact contracts and code are insufficient.
7. Implement and verify the smallest useful increment.

Use lazy context. Never load a whole catalogue section, skill reference tree, or source pack when an exact target will do.

## Task routing

- Button, Divider, Field, or another component: `relic-ui` plus the exact design-system contract.
- Canvas: `relic-ui`, `relic-ux`, and only the exact Canvas contracts.
- Backend, persistence, auth, or RLS: exact domain/platform contracts and current code/migrations.
- Librarian: Librarian/AI contracts only.
- Session or Stage: Session/Stage contracts only.
- Temporal or Settlement: temporal/Settlement contracts only.
- Scope or a genuinely new-system decision: Product Laws plus Scope.

Do not load auth, Librarian, temporal, or general project context for unrelated component work. Use `relic-map` only when a precise code-location question is not answered by inspecting the relevant code.

## Build and verify

- Build the smallest manually testable increment.
- Use Storybook first for reusable or rendered UI.
- Test manually early; automate confirmed behavior afterward.
- Build infrastructure only when the next real experience needs it.
- Avoid unnecessary plans, reports, status docs, work ledgers, and housekeeping.
- Do not begin adjacent features just because their contracts were discovered.

## Delegation

The primary agent owns planning, integration, architecture, and final verification.

Work directly for search/grep, catalogue lookup, small or sequential edits, and work where delegation costs more than execution.

- Use `gpt-5.6-luna` with high reasoning for one bounded independent Storybook component, focused tests, a contained refactor, an accessibility review, or another isolated implementation task.
- Use `gpt-5.6-luna` at the smallest practical reasoning level for tiny housekeeping or catalogue/doc sync.
- Use `gpt-5.6-terra` or `gpt-5.6-sol` for genuinely complex independent workstreams that require broad reasoning or multiple coordinated steps.
- Use multiple agents only for meaningfully independent parallel work. Avoid overlapping file ownership.
- Do not spawn a context scout by default. Use deterministic lookup first; a tiny Luna scout is allowed only when ownership or context is genuinely unclear.

Subagent handoffs are terse:

- changed;
- files;
- tests;
- blockers or decisions.

## Documentation sync

Update the catalogue or current docs only when implementation changes observable product behavior, a product decision, ownership/dependencies, status, or an invariant.

Prefer a tiny Luna housekeeping pass given only the affected IDs/files and the accepted decision. Most implementation tasks should produce zero documentation changes.

## Operating loop

Small persistent map → exact task context → relevant skill → smallest useful execution → manual verification → focused automation → almost no housekeeping.
