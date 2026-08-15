# Relic V2 — Workspace Bootstrap Prompt

Create a clean **Relic V2 development worktree** from the current repository while preserving V1 and the partial migration as reference.

The goal is to stop treating V2 as a painstaking transformation of every V1 subsystem and instead **build the intended product directly**, porting proven V1 capabilities only when a V2 vertical slice needs them.

## First, establish the workspace

- Inspect the current repo, branch state, and uncommitted work before touching anything.
- Create a clean Git worktree/branch for V2 in a clearly named sibling workspace such as `RELIC-V2`.
- Preserve the existing repo/history and do not delete or rewrite V1.
- Bring these concise V2 guidance files into the new workspace as the primary product direction:
  - `VISION.md`
  - `PRODUCT.md`
  - `INTERACTION.md`
  - `WORLD-MODEL.md`
  - `AI.md`
  - `BUILD.md`
- Keep the existing detailed V2 vision, ADR, fixture, and migration material available as reference, not mandatory per-task reading.

## Simplify agent guidance

Replace the old process-heavy execution model with a small senior-staff model:

- **Orchestrator:** owns direction, sequencing, integration, and difficult architectural calls.
- **Implementation specialists:** own meaningful vertical slices or clearly bounded subsystems.
- **Independent reviewer:** used selectively for security, data integrity, major architecture, and milestone review—not every ordinary change.

For Claude Code, use Opus for orchestration and ambiguous/high-impact engineering. Use Haiku aggressively for bounded research, mechanical work, tests, and low-ambiguity implementation. For Codex or future tools, map equivalent models to the same roles.

Inspect `.codex/agents/`, `.claude/agents/`, `AGENTS.md`, and `CLAUDE.md` for useful role knowledge, but **port the intent rather than preserving tool-specific bureaucracy**. Create or simplify native agents for the new workspace.

## Working rule

Act like senior engineers, not contract executors.

The concise V2 docs define the north star and durable invariants. Existing V1 and migration code are a quarry of proven solutions. Reuse what helps; leave behind compatibility machinery or structure that does not serve V2.

Do not repeatedly stop for documentation, full-suite testing, or review when ordinary engineering judgment is sufficient. Run focused validation while building, subsystem validation at vertical-slice completion, and full gates only at meaningful milestones.

## Then begin

Once the worktree and agent environment are clean and verified, start with the first vertical slice from `BUILD.md`:

**a running V2 shell containing a real infinite Desk where a user can create, edit, move, select, and persist simple Cards.**

Use existing backend work where it genuinely accelerates that slice. Do not port systems merely because they exist.

Make Relic exist.
