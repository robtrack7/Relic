# Relic V2 agents (Codex)

`AGENTS.md` is the shared router. These files bind a few reusable bounded roles to current model ids; the primary session still owns architecture and integration.

| Codex agent | Claude agent | Tier |
| --- | --- | --- |
| `relic_implementer` | `relic-implementer` | `gpt-5.6-luna`, high |
| `relic_reviewer` | `relic-reviewer` | `gpt-5.6-terra`, high |
| `relic_scout` | `relic-scout` | `gpt-5.6-luna`, low |
| `relic_mechanic` | `relic-mechanic` | `gpt-5.6-luna`, low |
| `relic_runner` | `relic-runner` | `gpt-5.6-luna`, low |

There is no orchestrator agent file. For a genuinely complex independent workstream, dispatch an available `gpt-5.6-terra` or `gpt-5.6-sol` agent explicitly.

`relic-test-author` has no separate Codex file — dispatch `relic_mechanic` with a test-writing packet, or fold it into the implementer's slice.

Do not dispatch a scout by default. Search and catalogue lookup stay with the primary agent unless ownership is genuinely unclear.
