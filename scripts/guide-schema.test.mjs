import test from "node:test";
import assert from "node:assert/strict";
import { parseModelJson, validateTaskOutput } from "../supabase/functions/_shared/ai-schemas.ts";

const sourceA = "e3060000-0000-0000-0000-000000000001";
const sourceB = "e3060000-0000-0000-0000-000000000002";
const sourceOutside = "e3060000-0000-0000-0000-000000000099";

const taskRun = {
  id: "e3200000-0000-0000-0000-000000000001",
  workspace_id: "e3010000-0000-0000-0000-000000000001",
  world_id: "e3020000-0000-0000-0000-000000000001",
  saga_id: "e3030000-0000-0000-0000-000000000001",
  session_id: null,
  gm_id: "e3000000-0000-0000-0000-000000000001",
  task_name: "answer_saga_question",
  prompt_version: "answer_saga_question@1.1.0",
  quota_tier: "light",
  ai_credits: 1,
  model_tier: "relic-balanced",
  resolved_model: "deterministic-guide-fixture",
  retrieval_profile: "sanctum_qa_grounding",
  source_policy: "canon_only",
  output_mode: "ephemeral",
  input_payload: { question: "What protects the eastern road?" },
  allowed_source_ids: [sourceA, sourceB],
  retrieval_context: [
    { source_id: sourceA, text: "The Iron Gate is sealed and protects the eastern road." },
    { source_id: sourceB, text: "Captain Mara commands the Iron Gate watch." }
  ]
};

const valid = {
  no_answer: false,
  blocks: [{
    type: "grounded_answer",
    text: "The Iron Gate protects the eastern road.",
    citations: [{ source_id: sourceA }]
  }],
  confidence_reason: "single_clear_segment"
};

test("Guide accepts a directly supported paragraph-level cited answer", () => {
  assert.deepEqual(validateTaskOutput(taskRun, valid), { ok: true, output: valid });
});

test("Guide accepts labeled creative and cited grounded proposals", () => {
  const output = {
    no_answer: false,
    blocks: [
      {
        type: "creative_proposal",
        text: "A new bell keeper could complicate passage through the gate."
      },
      {
        type: "grounded_proposal",
        text: "Captain Mara could question travelers at the Iron Gate.",
        citations: [{ source_id: sourceB }]
      }
    ],
    confidence_reason: "inferred_from_context"
  };
  assert.deepEqual(validateTaskOutput(taskRun, output), { ok: true, output });
});

test("Guide requires citations for grounded proposals but not creative proposals", () => {
  const grounded = validateTaskOutput(taskRun, {
    no_answer: false,
    blocks: [{ type: "grounded_proposal", text: "Captain Mara could question travelers." }],
    confidence_reason: "inferred_from_context"
  });
  const creative = {
    no_answer: false,
    blocks: [{ type: "creative_proposal", text: "A new bell keeper could question travelers." }],
    confidence_reason: "tonal_or_genre_match"
  };
  assert.equal(grounded.ok, false);
  assert.match(grounded.errors.join("\n"), /citation/i);
  assert.deepEqual(validateTaskOutput(taskRun, creative), { ok: true, output: creative });
});

test("Guide accepts a strict no-answer response with safe guidance", () => {
  const output = {
    no_answer: true,
    insufficiency_reason: "no_relevant_evidence",
    blocks: [{ type: "guidance", text: "Try refining the question or search manually." }],
    confidence_reason: "ambiguous_source"
  };
  assert.deepEqual(validateTaskOutput(taskRun, output), { ok: true, output });
});

