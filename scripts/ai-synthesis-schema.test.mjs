import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateTaskOutput } from "../supabase/functions/_shared/ai-schemas.ts";

const fixture = JSON.parse(readFileSync(new URL("../supabase/fixtures/synthesize_session_output.json", import.meta.url), "utf8"));

const taskRun = {
  id: "c3200000-0000-0000-0000-000000000001",
  workspace_id: "c3010000-0000-0000-0000-000000000001",
  world_id: "c3020000-0000-0000-0000-000000000001",
  saga_id: "c3030000-0000-0000-0000-000000000001",
  session_id: "c3040000-0000-0000-0000-000000000001",
  gm_id: "c3000000-0000-0000-0000-000000000001",
  task_name: "synthesize_session",
  prompt_version: "synthesize_session@1.0.0",
  quota_tier: "pipeline_synthesis",
  ai_credits: 15,
  model_tier: "relic-deep",
  resolved_model: "deterministic-synthesis-fixture",
  retrieval_profile: "post_session_synthesis",
  source_policy: "canon_plus_untrusted_input",
  output_mode: "draft_batch",
  input_payload: {},
  allowed_source_ids: [
    "c3060000-0000-0000-0000-000000000001",
    "c3060000-0000-0000-0000-000000000002"
  ]
};

function validate(output) {
  return validateTaskOutput(taskRun, output);
}

test("deterministic synthesize_session fixture satisfies the complete draft-batch schema", () => {
  assert.deepEqual(validate(fixture), { ok: true, output: fixture });
});

test("synthesize_session rejects malformed top-level artifact collections", () => {
  const result = validate({ ...fixture, proposed_entity_changes: {} });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /proposed_entity_changes must be an array/i);
});

test("synthesize_session rejects draftable artifacts without source IDs", () => {
  const result = validate({
    ...fixture,
    proposed_entity_changes: [{ ...fixture.proposed_entity_changes[0], sources: [] }]
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /at least one source/i);
});

test("synthesize_session rejects malformed and unauthorized-shaped source IDs before persistence", () => {
  const result = validate({
    ...fixture,
    loose_threads: [{ ...fixture.loose_threads[0], sources: ["not-a-uuid"] }]
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /valid source UUID/i);
});

test("synthesize_session enforces Saga-only entity changes and update concurrency fields", () => {
  const wrongScope = validate({
    ...fixture,
    proposed_entity_changes: [{ ...fixture.proposed_entity_changes[0], proposed_scope: "world" }]
  });
  const incompleteUpdate = validate({
    ...fixture,
    proposed_entity_changes: [{
      ...fixture.proposed_entity_changes[0],
      change_kind: "update",
      target_entity_id: undefined,
      expected_version: undefined
    }]
  });

  assert.equal(wrongScope.ok, false);
  assert.match(wrongScope.errors.join("\n"), /proposed_scope must be saga/i);
  assert.equal(incompleteUpdate.ok, false);
  assert.match(incompleteUpdate.errors.join("\n"), /target_entity_id.*expected_version/i);
});

test("propose_thread_complication validates its complete light-task registry schema", () => {
  const lightRun = {
    ...taskRun,
    task_name: "propose_thread_complication",
    prompt_version: "propose_thread_complication@1.0.0",
    quota_tier: "light",
    ai_credits: 1,
    model_tier: "relic-balanced",
    retrieval_profile: "sanctum_grounding",
    source_policy: "canon_only",
    output_mode: "ephemeral"
  };
  const valid = {
    no_answer: false,
    complications: [{
      id: "complication-1",
      summary: "The witness changes their story",
      narrative: "A canon witness offers a contradictory detail without resolving the mystery.",
      entities_implicated: ["Lantern Keeper"],
      escalation_level: "medium",
      sources: [taskRun.allowed_source_ids[0]]
    }],
    confidence_reason: "single_clear_segment"
  };

  assert.deepEqual(validateTaskOutput(lightRun, valid), { ok: true, output: valid });
  const invalid = validateTaskOutput(lightRun, {
    ...valid,
    complications: [{ ...valid.complications[0], escalation_level: "catastrophic", sources: [] }]
  });
  assert.equal(invalid.ok, false);
  assert.match(invalid.errors.join("\n"), /escalation_level|source/i);
});
