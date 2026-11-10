# Storybook-First UI Workflow

Use this reference for reusable visual components, interaction patterns, and reference scenes.

## Normal workflow

1. Resolve the exact catalogue target.
2. Read only its direct design/behavior dependencies.
3. Inspect existing implementation before inventing a new API.
4. Implement the smallest real component API that supports the authored states.
5. Create/update Storybook stories with realistic Relic fixtures.
6. Manually inspect and use the important states.
7. Adjust a `current` design decision if real use exposes a better answer.
8. Add lightweight interaction/accessibility coverage once behavior is understood.
9. Integrate into the first real consumer.
10. Re-test in the integrated surface or reference scene.

## Story categories

- **primitive** — token, typography, icon, divider, foundation specimen.
- **component** — independently rendered/reusable UI such as Button, Card, row, field, menu.
- **pattern** — composed behavior such as autosave, overlay dismissal, protected action, semantic connect.
- **scene** — integrated reference/workspace composition for product coherence testing.

## Fixtures

Use a small coherent fictional Saga across stories where practical. Avoid lorem ipsum.

Fixtures should make difficult states easy to reach without requiring Supabase, including:

- empty;
- selected;
- disabled;
- error;
- proposed;
- pending;
- historical/as-of;
- recent-change;
- long/truncated content.

Fixtures are not a second domain model. They instantiate the same public component/domain contracts through mock adapters.

## Manual acceptance

Inspect as applicable:

- visual hierarchy and rhythm;
- hover/focus/pressed/selected/disabled states;
- keyboard behavior;
- mouse/trackpad interaction;
- truncation and density;
- wide and constrained web layouts;
- combined Relic states that can coexist;
- motion continuity and reduced-motion behavior.

For Canvas/spatial work, hands-on interaction quality outranks static screenshots.

## Automation after acceptance

After the intended behavior survives manual use:

- add render/smoke coverage;
- accessibility checks;
- Storybook interaction/play tests for meaningful behavior;
- focused unit tests only for logic that benefits from isolation.

Add visual regression only after a baseline is deliberately accepted. Do not fossilize an unfinished design.

## Authority

Storybook owns reproducible rendered states.

The catalogue owns semantics and behavior.

Production code owns implementation.

If integrated use disproves an approved story, fix the shared system or accepted contract rather than adding local CSS exceptions.
