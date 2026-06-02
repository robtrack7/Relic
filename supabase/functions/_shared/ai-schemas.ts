import type { AiTaskRun } from "./ai-contracts.ts";

export type ValidationResult =
  | { ok: true; output: Record<string, unknown> }
  | { ok: false; errors: string[]; output?: unknown };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function fail(errors: string[], output?: unknown): ValidationResult {
  return { ok: false, errors, output };
}

function validateObjectOutput(output: unknown): ValidationResult {
  if (!isRecord(output)) return fail(["output must be a JSON object"], output);
  return { ok: true, output };
}

export function parseModelJson(raw: unknown): ValidationResult {
  if (isRecord(raw)) return { ok: true, output: raw };
  if (typeof raw !== "string") return fail(["model output was not JSON text or object"], raw);

  try {
    return validateObjectOutput(JSON.parse(raw));
  } catch {
    return fail(["model output was not parseable JSON"], raw);
  }
}

export function validateTaskOutput(taskRun: AiTaskRun, output: unknown): ValidationResult {
  const base = validateObjectOutput(output);
  if (!base.ok) return base;

  const errors: string[] = [];
  const value = base.output;

  if (taskRun.output_mode === "prep_briefing") {
    if (!isString(value.body)) errors.push("prep briefing body is required");
    if (!Array.isArray(value.bullets) || value.bullets.length < 3 || value.bullets.length > 5) {
      errors.push("prep briefing requires three to five bullets");
    }
  }

  if (taskRun.output_mode === "prep_suggestions") {
    if (!Array.isArray(value.suggestions)) errors.push("session prep suggestions array is required");
  }

  if (taskRun.output_mode === "draft") {
    if (!isRecord(value.entity) && !isString(value.proposed_summary)) {
      errors.push("draft output requires an entity object or proposed summary");
    }
  }

  if (taskRun.output_mode === "draft_batch") {
    if (!Array.isArray(value.proposed_entity_changes)) {
      errors.push("draft batch requires proposed_entity_changes array");
    }
  }

  if (taskRun.task_name === "answer_saga_question") {
    if (value.no_answer === false && (!isString(value.answer) || !Array.isArray(value.citations) || value.citations.length === 0)) {
      errors.push("factual saga answers require an answer and citations");
    }
  }

  return errors.length > 0 ? fail(errors, output) : { ok: true, output: value };
}
