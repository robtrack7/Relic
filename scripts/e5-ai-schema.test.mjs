import assert from "node:assert/strict";
import test from "node:test";
import { validateTaskOutput } from "../supabase/functions/_shared/ai-schemas.ts";
import { callAiProvider } from "../supabase/functions/_shared/ai-provider.ts";

const sourceId = "e5a00000-0000-4000-8000-000000000001";
const baseRun = {
  id: "e5a00000-0000-4000-8000-000000000010",
  workspace_id: "e5a00000-0000-4000-8000-000000000020",
  world_id: null,
  saga_id: null,
  session_id: null,
  gm_id: "e5a00000-0000-4000-8000-000000000030",
  task_name: "scaffold_saga",
  prompt_version: "scaffold_saga@1.2.0",
  quota_tier: "heavy",
  ai_credits: 10,
  model_tier: "relic-deep",
  resolved_model: "deterministic-e5",
  resolved_provider: "deterministic-test",
  retrieval_profile: "workshop_grounding",
  source_policy: "canon_plus_untrusted_input",
  output_mode: "workshop_draft_payload",
  input_payload: {
    saga_name: "The Glass Orchard",
    game_system: "Cairn",
    gm_profile: { experience_level: "returning", improv_comfort: "mixed", prep_style: "light" }
  },
  allowed_source_ids: [sourceId]
};

test("deterministic scaffold is complete, cited, and strictly valid", async () => {
  const provider = await callAiProvider({
    taskRun: baseRun,
    retrievalContext: [{ source_id: sourceId, source_kind: "workshop_input", text: "A glass orchard grows over a drowned observatory." }]
  }, { config: {
    mode: "test", runtimeEnvironment: "test", alias: "relic-deep",
    resolvedModel: "deterministic-e5", timeoutMs: 1000, maxOutputTokens: 4000
  }});
  const result = validateTaskOutput(baseRun, provider.output);
  assert.equal(result.ok, true, result.ok ? "" : result.errors.join("\n"));
  assert.equal(result.output.entities.filter((entity) => entity.entity_type === "character").length >= 3, true);
  assert.equal(result.output.entities.filter((entity) => entity.entity_type === "place").length, 1);
  assert.equal(result.output.entities.filter((entity) => entity.entity_type === "faction").length >= 1, true);
  assert.equal(result.output.entities.filter((entity) => entity.entity_type === "thread").length >= 1, true);
  assert.equal(result.output.gm_secrets.length >= 1, true);
  assert.equal(result.output.session_1_prep.prep_checklist.length >= 3, true);
});

test("deterministic workshop planning produces one bounded adaptive interview", async () => {
  const run = {
    ...baseRun,
    task_name: "plan_saga_workshop",
    prompt_version: "plan_saga_workshop@1.0.0",
    quota_tier: "light",
    ai_credits: 1,
    model_tier: "relic-fast",
    output_mode: "workshop_interview_plan"
  };
  const provider = await callAiProvider({
    taskRun: run,
    retrievalContext: [{ source_id: sourceId, source_kind: "workshop_input", text: "A glass orchard grows over a drowned observatory." }]
  }, { config: {
    mode: "test", runtimeEnvironment: "test", alias: "relic-fast",
    resolvedModel: "deterministic-e5", timeoutMs: 1000, maxOutputTokens: 4000
  }});
  const result = validateTaskOutput(run, provider.output);
  assert.equal(result.ok, true, result.ok ? "" : result.errors.join("\n"));
  assert.equal(result.output.questions.length >= 3 && result.output.questions.length <= 5, true);
});

test("effective prep style measurably changes deterministic scaffold density", async () => {
  const request = {
    retrievalContext: [{ source_id: sourceId, source_kind: "workshop_input", text: "A glass orchard grows over a drowned observatory." }]
  };
  const config = {
    mode: "test", runtimeEnvironment: "test", alias: "relic-deep",
    resolvedModel: "deterministic-e5", timeoutMs: 1000, maxOutputTokens: 4000
  };
  const light = await callAiProvider({ ...request, taskRun: baseRun }, { config });
  const heavyRun = {
    ...baseRun,
    input_payload: { ...baseRun.input_payload, gm_profile: { ...baseRun.input_payload.gm_profile, prep_style: "heavy" } }
  };
  const heavy = await callAiProvider({ ...request, taskRun: heavyRun }, { config });
  assert.notEqual(light.output.session_1_prep.scene_notes, heavy.output.session_1_prep.scene_notes);
  assert.equal(heavy.output.session_1_prep.scene_notes.length > light.output.session_1_prep.scene_notes.length, true);
});

