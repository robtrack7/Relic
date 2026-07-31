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
const PREP_INSUFFICIENCY_REASONS = new Set([
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
  validatePrepAnswerState(value, errors);
  hasOnlyFields(value, new Set([
    "no_answer", "insufficiency_reason", "complications", "confidence_reason"
  ]), "output", errors);
  if (value.no_answer === true) {
    if (!Array.isArray(value.complications) || value.complications.length !== 0) {
      errors.push("no_answer=true requires an empty complications array");
    }
    return errors;
  }
  if (!Array.isArray(value.complications) || value.complications.length < 1 || value.complications.length > 3) {
    errors.push("complications must contain one to three items");
  } else {
    value.complications.forEach((candidate, index) => {
      const path = `complications[${index}]`;
      if (!isRecord(candidate)) {
        errors.push(`${path} must be an object`);
        return;
      }
      hasOnlyFields(candidate, new Set([
        "id", "summary", "narrative", "entities_implicated", "escalation_level", "sources"
      ]), path, errors);
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

function validatePrepAnswerState(value: Record<string, unknown>, errors: string[]) {
  if (typeof value.no_answer !== "boolean") {
    errors.push("no_answer must be boolean");
    return;
  }
  validateConfidence(value.confidence_reason, "output", errors);
  if (value.no_answer === true) {
    if (!isString(value.insufficiency_reason)
      || !PREP_INSUFFICIENCY_REASONS.has(value.insufficiency_reason)) {
      errors.push("no_answer=true requires a safe insufficiency reason");
    }
  } else if (value.insufficiency_reason !== undefined) {
    errors.push("insufficiency_reason is only permitted when no_answer=true");
  }
}

function validateSafeText(value: unknown, path: string, max: number, errors: string[]) {
  if (!isString(value) || value.length > max) {
    errors.push(`${path} is required and must contain at most ${max} characters`);
  } else if (EXECUTABLE_OR_MUTATION_PATTERN.test(value)) {
    errors.push(`${path} contains executable or mutation instructions`);
  }
}

function validatePrepBriefing(taskRun: AiTaskRun, value: Record<string, unknown>): string[] {
  const errors: string[] = [];
  validatePrepAnswerState(value, errors);
  hasOnlyFields(value, new Set([
    "no_answer", "insufficiency_reason", "body", "bullets", "sources", "confidence_reason"
  ]), "output", errors);
  if (value.no_answer === true) {
    if (value.body !== "" || !Array.isArray(value.bullets) || value.bullets.length !== 0
      || !Array.isArray(value.sources) || value.sources.length !== 0) {
      errors.push("no_answer=true requires empty body, bullets, and sources");
    }
    return errors;
  }
  validateSafeText(value.body, "body", 3000, errors);
  if (!Array.isArray(value.bullets) || value.bullets.length < 3 || value.bullets.length > 5) {
    errors.push("prep briefing requires three to five bullets");
  } else {
    value.bullets.forEach((bullet, index) => validateSafeText(bullet, `bullets[${index}]`, 240, errors));
  }
  validateSourceIds(value.sources, "output", errors, new Set(taskRun.allowed_source_ids));
  return errors;
}

const PREP_SCOPES = new Set([
  "objective", "opening_scene", "scene_notes", "prep_checklist", "pinned_entities", "active_threads"
]);

function validateSessionSuggestions(taskRun: AiTaskRun, value: Record<string, unknown>): string[] {
  const errors: string[] = [];
  validatePrepAnswerState(value, errors);
  hasOnlyFields(value, new Set([
    "no_answer", "insufficiency_reason", "summary", "suggestions", "confidence_reason"
  ]), "output", errors);
  if (value.no_answer === true) {
    if (!Array.isArray(value.suggestions) || value.suggestions.length !== 0) {
      errors.push("no_answer=true requires an empty suggestions array");
    }
    return errors;
  }
  validateSafeText(value.summary, "summary", 1000, errors);
  if (!Array.isArray(value.suggestions) || value.suggestions.length < 1 || value.suggestions.length > 8) {
    errors.push("session prep suggestions must contain one to eight items");
    return errors;
  }
  value.suggestions.forEach((candidate, index) => {
    const path = `suggestions[${index}]`;
    if (!isRecord(candidate)) {
      errors.push(`${path} must be an object`);
      return;
    }
    hasOnlyFields(candidate, new Set([
      "id", "scope", "value", "items", "rationale", "sources", "confidence_reason"
    ]), path, errors);
    if (!isString(candidate.id)) errors.push(`${path}.id is required`);
    if (!isString(candidate.scope) || !PREP_SCOPES.has(candidate.scope)) {
      errors.push(`${path}.scope is unsupported`);
    }
    const textScope = new Set(["objective", "opening_scene", "scene_notes"]).has(String(candidate.scope));
    const itemScope = new Set(["prep_checklist", "pinned_entities", "active_threads"]).has(String(candidate.scope));
    if (textScope) validateSafeText(candidate.value, `${path}.value`, 3000, errors);
    if (itemScope) {
      if (!Array.isArray(candidate.items) || candidate.items.length < 1 || candidate.items.length > 12
        || candidate.items.some((item) => !isString(item))) {
        errors.push(`${path}.items must contain one to twelve strings`);
      } else if ((candidate.scope === "pinned_entities" || candidate.scope === "active_threads")
        && candidate.items.some((item) => !isUuid(item))) {
        errors.push(`${path}.items must use UUIDs for pin or Thread suggestions`);
      }
    }
    if (textScope && candidate.items !== undefined) errors.push(`${path}.items is unsupported for text scope`);
    if (itemScope && candidate.value !== undefined) errors.push(`${path}.value is unsupported for item scope`);
    validateSafeText(candidate.rationale, `${path}.rationale`, 500, errors);
    validateSourceIds(candidate.sources, path, errors, new Set(taskRun.allowed_source_ids));
    validateConfidence(candidate.confidence_reason, path, errors);
  });
  return errors;
}

function validateSceneBeats(taskRun: AiTaskRun, value: Record<string, unknown>): string[] {
  const errors: string[] = [];
  validatePrepAnswerState(value, errors);
  hasOnlyFields(value, new Set([
    "no_answer", "insufficiency_reason", "beats", "confidence_reason"
  ]), "output", errors);
  if (value.no_answer === true) {
    if (!Array.isArray(value.beats) || value.beats.length !== 0) {
      errors.push("no_answer=true requires an empty beats array");
    }
    return errors;
  }
  if (!Array.isArray(value.beats) || value.beats.length !== 3) {
    errors.push("scene beats must contain exactly three items");
    return errors;
  }
  value.beats.forEach((candidate, index) => {
    const path = `beats[${index}]`;
    if (!isRecord(candidate)) {
      errors.push(`${path} must be an object`);
      return;
    }
    hasOnlyFields(candidate, new Set([
      "id", "summary", "narrative", "entities_involved", "thread_implication", "sources"
    ]), path, errors);
    if (!isString(candidate.id)) errors.push(`${path}.id is required`);
    validateSafeText(candidate.summary, `${path}.summary`, 80, errors);
    validateSafeText(candidate.narrative, `${path}.narrative`, 1200, errors);
    if (!Array.isArray(candidate.entities_involved)
      || candidate.entities_involved.some((entry) => !isString(entry))) {
      errors.push(`${path}.entities_involved must be a string array`);
    }
    if (candidate.thread_implication !== undefined) {
      validateSafeText(candidate.thread_implication, `${path}.thread_implication`, 500, errors);
    }
    validateSourceIds(candidate.sources, path, errors, new Set(taskRun.allowed_source_ids));
  });
  return errors;
}

function validateNpcCandidates(taskRun: AiTaskRun, value: Record<string, unknown>): string[] {
  const errors: string[] = [];
  validatePrepAnswerState(value, errors);
  hasOnlyFields(value, new Set([
    "no_answer", "insufficiency_reason", "candidates", "confidence_reason"
  ]), "output", errors);
  if (value.no_answer === true) {
    if (!Array.isArray(value.candidates) || value.candidates.length !== 0) {
      errors.push("no_answer=true requires an empty candidates array");
    }
    return errors;
  }
  if (!Array.isArray(value.candidates) || value.candidates.length < 1 || value.candidates.length > 3) {
    errors.push("NPC candidates must contain one to three items");
    return errors;
  }
  value.candidates.forEach((candidate, index) => {
    const path = `candidates[${index}]`;
    if (!isRecord(candidate)) {
      errors.push(`${path} must be an object`);
      return;
    }
    hasOnlyFields(candidate, new Set([
      "id", "name", "summary", "role_in_scene", "relationship_hooks", "sources"
    ]), path, errors);
    if (!isString(candidate.id)) errors.push(`${path}.id is required`);
    validateSafeText(candidate.name, `${path}.name`, 200, errors);
    validateSafeText(candidate.summary, `${path}.summary`, 500, errors);
    validateSafeText(candidate.role_in_scene, `${path}.role_in_scene`, 200, errors);
    if (!Array.isArray(candidate.relationship_hooks) || candidate.relationship_hooks.length > 5
      || candidate.relationship_hooks.some((entry) => !isString(entry) || entry.length > 240)) {
      errors.push(`${path}.relationship_hooks must be a bounded string array`);
    }
    validateSourceIds(candidate.sources, path, errors, new Set(taskRun.allowed_source_ids));
  });
  return errors;
}

function validateQuickStubProposal(taskRun: AiTaskRun, value: Record<string, unknown>): string[] {
  const errors: string[] = [];
  validatePrepAnswerState(value, errors);
  hasOnlyFields(value, new Set([
    "no_answer", "insufficiency_reason", "proposal", "confidence_reason"
  ]), "output", errors);
  if (value.no_answer === true) {
    if (value.proposal !== null) errors.push("no_answer=true requires a null proposal");
    return errors;
  }
  if (!isRecord(value.proposal)) {
    errors.push("proposal must be an object");
    return errors;
  }
  hasOnlyFields(value.proposal, new Set([
    "summary", "narrative", "relationships", "proposed_scope", "sources"
  ]), "proposal", errors);
  validateSafeText(value.proposal.summary, "proposal.summary", 500, errors);
  validateSafeText(value.proposal.narrative, "proposal.narrative", 3000, errors);
  if (!Array.isArray(value.proposal.relationships) || value.proposal.relationships.length > 8
    || value.proposal.relationships.some((entry) => !isString(entry) || entry.length > 300)) {
    errors.push("proposal.relationships must be a bounded string array");
  }
  if (value.proposal.proposed_scope !== "saga") {
    errors.push("proposal.proposed_scope must be saga");
  }
  validateSourceIds(value.proposal.sources, "proposal", errors, new Set(taskRun.allowed_source_ids));
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
  let substantiveCount = 0;
  let totalTextLength = 0;
  normalized.blocks.forEach((candidate, index) => {
    const path = `blocks[${index}]`;
    if (!isRecord(candidate) || !isString(candidate.type)) {
      errors.push(`${path} must be a typed object`);
      return;
    }

    if (candidate.type === "grounded_answer") {
      groundedCount += 1;
      substantiveCount += 1;
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

    if (candidate.type === "grounded_proposal") {
      groundedCount += 1;
      substantiveCount += 1;
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

    if (candidate.type === "creative_proposal") {
      substantiveCount += 1;
      hasOnlyFields(candidate, new Set(["type", "text"]), path, errors);
      if (!isString(candidate.text) || candidate.text.length > 1500) {
        errors.push(`${path}.text is required and must be bounded`);
      } else {
        totalTextLength += candidate.text.length;
        if (EXECUTABLE_OR_MUTATION_PATTERN.test(candidate.text)) {
          errors.push(`${path}.text contains executable or mutation instructions`);
        }
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
  if (normalized.no_answer === false && (substantiveCount < 1 || substantiveCount > 4)) {
    errors.push("no_answer=false requires one to four answer or proposal paragraphs");
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

  if (taskRun.task_name === "compose_prep_briefing") {
    errors.push(...validatePrepBriefing(taskRun, value));
  }

  if (taskRun.task_name === "generate_session_prep") {
    errors.push(...validateSessionSuggestions(taskRun, value));
  }

  if (taskRun.task_name === "propose_scene_beats") {
    errors.push(...validateSceneBeats(taskRun, value));
  }

  if (taskRun.task_name === "propose_npc_for_scene") {
    errors.push(...validateNpcCandidates(taskRun, value));
  }

  if (taskRun.task_name === "propose_quick_stub_fleshing") {
    errors.push(...validateQuickStubProposal(taskRun, value));
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
