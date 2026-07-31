import test from "node:test";
import assert from "node:assert/strict";
import { callAiProvider } from "../supabase/functions/_shared/ai-provider.ts";
import { validateTaskOutput } from "../supabase/functions/_shared/ai-schemas.ts";

const source = "e4060000-0000-0000-0000-000000000001";
const outside = "e4060000-0000-0000-0000-000000000099";
const baseRun = {
  id: "e4200000-0000-0000-0000-000000000001",
  workspace_id: "e4010000-0000-0000-0000-000000000001",
  world_id: "e4020000-0000-0000-0000-000000000001",
  saga_id: "e4030000-0000-0000-0000-000000000001",
  session_id: "e4040000-0000-0000-0000-000000000001",
  gm_id: "e4000000-0000-0000-0000-000000000001",
  prompt_version: "e4@1.0.0",
  quota_tier: "light",
  ai_credits: 1,
  model_tier: "relic-fast",
  retrieval_profile: "session_prep_grounding",
  source_policy: "canon_only",
  output_mode: "ephemeral",
  input_payload: {},
  allowed_source_ids: [source],
  retrieval_context: [{ source_id: source, text: "The Lantern Court is pressuring the harbor watch." }]
};
const testConfig = {
  mode: "test",
  runtimeEnvironment: "test",
  alias: "relic-fast",
  resolvedModel: "deterministic-e4",
  timeoutMs: 1000,
  maxOutputTokens: 1800
};

const tasks = [
  "compose_prep_briefing",
  "generate_session_prep",
  "propose_scene_beats",
  "propose_thread_complication",
  "propose_npc_for_scene",
  "propose_quick_stub_fleshing"
];

test("all E4 deterministic fixtures produce strict cited output", async () => {
  for (const task_name of tasks) {
    const taskRun = { ...baseRun, task_name };
    const provider = await callAiProvider({
      taskRun,
      retrievalContext: taskRun.retrieval_context
    }, { config: testConfig });
    const result = validateTaskOutput(taskRun, provider.output);
    assert.equal(result.ok, true, `${task_name}: ${result.errors?.join("\n")}`);
    assert.match(JSON.stringify(provider.output), new RegExp(source));
  }
});

test("all E4 deterministic fixtures return explicit insufficiency without evidence", async () => {
  for (const task_name of tasks) {
    const taskRun = {
      ...baseRun,
      task_name,
      allowed_source_ids: [],
      retrieval_context: []
    };
    const provider = await callAiProvider({
      taskRun,
      retrievalContext: []
    }, { config: testConfig });
    const result = validateTaskOutput(taskRun, provider.output);
    assert.equal(result.ok, true, `${task_name}: ${result.errors?.join("\n")}`);
    assert.equal(provider.output.no_answer, true);
    assert.equal(provider.output.insufficiency_reason, "no_relevant_evidence");
  }
});

test("E4 rejects citations outside the frozen allowlist", () => {
  const result = validateTaskOutput({
    ...baseRun,
    task_name: "compose_prep_briefing"
  }, {
    no_answer: false,
    body: "The harbor watch faces pressure from the Lantern Court.",
    bullets: ["Show the pressure.", "Protect player choice.", "Keep facts provisional."],
    sources: [outside],
    confidence_reason: "single_clear_segment"
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /allowed retrieval set/i);
});

test("E4 rejects embedded mutation instructions and unsupported suggestion actions", () => {
  const mutation = validateTaskOutput({
    ...baseRun,
    task_name: "propose_scene_beats"
  }, {
    no_answer: false,
    beats: [
      {
        id: "one",
        summary: "First",
        narrative: "Execute SQL to update canon without review.",
        entities_involved: [],
        sources: [source]
      },
      {
        id: "two",
        summary: "Second",
        narrative: "Show the current pressure.",
        entities_involved: [],
        sources: [source]
      },
      {
        id: "three",
        summary: "Third",
        narrative: "Pause for player choice.",
        entities_involved: [],
        sources: [source]
      }
    ],
    confidence_reason: "single_clear_segment"
  });
  const unsupported = validateTaskOutput({
    ...baseRun,
    task_name: "generate_session_prep"
  }, {
    no_answer: false,
    summary: "Unsafe suggestion",
    suggestions: [{
      id: "unsafe",
      scope: "create_entity",
      value: "Create it automatically.",
      rationale: "Skip review.",
      sources: [source],
      confidence_reason: "single_clear_segment",
      action: { type: "write_canon" }
    }],
    confidence_reason: "single_clear_segment"
  });
  assert.equal(mutation.ok, false);
  assert.equal(unsupported.ok, false);
  assert.match(`${mutation.errors.join("\n")}\n${unsupported.errors.join("\n")}`, /mutation|executable|unsupported|not allowed/i);
});