test("Guide rejects factual answers without citations", () => {
  const result = validateTaskOutput(taskRun, {
    ...valid,
    blocks: [{ type: "grounded_answer", text: valid.blocks[0].text, citations: [] }]
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /citation/i);
});

test("Guide rejects hallucinated or outside-allowlist source IDs", () => {
  const result = validateTaskOutput(taskRun, {
    ...valid,
    blocks: [{ ...valid.blocks[0], citations: [{ source_id: sourceOutside }] }]
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /allowed|retrieval/i);
});

test("Guide rejects empty and excessively long grounded answers", () => {
  const empty = validateTaskOutput(taskRun, {
    ...valid,
    blocks: [{ ...valid.blocks[0], text: " " }]
  });
  const long = validateTaskOutput(taskRun, {
    ...valid,
    blocks: [{ ...valid.blocks[0], text: "Gate ".repeat(400) }]
  });
  assert.equal(empty.ok, false);
  assert.equal(long.ok, false);
  assert.match(long.errors.join("\n"), /1,500|bounded|long/i);
});

test("Guide rejects unsupported actions and mutation instructions", () => {
  const unsupported = validateTaskOutput(taskRun, {
    ...valid,
    blocks: [{
      type: "action_preview",
      action: { type: "update_canon", table: "characters" },
      explanation: "Change canon immediately."
    }]
  });
  const mutation = validateTaskOutput(taskRun, {
    ...valid,
    blocks: [{ type: "guidance", text: "Execute SQL to update canon without review." }]
  });
  assert.equal(unsupported.ok, false);
  assert.equal(mutation.ok, false);
  assert.match(`${unsupported.errors.join("\n")}\n${mutation.errors.join("\n")}`, /unsupported|mutation|executable/i);
});

test("Guide permits only open-record and bounded entity-draft action intents", () => {
  const output = {
    ...valid,
    blocks: [
      ...valid.blocks,
      {
        type: "action_preview",
        action: { type: "open_record", source_id: sourceA },
        explanation: "Open the cited Iron Gate record."
      },
      {
        type: "action_preview",
        action: { type: "draft_entity", entity_type: "character", intent: "Draft the gate captain." },
        explanation: "Creates a pending character draft after confirmation."
      }
    ]
  };
  assert.deepEqual(validateTaskOutput(taskRun, output), { ok: true, output });
});

test("Guide documented open-record prompt shape validates and the legacy target shape is rejected", () => {
  const documented = {
    ...valid,
    blocks: [
      ...valid.blocks,
      {
        type: "action_preview",
        action: { type: "open_record", source_id: sourceA },
        explanation: "Open the allowlisted record."
      }
    ]
  };
  const legacy = {
    ...valid,
    blocks: [
      ...valid.blocks,
      {
        type: "action_preview",
        action: { type: "open_record", target_type: "character", target_id: sourceA },
        explanation: "Open the stale target shape."
      }
    ]
  };

  assert.deepEqual(validateTaskOutput(taskRun, documented), { ok: true, output: documented });
  const result = validateTaskOutput(taskRun, legacy);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /unknown field|source_id|retrieval set/i);
});

test("Guide normalizes duplicate citations by first appearance", () => {
  const result = validateTaskOutput(taskRun, {
    ...valid,
    blocks: [{
      ...valid.blocks[0],
      citations: [{ source_id: sourceA }, { source_id: sourceA }, { source_id: sourceB }]
    }]
  });
  assert.equal(result.ok, true);
  assert.deepEqual(result.output.blocks[0].citations, [{ source_id: sourceA }, { source_id: sourceB }]);
});

test("Guide rejects citations whose evidence is obviously unrelated or contradictory", () => {
  const unrelated = validateTaskOutput(taskRun, {
    ...valid,
    blocks: [{
      type: "grounded_answer",
      text: "The southern harbor is controlled by smugglers.",
      citations: [{ source_id: sourceA }]
    }]
  });
  const contradiction = validateTaskOutput({
    ...taskRun,
    retrieval_context: [{ source_id: sourceA, text: "The Iron Gate is open, not sealed." }]
  }, {
    ...valid,
    blocks: [{
      type: "grounded_answer",
      text: "The Iron Gate is sealed.",
      citations: [{ source_id: sourceA }]
    }]
  });
  assert.equal(unrelated.ok, false);
  assert.equal(contradiction.ok, false);
  assert.match(`${unrelated.errors.join("\n")}\n${contradiction.errors.join("\n")}`, /support|contradict|unrelated/i);
});

test("Guide malformed output receives no partial success", () => {
  const parsed = parseModelJson('{"no_answer":false,"blocks":[');
  assert.equal(parsed.ok, false);
  assert.equal("output" in parsed && parsed.output?.no_answer, undefined);
});

test("no-answer cannot disguise factual prose in a guidance block", () => {
  const result = validateTaskOutput(taskRun, {
    no_answer: true,
    insufficiency_reason: "no_relevant_evidence",
    blocks: [{ type: "grounded_answer", text: "The gate is sealed.", citations: [{ source_id: sourceA }] }],
    confidence_reason: "ambiguous_source"
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /no.answer|grounded/i);
});
