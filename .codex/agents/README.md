# Relic V2 agents (Codex)

These mirror `.claude/agents/` one-to-one. `AGENTS.md` is the shared contract; these files only bind a role to a model tier and a short prompt.

| Codex agent | Claude agent | Tier |
| --- | --- | --- |
| `relic_implementer` | `relic-implementer` | strong |
| `relic_reviewer` | `relic-reviewer` | strong |
| `relic_scout` | `relic-scout` | fast |
| `relic_mechanic` | `relic-mechanic` | fast |
| `relic_runner` | `relic-runner` | fast |

The orchestrator is the driving session itself, on the strongest available model. There is no orchestrator agent file.

`relic-test-author` has no separate Codex file — dispatch `relic_mechanic` with a test-writing packet, or fold it into the implementer's slice.

## Model ids

The `model` values here are the ids this project last used. **Update them when the available models change** — the tier matters, the id does not. Strong tier = the best reasoning model available. Fast tier = the cheapest model that can follow a fully specified packet; the low reasoning effort is the tiering, and a genuinely smaller model is better if one exists.

Keep the two agent directories semantically equivalent. A change to a role's authority or boundaries belongs in both, or in neither.
