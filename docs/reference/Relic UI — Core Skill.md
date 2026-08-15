# Moved

This file has been superseded. The UI and UX direction for Relic V2 now lives in
two skills vendored into the repository:

- [`.claude/skills/relic-ui/SKILL.md`](../../.claude/skills/relic-ui/SKILL.md) —
  visual language, tokens, card and component contracts, canvas feel, motion.
- [`.claude/skills/relic-ux/SKILL.md`](../../.claude/skills/relic-ux/SKILL.md) —
  interaction semantics, state, attention, authority, temporal behaviour, flow.

Each has a `references/` directory loaded only when a decision needs that depth.

Claude Code discovers them automatically. Codex and other agents should read
`.claude/skills/relic-ui/SKILL.md` before user-facing design work, and one
reference file when the work goes deep. Do not read the whole tree per task.

This file and `visual-language.md` are kept only as redirects.
