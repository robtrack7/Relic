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
const GUIDE_ENTITY_TYPES = new Set(["character", "place", "faction", "artifact", "thread"]);
const GUIDE_INSUFFICIENCY_REASONS = new Set([
  "no_relevant_evidence",
  "evidence_conflict",
  "evidence_stale",
  "retrieval_unavailable",
  "unsupported_source"
]);
const GUIDE_ALLOWED_TOP_LEVEL_FIELDS = new Set([
  "no_answer",
  "insufficiency_reason",
  "blocks",
  "confidence_reason"
]);
const GUIDE_STOP_WORDS = new Set([
  "about", "after", "again", "against", "also", "because", "been", "before", "being",
  "between", "could", "does", "from", "have", "into", "itself", "more", "most", "only",
  "other", "over", "same", "such", "than", "that", "their", "them", "then", "there",
  "these", "they", "this", "those", "through", "under", "very", "what", "when", "where",
  "which", "while", "with", "would"
]);
const EXECUTABLE_OR_MUTATION_PATTERN =
  /(?:<script\b|javascript:|execute\s+sql|insert\s+into|delete\s+from|drop\s+table|update\s+canon|without\s+review)/i;

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

function hasOnlyFields(
  value: Record<string, unknown>,
  allowed: Set<string>,
  path: string,
  errors: string[]
) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) errors.push(`${path}.${key} is not allowed`);
  }
}

function guideTokens(value: string) {
  return new Set(
    value.toLocaleLowerCase()
      .normalize("NFKC")
      .match(/[\p{L}\p{N}]+/gu)
      ?.filter((token) => token.length >= 4 && !GUIDE_STOP_WORDS.has(token)) ?? []
  );
}

function citedEvidenceFor(taskRun: AiTaskRun, sourceIds: string[]) {
  const byId = new Map((taskRun.retrieval_context ?? []).map((entry) => [entry.source_id, entry.text]));
  return sourceIds.map((sourceId) => byId.get(sourceId) ?? "").filter(Boolean).join("\n");
}

function validateGuideSupport(
  taskRun: AiTaskRun,
  text: string,
  sourceIds: string[],
  path: string,
  errors: string[]
) {
  if (!taskRun.retrieval_context?.length) return;
  const evidence = citedEvidenceFor(taskRun, sourceIds);
  if (!evidence) {
    errors.push(`${path} citations were not included in the retrieval context`);
    return;
  }

  const claimTokens = guideTokens(text);
  const evidenceTokens = guideTokens(evidence);
  const overlap = [...claimTokens].filter((token) => evidenceTokens.has(token));
  if (claimTokens.size > 0 && overlap.length === 0) {
    errors.push(`${path} citations are obviously unrelated to the answer paragraph`);
  }

  const normalizedClaim = text.toLocaleLowerCase().normalize("NFKC");
  const normalizedEvidence = evidence.toLocaleLowerCase().normalize("NFKC");
  for (const token of claimTokens) {
    if (!normalizedClaim.includes(`not ${token}`)
      && (normalizedEvidence.includes(`not ${token}`) || normalizedEvidence.includes(`never ${token}`))) {
      errors.push(`${path} cited evidence contradicts the answer paragraph`);
      break;
    }
  }
}

