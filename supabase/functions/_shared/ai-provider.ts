import type { AiProviderRequest, AiProviderResult } from "./ai-contracts.ts";

function modelForTier(modelTier: string): string {
  const configured = Deno.env.get(`AI_MODEL_${modelTier.toUpperCase().replaceAll("-", "_")}`);
  return configured ?? modelTier;
}

function testOutputFor(taskName: string): Record<string, unknown> {
  if (taskName === "answer_saga_question") {
    return { answer: "No approved context was available.", citations: [], confidence_reason: "ambiguous_source", no_answer: true };
  }
  if (taskName === "compose_prep_briefing") {
    return { body: "No prior canon was available for a detailed briefing.", bullets: ["Review current prep.", "Add canon context.", "Proceed manually."], sources: [], confidence_reason: "ambiguous_source" };
  }
  if (taskName === "generate_session_prep") {
    return { suggestions: [], summary: "No suggestions generated." };
  }
  if (taskName === "synthesize_session") {
    return { proposed_entity_changes: [], loose_threads: [], next_prep_implications: [], stub_evidence_flags: [] };
  }
  return { suggestions: [], confidence_reason: "ambiguous_source" };
}

export async function callAiProvider(request: AiProviderRequest): Promise<AiProviderResult> {
  const mode = Deno.env.get("AI_PROVIDER_MODE") ?? "test";
  const resolvedModel = modelForTier(request.taskRun.model_tier);

  if (mode === "test") {
    return { output: testOutputFor(request.taskRun.task_name), resolvedModel, tokensIn: 0, tokensOut: 0, costEstimateUsd: 0 };
  }

  const baseUrl = Deno.env.get("AI_PROVIDER_BASE_URL");
  const apiKey = Deno.env.get("AI_PROVIDER_API_KEY");
  if (!baseUrl || !apiKey) {
    throw new Error("AI provider environment is not configured.");
  }

  const prompt = {
    task: request.taskRun.task_name,
    prompt_version: request.taskRun.prompt_version,
    input: request.taskRun.input_payload,
    retrieval_context: request.retrievalContext,
    repair: request.repair ?? null
  };

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: resolvedModel,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Return only valid JSON for the requested Relic AI task. Do not write canon." },
        { role: "user", content: JSON.stringify(prompt) }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`AI provider request failed with status ${response.status}.`);
  }

  const body = await response.json();
  return {
    output: body?.choices?.[0]?.message?.content,
    resolvedModel,
    tokensIn: body?.usage?.prompt_tokens,
    tokensOut: body?.usage?.completion_tokens,
    costEstimateUsd: body?.usage?.cost
  };
}