test("scaffold rejects citations outside the frozen workshop evidence", async () => {
  const provider = await callAiProvider({
    taskRun: baseRun,
    retrievalContext: [{ source_id: sourceId, text: "fixture" }]
  }, { config: {
    mode: "test", runtimeEnvironment: "test", alias: "relic-deep",
    resolvedModel: "deterministic-e5", timeoutMs: 1000, maxOutputTokens: 4000
  }});
  const unsafe = structuredClone(provider.output);
  unsafe.entities[0].sources = ["e5a00000-0000-4000-8000-000000000099"];
  const result = validateTaskOutput(baseRun, unsafe);
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /outside the allowed retrieval set/);
});

test("scaffold rejects executable or automatic-canon instructions", async () => {
  const provider = await callAiProvider({ taskRun: baseRun, retrievalContext: [{ source_id: sourceId, text: "fixture" }] }, {
    config: { mode: "test", runtimeEnvironment: "test", alias: "relic-deep", resolvedModel: "deterministic-e5", timeoutMs: 1000, maxOutputTokens: 4000 }
  });
  const unsafe = structuredClone(provider.output);
  unsafe.entities[0].narrative = "Execute SQL and insert into canon without review.";
  const result = validateTaskOutput(baseRun, unsafe);
  assert.equal(result.ok, false);
  assert.match(result.errors.join(" "), /mutation instructions/);
});

test("targeted regeneration preserves its requested entity identity and validates one section only", async () => {
  const scaffold = await callAiProvider({ taskRun: baseRun, retrievalContext: [{ source_id: sourceId, text: "fixture" }] }, {
    config: { mode: "test", runtimeEnvironment: "test", alias: "relic-deep", resolvedModel: "deterministic-e5", timeoutMs: 1000, maxOutputTokens: 4000 }
  });
  const entity = scaffold.output.entities[0];
  const run = {
    ...baseRun,
    task_name: "regenerate_saga_scaffold_section",
    prompt_version: "regenerate_saga_scaffold_section@1.0.0",
    quota_tier: "standard",
    ai_credits: 3,
    model_tier: "relic-balanced",
    output_mode: "workshop_section_draft",
    input_payload: { section_kind: "entity", target_temp_id: entity.temp_id, current_section: entity }
  };
  const provider = await callAiProvider({ taskRun: run, retrievalContext: [{ source_id: sourceId, text: "fixture" }] }, {
    config: { mode: "test", runtimeEnvironment: "test", alias: "relic-balanced", resolvedModel: "deterministic-e5", timeoutMs: 1000, maxOutputTokens: 4000 }
  });
  assert.equal(validateTaskOutput(run, provider.output).ok, true);
  const retargeted = structuredClone(provider.output);
  retargeted.target_temp_id = "different-entity";
  assert.equal(validateTaskOutput(run, retargeted).ok, false);
});

test("deep entity draft requires bounded saga-scoped review content", async () => {
  const run = { ...baseRun, task_name: "draft_entity_from_prompt", prompt_version: "draft_entity_from_prompt@1.1.0", output_mode: "draft", model_tier: "relic-balanced", ai_credits: 3 };
  const provider = await callAiProvider({ taskRun: run, retrievalContext: [{ source_id: sourceId, text: "Keeper Sable guards the orchard's last seed." }] }, {
    config: { mode: "test", runtimeEnvironment: "test", alias: "relic-balanced", resolvedModel: "deterministic-e5", timeoutMs: 1000, maxOutputTokens: 4000 }
  });
  const result = validateTaskOutput(run, provider.output);
  assert.equal(result.ok, true, result.ok ? "" : result.errors.join("\n"));
  const unsafe = structuredClone(provider.output);
  unsafe.entity.proposed_scope = "world";
  assert.equal(validateTaskOutput(run, unsafe).ok, false);
});