function validateGuideOutput(taskRun: AiTaskRun, value: Record<string, unknown>): {
  errors: string[];
  output: Record<string, unknown>;
} {
  const errors: string[] = [];
  const allowedSourceIds = new Set(taskRun.allowed_source_ids);
  const normalized = structuredClone(value);
  hasOnlyFields(normalized, GUIDE_ALLOWED_TOP_LEVEL_FIELDS, "output", errors);

  if (typeof normalized.no_answer !== "boolean") {
    errors.push("no_answer must be boolean");
  }
  validateConfidence(normalized.confidence_reason, "output", errors);

  if (!Array.isArray(normalized.blocks) || normalized.blocks.length === 0 || normalized.blocks.length > 8) {
    errors.push("blocks must contain one to eight typed blocks");
    return { errors, output: normalized };
  }

  let groundedCount = 0;
  let totalTextLength = 0;
  normalized.blocks.forEach((candidate, index) => {
    const path = `blocks[${index}]`;
    if (!isRecord(candidate) || !isString(candidate.type)) {
      errors.push(`${path} must be a typed object`);
      return;
    }

    if (candidate.type === "grounded_answer") {
      groundedCount += 1;
      hasOnlyFields(candidate, new Set(["type", "text", "citations"]), path, errors);
      if (!isString(candidate.text)) errors.push(`${path}.text is required`);
      else {
        totalTextLength += candidate.text.length;
        if (candidate.text.length > 1500) errors.push(`${path}.text must contain at most 1,500 characters`);
        if (EXECUTABLE_OR_MUTATION_PATTERN.test(candidate.text)) {
          errors.push(`${path}.text contains executable or mutation instructions`);
        }
      }
      if (!Array.isArray(candidate.citations) || candidate.citations.length === 0) {
        errors.push(`${path} requires at least one citation`);
        return;
      }
      const seen = new Set<string>();
      const normalizedCitations: Array<{ source_id: string }> = [];
      candidate.citations.forEach((citation, citationIndex) => {
        const citationPath = `${path}.citations[${citationIndex}]`;
        if (!isRecord(citation)) {
          errors.push(`${citationPath} must be an object`);
          return;
        }
        hasOnlyFields(citation, new Set(["source_id"]), citationPath, errors);
        if (!isUuid(citation.source_id)) {
          errors.push(`${citationPath}.source_id must be a UUID`);
        } else if (!allowedSourceIds.has(citation.source_id)) {
          errors.push(`${citationPath}.source_id is outside the allowed retrieval set`);
        } else if (!seen.has(citation.source_id)) {
          seen.add(citation.source_id);
          normalizedCitations.push({ source_id: citation.source_id });
        }
      });
      candidate.citations = normalizedCitations;
      if (isString(candidate.text)) {
        validateGuideSupport(taskRun, candidate.text, [...seen], path, errors);
      }
      return;
    }

    if (candidate.type === "guidance") {
      hasOnlyFields(candidate, new Set(["type", "text"]), path, errors);
      if (!isString(candidate.text) || candidate.text.length > 1000) {
        errors.push(`${path}.text is required and must be bounded`);
      } else {
        totalTextLength += candidate.text.length;
        if (EXECUTABLE_OR_MUTATION_PATTERN.test(candidate.text)) {
          errors.push(`${path}.text contains executable or mutation instructions`);
        }
      }
      return;
    }

    if (candidate.type === "action_preview") {
      hasOnlyFields(candidate, new Set(["type", "action", "explanation"]), path, errors);
      if (!isString(candidate.explanation) || candidate.explanation.length > 500) {
        errors.push(`${path}.explanation is required and must be bounded`);
      } else {
        totalTextLength += candidate.explanation.length;
      }
      if (!isRecord(candidate.action) || !isString(candidate.action.type)) {
        errors.push(`${path}.action must be an allowlisted action object`);
        return;
      }
      if (candidate.action.type === "open_record") {
        hasOnlyFields(candidate.action, new Set(["type", "source_id"]), `${path}.action`, errors);
        if (!isUuid(candidate.action.source_id) || !allowedSourceIds.has(candidate.action.source_id)) {
          errors.push(`${path}.action.source_id must belong to the allowed retrieval set`);
        }
      } else if (candidate.action.type === "draft_entity") {
        hasOnlyFields(candidate.action, new Set(["type", "entity_type", "intent"]), `${path}.action`, errors);
        if (!isString(candidate.action.entity_type) || !GUIDE_ENTITY_TYPES.has(candidate.action.entity_type)) {
          errors.push(`${path}.action.entity_type is unsupported`);
        }
        if (!isString(candidate.action.intent) || candidate.action.intent.length > 500
          || EXECUTABLE_OR_MUTATION_PATTERN.test(candidate.action.intent)) {
          errors.push(`${path}.action.intent is required, bounded, and non-executable`);
        }
      } else {
        errors.push(`${path}.action.type is unsupported`);
      }
      return;
    }

    errors.push(`${path}.type is unsupported for answer_saga_question`);
  });

  if (totalTextLength > 6000) errors.push("Guide output text must contain at most 6,000 characters");
  if (normalized.no_answer === false && (groundedCount < 1 || groundedCount > 4)) {
    errors.push("no_answer=false requires one to four grounded answer paragraphs");
  }
  if (normalized.no_answer === true) {
    if (!isString(normalized.insufficiency_reason)
      || !GUIDE_INSUFFICIENCY_REASONS.has(normalized.insufficiency_reason)) {
      errors.push("no_answer=true requires a safe insufficiency reason");
    }
    if (groundedCount > 0) errors.push("no_answer=true cannot contain grounded factual prose");
    if (normalized.blocks.some((block) => isRecord(block) && block.type !== "guidance")) {
      errors.push("no_answer=true may contain guidance only");
    }
  } else if (normalized.insufficiency_reason !== undefined) {
    errors.push("insufficiency_reason is only permitted when no_answer=true");
  }

  return { errors, output: normalized };
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
    const guide = validateGuideOutput(taskRun, value);
    errors.push(...guide.errors);
    if (errors.length === 0) return { ok: true, output: guide.output };
  }

  if (taskRun.task_name === "propose_thread_complication") {
    errors.push(...validateThreadComplication(taskRun, value));
  }

  return errors.length > 0 ? fail(errors, output) : { ok: true, output: value };
}
