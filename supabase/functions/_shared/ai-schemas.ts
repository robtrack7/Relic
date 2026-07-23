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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONFIDENCE_REASONS = new Set([
  "direct_gm_input",
  "multiple_strong_sources",
  "single_clear_segment",
  "cross_session_consistency",
  "inferred_from_context",
  "ambiguous_source",
  "tonal_or_genre_match"
]);
const SYNTHESIS_ENTITY_TYPES = new Set(["character", "place", "faction", "artifact", "thread"]);

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function validateConfidence(value: unknown, path: string, errors: string[]) {
  if (!isString(value) || !CONFIDENCE_REASONS.has(value)) {
    errors.push(`${path}.confidence_reason must be a registered confidence reason`);
  }
}

function validateSourceIds(
  value: unknown,
  path: string,
  errors: string[],
  allowedSourceIds: Set<string>
) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${path} requires at least one source`);
    return;
  }

  for (const sourceId of value) {
    if (!isUuid(sourceId)) {
      errors.push(`${path} sources must contain valid source UUIDs`);
    } else if (!allowedSourceIds.has(sourceId)) {
      errors.push(`${path} references a source outside the allowed retrieval set`);
    }
  }
}

function validateOptionalUuidArray(value: unknown, path: string, errors: string[]) {
  if (value === undefined) return;
  if (!Array.isArray(value) || value.some((entry) => !isUuid(entry))) {
    errors.push(`${path} must be an array of UUIDs`);
  }
}

function validateThreadComplication(taskRun: AiTaskRun, value: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const allowedSourceIds = new Set(taskRun.allowed_source_ids);
  if (!Array.isArray(value.complications) || value.complications.length < 1 || value.complications.length > 3) {
    errors.push("complications must contain one to three items");
  } else {
    value.complications.forEach((candidate, index) => {
      const path = `complications[${index}]`;
      if (!isRecord(candidate)) {
        errors.push(`${path} must be an object`);
        return;
      }
      if (!isString(candidate.id)) errors.push(`${path}.id is required`);
      if (!isString(candidate.summary) || candidate.summary.length > 80) {
        errors.push(`${path}.summary must contain at most 80 characters`);
      }
      if (!isString(candidate.narrative) || candidate.narrative.length > 1200) {
        errors.push(`${path}.narrative is required and must be bounded`);
      }
      if (!Array.isArray(candidate.entities_implicated)
        || candidate.entities_implicated.some((entry) => !isString(entry))) {
        errors.push(`${path}.entities_implicated must be a string array`);
      }
      if (!new Set(["low", "medium", "high"]).has(String(candidate.escalation_level))) {
        errors.push(`${path}.escalation_level is invalid`);
      }
      validateSourceIds(candidate.sources, path, errors, allowedSourceIds);
    });
  }
  validateConfidence(value.confidence_reason, "output", errors);
  return errors;
}

function validateSynthesisOutput(taskRun: AiTaskRun, value: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const allowedSourceIds = new Set(taskRun.allowed_source_ids);
  const collectionNames = [
    "proposed_entity_changes",
    "loose_threads",
    "next_prep_implications",
    "stub_evidence_flags"
  ] as const;

  for (const collectionName of collectionNames) {
    if (!Array.isArray(value[collectionName])) {
      errors.push(`${collectionName} must be an array`);
    }
  }

  if (value.session_summary !== undefined) {
    const summary = value.session_summary;
    if (!isRecord(summary)) {
      errors.push("session_summary must be an object");
    } else {
      if (!isString(summary.title)) errors.push("session_summary.title is required");
      if (!isString(summary.body)) errors.push("session_summary.body is required");
      validateSourceIds(summary.sources, "session_summary", errors, allowedSourceIds);
      validateConfidence(summary.confidence_reason, "session_summary", errors);
    }
  }

  if (Array.isArray(value.proposed_entity_changes)) {
    value.proposed_entity_changes.forEach((candidate, index) => {
      const path = `proposed_entity_changes[${index}]`;
      if (!isRecord(candidate)) {
        errors.push(`${path} must be an object`);
        return;
      }

      if (candidate.change_kind !== "create" && candidate.change_kind !== "update") {
        errors.push(`${path}.change_kind must be create or update`);
      }
      if (!isString(candidate.entity_type) || !SYNTHESIS_ENTITY_TYPES.has(candidate.entity_type)) {
        errors.push(`${path}.entity_type is not draftable`);
      }
      if (candidate.proposed_scope !== "saga") {
        errors.push(`${path}.proposed_scope must be saga`);
      }
      if (!isRecord(candidate.payload)) errors.push(`${path}.payload must be an object`);
      if (candidate.change_kind === "update" && (!isUuid(candidate.target_entity_id) || !isString(candidate.expected_version))) {
        errors.push(`${path} update requires target_entity_id and expected_version`);
      }
      validateSourceIds(candidate.sources, path, errors, allowedSourceIds);
      validateConfidence(candidate.confidence_reason, path, errors);
    });
  }

  if (Array.isArray(value.loose_threads)) {
    value.loose_threads.forEach((candidate, index) => {
      const path = `loose_threads[${index}]`;
      if (!isRecord(candidate)) {
        errors.push(`${path} must be an object`);
        return;
      }
      if (candidate.thread_id !== undefined && !isUuid(candidate.thread_id)) {
        errors.push(`${path}.thread_id must be a UUID`);
      }
      if (candidate.thread_id === undefined && !isString(candidate.suggested_name)) {
        errors.push(`${path}.suggested_name is required for a new Thread`);
      }
      if (!isString(candidate.reason)) errors.push(`${path}.reason is required`);
      validateSourceIds(candidate.sources, path, errors, allowedSourceIds);
      validateConfidence(candidate.confidence_reason, path, errors);
    });
  }

  if (Array.isArray(value.next_prep_implications)) {
    value.next_prep_implications.forEach((candidate, index) => {
      const path = `next_prep_implications[${index}]`;
      if (!isRecord(candidate)) {
        errors.push(`${path} must be an object`);
        return;
      }
      if (!isString(candidate.text)) errors.push(`${path}.text is required`);
      if (candidate.related_thread_id !== undefined && !isUuid(candidate.related_thread_id)) {
        errors.push(`${path}.related_thread_id must be a UUID`);
      }
      validateOptionalUuidArray(candidate.related_entity_ids, `${path}.related_entity_ids`, errors);
      validateSourceIds(candidate.sources, path, errors, allowedSourceIds);
      validateConfidence(candidate.confidence_reason, path, errors);
    });
  }

  if (Array.isArray(value.stub_evidence_flags)) {
    value.stub_evidence_flags.forEach((candidate, index) => {
      const path = `stub_evidence_flags[${index}]`;
      if (!isRecord(candidate)) {
        errors.push(`${path} must be an object`);
        return;
      }
      if (!isUuid(candidate.entity_id)) errors.push(`${path}.entity_id must be a UUID`);
      if (!isString(candidate.entity_type) || !SYNTHESIS_ENTITY_TYPES.has(candidate.entity_type)) {
        errors.push(`${path}.entity_type is invalid`);
      }
      validateOptionalUuidArray(candidate.session_ids_with_mentions, `${path}.session_ids_with_mentions`, errors);
      if (!Array.isArray(candidate.session_ids_with_mentions) || candidate.session_ids_with_mentions.length === 0) {
        errors.push(`${path}.session_ids_with_mentions requires at least one Session`);
      } else if (taskRun.session_id && candidate.session_ids_with_mentions.some((sessionId) => sessionId !== taskRun.session_id)) {
        errors.push(`${path}.session_ids_with_mentions must use the current Session`);
      }
      validateSourceIds(candidate.sources, path, errors, allowedSourceIds);
    });
  }

  return errors;
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
    errors.push(...validateSynthesisOutput(taskRun, value));
  }

  if (taskRun.task_name === "answer_saga_question") {
    if (value.no_answer === false && (!isString(value.answer) || !Array.isArray(value.citations) || value.citations.length === 0)) {
      errors.push("factual saga answers require an answer and citations");
    }
  }

  if (taskRun.task_name === "propose_thread_complication") {
    errors.push(...validateThreadComplication(taskRun, value));
  }

  return errors.length > 0 ? fail(errors, output) : { ok: true, output: value };
}
