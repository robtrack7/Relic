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
const GUIDE_READ_TYPES = new Set(["character", "place", "faction", "artifact", "thread", "session"]);
const LOOM_RECORD_TYPES = new Set(["character", "place", "faction", "artifact", "thread", "note"]);
const LOOM_RELATIONSHIP_TYPES = new Set(["character", "place", "faction", "artifact", "thread"]);
const LOOM_THREAD_STATES = new Set(["active", "loose", "dormant", "resolved", "failed"]);
const LOOM_OBJECTIVE_OPERATIONS = new Set(["create", "edit", "complete", "reopen", "move"]);
const LOOM_PREP_TASKS = new Set([
  "compose_prep_briefing", "generate_session_prep", "propose_scene_beats",
  "propose_thread_complication", "propose_npc_for_scene", "propose_quick_stub_fleshing"
]);
const LOOM_PREP_REGENERATE_SCOPES = new Set([
  "all", "objective", "opening_scene", "scene_notes", "pinned_entities", "active_threads", "prep_checklist"
]);
const GUIDE_NAVIGATION_DESTINATIONS = new Set(["home", "library", "threads", "sessions", "review", "search"]);
const WORKSHOP_RELATIONSHIP_KINDS = new Set([
  "member-of", "located-at", "owns", "allied-with", "opposed-to", "related-to"
]);
const WORKSHOP_TEMP_ID = /^[a-z][a-z0-9-]{1,48}$/;
const WORKSHOP_TAG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const WORKSHOP_OUTLINE_FIELDS = new Set([
  "premise", "tone", "central_conflict", "starting_place", "first_session_hook",
  "characters", "factions", "threads", "gm_secrets"
]);
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

function validateWorkshopPlan(value: Record<string, unknown>): string[] {
  const errors: string[] = [];
  hasOnlyFields(value, new Set([
    "summary", "detected_elements", "contradiction_flags", "questions", "confidence_reason"
  ]), "output", errors);
  validateSafeText(value.summary, "summary", 3000, errors);
  if (!isRecord(value.detected_elements)) {
    errors.push("detected_elements must be an object");
  } else {
    hasOnlyFields(value.detected_elements, WORKSHOP_OUTLINE_FIELDS, "detected_elements", errors);
    for (const [field, candidate] of Object.entries(value.detected_elements)) {
      if (["characters", "factions", "threads", "gm_secrets"].includes(field)) {
        if (!Array.isArray(candidate) || candidate.length > 12
          || candidate.some((entry) => !isString(entry) || entry.length > 500)) {
          errors.push(`detected_elements.${field} must be a bounded string array`);
        }
      } else if (!isString(candidate) || candidate.length > 2000) {
        errors.push(`detected_elements.${field} must be bounded text`);
      }
    }
  }
  if (!Array.isArray(value.contradiction_flags) || value.contradiction_flags.length > 5) {
    errors.push("contradiction_flags must contain at most five items");
  } else value.contradiction_flags.forEach((flag, index) => {
    const path = `contradiction_flags[${index}]`;
    if (!isRecord(flag)) return errors.push(`${path} must be an object`);
    hasOnlyFields(flag, new Set(["field", "description"]), path, errors);
    if (!isString(flag.field) || !WORKSHOP_OUTLINE_FIELDS.has(flag.field)) errors.push(`${path}.field is invalid`);
    validateSafeText(flag.description, `${path}.description`, 500, errors);
  });
  const ids = new Set<string>();
  if (!Array.isArray(value.questions) || value.questions.length < 3 || value.questions.length > 5) {
    errors.push("questions must contain three to five items");
  } else value.questions.forEach((question, index) => {
    const path = `questions[${index}]`;
    if (!isRecord(question)) return errors.push(`${path} must be an object`);
    hasOnlyFields(question, new Set(["id", "prompt", "rationale", "outline_field"]), path, errors);
    if (!isString(question.id) || !WORKSHOP_TEMP_ID.test(question.id) || ids.has(question.id)) {
      errors.push(`${path}.id must be a unique stable identifier`);
    } else ids.add(question.id);
    validateSafeText(question.prompt, `${path}.prompt`, 500, errors);
    validateSafeText(question.rationale, `${path}.rationale`, 500, errors);
    if (!isString(question.outline_field) || !WORKSHOP_OUTLINE_FIELDS.has(question.outline_field)) {
      errors.push(`${path}.outline_field is invalid`);
    }
  });
  validateConfidence(value.confidence_reason, "output", errors);
  return errors;
}

function validateWorkshopSection(taskRun: AiTaskRun, value: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const allowed = new Set(taskRun.allowed_source_ids);
  const expectedKind = String(taskRun.input_payload?.section_kind ?? "");
  const expectedTarget = taskRun.input_payload?.target_temp_id;
  hasOnlyFields(value, new Set(["section_kind", "target_temp_id", "replacement", "confidence_reason"]), "output", errors);
  if (!new Set(["saga", "world_updates", "entity", "relationships", "gm_secrets", "session_1_prep"]).has(String(value.section_kind))
    || value.section_kind !== expectedKind) errors.push("section_kind must match the requested section");
  if (expectedKind === "entity") {
    if (!isString(value.target_temp_id) || value.target_temp_id !== expectedTarget) errors.push("target_temp_id must match the requested entity");
  } else if (value.target_temp_id !== undefined) errors.push("target_temp_id is only permitted for entity regeneration");
  const replacement = value.replacement;
  if (expectedKind === "saga") {
    if (!isRecord(replacement)) errors.push("replacement must be a Saga object");
    else {
      hasOnlyFields(replacement, new Set(["name", "premise", "tone", "central_conflict", "first_session_hook", "game_system"]), "replacement", errors);
      validateSafeText(replacement.name, "replacement.name", 120, errors);
      validateSafeText(replacement.premise, "replacement.premise", 3000, errors);
      validateSafeText(replacement.tone, "replacement.tone", 500, errors);
      validateSafeText(replacement.central_conflict, "replacement.central_conflict", 1500, errors);
      validateSafeText(replacement.first_session_hook, "replacement.first_session_hook", 1500, errors);
      if (replacement.game_system !== null && replacement.game_system !== undefined) validateSafeText(replacement.game_system, "replacement.game_system", 120, errors);
    }
  } else if (expectedKind === "world_updates") {
    if (!isRecord(replacement)) errors.push("replacement must be a World update object");
    else {
      hasOnlyFields(replacement, new Set(["summary", "world_ai_context"]), "replacement", errors);
      if (replacement.summary !== undefined) validateSafeText(replacement.summary, "replacement.summary", 2000, errors);
      if (replacement.world_ai_context !== undefined) validateSafeText(replacement.world_ai_context, "replacement.world_ai_context", 5000, errors);
    }
  } else if (expectedKind === "entity") {
    if (!isRecord(replacement)) errors.push("replacement must be an entity object");
    else {
      hasOnlyFields(replacement, new Set(["temp_id", "entity_type", "name", "summary", "narrative", "gm_notes", "status", "tags", "is_stub", "proposed_scope", "sources"]), "replacement", errors);
      if (replacement.temp_id !== expectedTarget || !isString(replacement.temp_id)) errors.push("replacement.temp_id must preserve the entity target");
      if (!isString(replacement.entity_type) || !GUIDE_ENTITY_TYPES.has(replacement.entity_type)) errors.push("replacement.entity_type is invalid");
      validateSafeText(replacement.name, "replacement.name", 200, errors);
      validateSafeText(replacement.summary, "replacement.summary", 500, errors);
      validateSafeText(replacement.narrative, "replacement.narrative", 5000, errors);
      if (replacement.gm_notes !== undefined && replacement.gm_notes !== "") validateSafeText(replacement.gm_notes, "replacement.gm_notes", 2000, errors);
      if (replacement.status !== undefined) validateSafeText(replacement.status, "replacement.status", 80, errors);
      if (!Array.isArray(replacement.tags) || replacement.tags.length > 12 || replacement.tags.some((tag) => !isString(tag) || !WORKSHOP_TAG.test(tag))) errors.push("replacement.tags are invalid");
      if (typeof replacement.is_stub !== "boolean") errors.push("replacement.is_stub must be boolean");
      if (replacement.proposed_scope !== "saga") errors.push("replacement.proposed_scope must remain saga");
      validateSourceIds(replacement.sources, "replacement", errors, allowed);
    }
  } else if (expectedKind === "relationships") {
    if (!Array.isArray(replacement) || replacement.length > 20) errors.push("replacement must be a bounded relationship array");
    else replacement.forEach((entry, index) => {
      const path = `replacement[${index}]`;
      if (!isRecord(entry)) return errors.push(`${path} must be an object`);
      hasOnlyFields(entry, new Set(["source_temp_id", "target_temp_id", "kind", "notes", "sources"]), path, errors);
      if (!isString(entry.source_temp_id) || !WORKSHOP_TEMP_ID.test(entry.source_temp_id)) errors.push(`${path}.source_temp_id is invalid`);
      if (!isString(entry.target_temp_id) || !WORKSHOP_TEMP_ID.test(entry.target_temp_id)) errors.push(`${path}.target_temp_id is invalid`);
      if (!isString(entry.kind) || !WORKSHOP_RELATIONSHIP_KINDS.has(entry.kind)) errors.push(`${path}.kind is invalid`);
      if (entry.notes !== undefined) validateSafeText(entry.notes, `${path}.notes`, 500, errors);
      validateSourceIds(entry.sources, path, errors, allowed);
    });
  } else if (expectedKind === "gm_secrets") {
    if (!Array.isArray(replacement) || replacement.length < 1 || replacement.length > 5) errors.push("replacement must contain one to five GM secrets");
    else replacement.forEach((entry, index) => {
      const path = `replacement[${index}]`;
      if (!isRecord(entry)) return errors.push(`${path} must be an object`);
      hasOnlyFields(entry, new Set(["text", "sources"]), path, errors);
      validateSafeText(entry.text, `${path}.text`, 1000, errors);
      validateSourceIds(entry.sources, path, errors, allowed);
    });
  } else if (expectedKind === "session_1_prep") {
    if (!isRecord(replacement)) errors.push("replacement must be a Session 1 prep object");
    else {
      hasOnlyFields(replacement, new Set(["objective", "opening_scene", "scene_notes", "prep_checklist", "pinned_temp_ids", "active_thread_temp_ids"]), "replacement", errors);
      validateSafeText(replacement.objective, "replacement.objective", 1000, errors);
      validateSafeText(replacement.opening_scene, "replacement.opening_scene", 3000, errors);
      validateSafeText(replacement.scene_notes, "replacement.scene_notes", 5000, errors);
      if (!Array.isArray(replacement.prep_checklist) || replacement.prep_checklist.length < 3 || replacement.prep_checklist.length > 5) errors.push("replacement.prep_checklist requires three to five items");
      else replacement.prep_checklist.forEach((entry, index) => {
        const path = `replacement.prep_checklist[${index}]`;
        if (!isRecord(entry)) return errors.push(`${path} must be an object`);
        hasOnlyFields(entry, new Set(["text", "sources"]), path, errors);
        validateSafeText(entry.text, `${path}.text`, 300, errors);
        validateSourceIds(entry.sources, path, errors, allowed);
      });
      for (const field of ["pinned_temp_ids", "active_thread_temp_ids"] as const) {
        if (!Array.isArray(replacement[field]) || replacement[field].some((id) => !isString(id) || !WORKSHOP_TEMP_ID.test(id))) errors.push(`replacement.${field} is invalid`);
      }
    }
  }
  validateConfidence(value.confidence_reason, "output", errors);
  return errors;
}

function validateWorkshopScaffold(taskRun: AiTaskRun, value: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const allowed = new Set(taskRun.allowed_source_ids);
  hasOnlyFields(value, new Set([
    "saga", "world_updates", "gm_secrets", "entities", "relationships", "session_1_prep",
    "duplicate_warnings", "confidence_reason"
  ]), "output", errors);
  if (!isRecord(value.saga)) errors.push("saga must be an object");
  else {
    hasOnlyFields(value.saga, new Set([
      "name", "premise", "tone", "central_conflict", "first_session_hook", "game_system"
    ]), "saga", errors);
    validateSafeText(value.saga.name, "saga.name", 120, errors);
    validateSafeText(value.saga.premise, "saga.premise", 3000, errors);
    validateSafeText(value.saga.tone, "saga.tone", 500, errors);
    validateSafeText(value.saga.central_conflict, "saga.central_conflict", 1500, errors);
    validateSafeText(value.saga.first_session_hook, "saga.first_session_hook", 1500, errors);
    if (value.saga.game_system !== null && value.saga.game_system !== undefined) {
      validateSafeText(value.saga.game_system, "saga.game_system", 120, errors);
    }
  }
  if (value.world_updates !== undefined) {
    if (!isRecord(value.world_updates)) errors.push("world_updates must be an object");
    else {
      hasOnlyFields(value.world_updates, new Set(["summary", "world_ai_context"]), "world_updates", errors);
      if (value.world_updates.summary !== undefined) validateSafeText(value.world_updates.summary, "world_updates.summary", 2000, errors);
      if (value.world_updates.world_ai_context !== undefined) validateSafeText(value.world_updates.world_ai_context, "world_updates.world_ai_context", 5000, errors);
    }
  }
  if (!Array.isArray(value.gm_secrets) || value.gm_secrets.length < 1 || value.gm_secrets.length > 5) {
    errors.push("gm_secrets must contain one to five items");
  } else value.gm_secrets.forEach((secret, index) => {
    const path = `gm_secrets[${index}]`;
    if (!isRecord(secret)) return errors.push(`${path} must be an object`);
    hasOnlyFields(secret, new Set(["text", "sources"]), path, errors);
    validateSafeText(secret.text, `${path}.text`, 1000, errors);
    validateSourceIds(secret.sources, path, errors, allowed);
  });
  const ids = new Set<string>();
  const types = new Map<string, string>();
  if (!Array.isArray(value.entities) || value.entities.length < 6 || value.entities.length > 14) {
    errors.push("entities must contain six to fourteen items");
  } else value.entities.forEach((entry, index) => {
    const path = `entities[${index}]`;
    if (!isRecord(entry)) return errors.push(`${path} must be an object`);
    hasOnlyFields(entry, new Set([
      "temp_id", "entity_type", "name", "summary", "narrative", "gm_notes", "status", "tags",
      "is_stub", "proposed_scope", "sources"
    ]), path, errors);
    if (!isString(entry.temp_id) || !WORKSHOP_TEMP_ID.test(entry.temp_id)) errors.push(`${path}.temp_id is invalid`);
    else if (ids.has(entry.temp_id)) errors.push(`${path}.temp_id must be unique`);
    else { ids.add(entry.temp_id); types.set(entry.temp_id, String(entry.entity_type)); }
    if (!isString(entry.entity_type) || !GUIDE_ENTITY_TYPES.has(entry.entity_type)) errors.push(`${path}.entity_type is invalid`);
    validateSafeText(entry.name, `${path}.name`, 200, errors);
    validateSafeText(entry.summary, `${path}.summary`, 500, errors);
    validateSafeText(entry.narrative, `${path}.narrative`, 5000, errors);
    if (entry.gm_notes !== undefined && entry.gm_notes !== "") validateSafeText(entry.gm_notes, `${path}.gm_notes`, 2000, errors);
    if (entry.status !== undefined) validateSafeText(entry.status, `${path}.status`, 80, errors);
    if (!Array.isArray(entry.tags) || entry.tags.length > 12
      || entry.tags.some((tag) => !isString(tag) || tag.length > 50 || !WORKSHOP_TAG.test(tag))) {
      errors.push(`${path}.tags must be lowercase hyphenated strings`);
    }
    if (typeof entry.is_stub !== "boolean") errors.push(`${path}.is_stub must be boolean`);
    if (entry.proposed_scope !== "saga") errors.push(`${path}.proposed_scope must be saga`);
    validateSourceIds(entry.sources, path, errors, allowed);
  });
  if (Array.isArray(value.entities)) {
    const counts = Object.fromEntries([...GUIDE_ENTITY_TYPES].map((type) => [type, 0])) as Record<string, number>;
    value.entities.forEach((entry) => { if (isRecord(entry) && typeof entry.entity_type === "string") counts[entry.entity_type] = (counts[entry.entity_type] ?? 0) + 1; });
    if (counts.place !== 1) errors.push("entities must include exactly one starting Place");
    if (counts.character < 3 || counts.character > 6) errors.push("entities must include three to six Characters");
    if (counts.faction < 1 || counts.faction > 3) errors.push("entities must include one to three Factions");
    if (counts.thread < 1 || counts.thread > 3) errors.push("entities must include one to three Threads");
  }
  if (!Array.isArray(value.relationships) || value.relationships.length > 20) errors.push("relationships must be a bounded array");
  else value.relationships.forEach((entry, index) => {
    const path = `relationships[${index}]`;
    if (!isRecord(entry)) return errors.push(`${path} must be an object`);
    hasOnlyFields(entry, new Set(["source_temp_id", "target_temp_id", "kind", "notes", "sources"]), path, errors);
    if (!isString(entry.source_temp_id) || !ids.has(entry.source_temp_id)) errors.push(`${path}.source_temp_id is unknown`);
    if (!isString(entry.target_temp_id) || !ids.has(entry.target_temp_id)) errors.push(`${path}.target_temp_id is unknown`);
    if (!isString(entry.kind) || !WORKSHOP_RELATIONSHIP_KINDS.has(entry.kind)) errors.push(`${path}.kind is invalid`);
    if (entry.notes !== undefined) validateSafeText(entry.notes, `${path}.notes`, 500, errors);
    validateSourceIds(entry.sources, path, errors, allowed);
  });
  if (!isRecord(value.session_1_prep)) errors.push("session_1_prep must be an object");
  else {
    const prep = value.session_1_prep;
    hasOnlyFields(prep, new Set([
      "objective", "opening_scene", "scene_notes", "prep_checklist", "pinned_temp_ids", "active_thread_temp_ids"
    ]), "session_1_prep", errors);
    validateSafeText(prep.objective, "session_1_prep.objective", 1000, errors);
    validateSafeText(prep.opening_scene, "session_1_prep.opening_scene", 3000, errors);
    validateSafeText(prep.scene_notes, "session_1_prep.scene_notes", 5000, errors);
    if (!Array.isArray(prep.prep_checklist) || prep.prep_checklist.length < 3 || prep.prep_checklist.length > 5) errors.push("session_1_prep.prep_checklist requires three to five items");
    else prep.prep_checklist.forEach((item, index) => {
      if (!isRecord(item)) return errors.push(`session_1_prep.prep_checklist[${index}] must be an object`);
      hasOnlyFields(item, new Set(["text", "sources"]), `session_1_prep.prep_checklist[${index}]`, errors);
      validateSafeText(item.text, `session_1_prep.prep_checklist[${index}].text`, 300, errors);
      validateSourceIds(item.sources, `session_1_prep.prep_checklist[${index}]`, errors, allowed);
    });
    for (const field of ["pinned_temp_ids", "active_thread_temp_ids"] as const) {
      if (!Array.isArray(prep[field]) || prep[field].some((id) => !isString(id) || !ids.has(id))) errors.push(`session_1_prep.${field} contains an unknown temp id`);
    }
    if (Array.isArray(prep.active_thread_temp_ids) && prep.active_thread_temp_ids.some((id) => types.get(String(id)) !== "thread")) errors.push("active_thread_temp_ids may reference Threads only");
  }
  if (!Array.isArray(value.duplicate_warnings) || value.duplicate_warnings.length > 8) errors.push("duplicate_warnings must be a bounded array");
  else value.duplicate_warnings.forEach((warning, index) => {
    const path = `duplicate_warnings[${index}]`;
    if (!isRecord(warning)) return errors.push(`${path} must be an object`);
    hasOnlyFields(warning, new Set(["name", "reason", "target_entity_id", "sources"]), path, errors);
    validateSafeText(warning.name, `${path}.name`, 200, errors);
    validateSafeText(warning.reason, `${path}.reason`, 500, errors);
    if (warning.target_entity_id !== undefined && !isUuid(warning.target_entity_id)) errors.push(`${path}.target_entity_id must be a UUID`);
    validateSourceIds(warning.sources, path, errors, allowed);
  });
  validateConfidence(value.confidence_reason, "output", errors);
  return errors;
}

function validateDeepEntityDraft(taskRun: AiTaskRun, value: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const allowed = new Set(taskRun.allowed_source_ids);
  hasOnlyFields(value, new Set(["entity", "sources", "relationship_hooks", "suggested_fields", "duplicate_warnings", "confidence_reason"]), "output", errors);
  if (!isRecord(value.entity)) errors.push("draft output requires an entity object");
  else {
    hasOnlyFields(value.entity, new Set(["entity_type", "name", "summary", "narrative", "gm_notes", "is_stub", "proposed_scope"]), "entity", errors);
    if (!isString(value.entity.entity_type) || !GUIDE_ENTITY_TYPES.has(value.entity.entity_type)) errors.push("entity.entity_type is invalid");
    validateSafeText(value.entity.name, "entity.name", 200, errors);
    validateSafeText(value.entity.summary, "entity.summary", 1000, errors);
    validateSafeText(value.entity.narrative, "entity.narrative", 6000, errors);
    if (value.entity.gm_notes !== undefined && value.entity.gm_notes !== "") validateSafeText(value.entity.gm_notes, "entity.gm_notes", 2000, errors);
    if (typeof value.entity.is_stub !== "boolean") errors.push("entity.is_stub must be boolean");
    if (value.entity.proposed_scope !== "saga") errors.push("entity.proposed_scope must be saga");
  }
  validateSourceIds(value.sources, "output", errors, allowed);
  for (const field of ["relationship_hooks", "duplicate_warnings"] as const) {
    if (!Array.isArray(value[field]) || value[field].length > 8 || value[field].some((item) => !isString(item) || item.length > 500 || EXECUTABLE_OR_MUTATION_PATTERN.test(item))) errors.push(`${field} must be a bounded safe string array`);
  }
  if (!isRecord(value.suggested_fields) || Object.keys(value.suggested_fields).length > 8) errors.push("suggested_fields must be a bounded object");
  validateConfidence(value.confidence_reason, "output", errors);
  return errors;
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

function registeredLoomAction(
  taskRun: AiTaskRun,
  name: string,
  version: string
) {
  const manifest = taskRun.input_payload?.action_manifest;
  if (!Array.isArray(manifest)) return false;
  return manifest.some((entry) => isRecord(entry)
    && entry.name === name
    && entry.version === version);
}

function validateOptionalLoomSources(
  value: unknown,
  path: string,
  taskRun: AiTaskRun,
  errors: string[],
  required = false
) {
  if (!Array.isArray(value) || value.length > 8 || (required && value.length === 0)) {
    errors.push(`${path} must be an array of at most eight allowed source UUIDs`);
    return;
  }
  for (const sourceId of value) {
    if (!isUuid(sourceId) || !taskRun.allowed_source_ids.includes(sourceId)) {
      errors.push(`${path} references a source outside the allowed retrieval set`);
    }
  }
}

function validateLoomRecordPayload(
  entityType: string,
  payload: unknown,
  changeKind: "create" | "update",
  path: string,
  errors: string[]
) {
  if (!LOOM_RECORD_TYPES.has(entityType) || !isRecord(payload) || Object.keys(payload).length === 0
    || JSON.stringify(payload).length > 30000) {
    errors.push(`${path} must be one bounded registered record payload`);
    return;
  }
  const allowed = entityType === "note"
    ? new Set(["title", "body", "note_type"])
    : entityType === "thread"
      ? new Set(["name", "summary", "narrative", "gm_notes", "objective", "resolution_state", "is_loose_thread"])
      : new Set(["name", "summary", "narrative", "gm_notes"]);
  hasOnlyFields(payload, allowed, path, errors);
  const label = entityType === "note" ? "title" : "name";
  if (changeKind === "create" && (!isString(payload[label]) || String(payload[label]).length > 200)) {
    errors.push(`${path}.${label} is required and must contain at most 200 characters`);
  }
  for (const [field, candidate] of Object.entries(payload)) {
    if (field === "is_loose_thread") {
      if (typeof candidate !== "boolean") errors.push(`${path}.${field} must be boolean`);
      continue;
    }
    if (typeof candidate !== "string") {
      errors.push(`${path}.${field} must be text`);
      continue;
    }
    const max = ["name", "title"].includes(field) ? 200 : field === "summary" ? 2000 : 12000;
    if (candidate.length > max) errors.push(`${path}.${field} exceeds ${max} characters`);
  }
  if (entityType === "thread" && payload.resolution_state !== undefined
    && !new Set(["active", "dormant", "resolved", "failed"]).has(String(payload.resolution_state))) {
    errors.push(`${path}.resolution_state is invalid`);
  }
  if (entityType === "note" && payload.note_type !== undefined
    && !new Set(["lore", "quick_capture", "summary"]).has(String(payload.note_type))) {
    errors.push(`${path}.note_type is invalid`);
  }
}

function validateLoomAction(
  taskRun: AiTaskRun,
  action: Record<string, unknown>,
  path: string,
  errors: string[]
) {
  hasOnlyFields(action, new Set(["name", "version", "arguments"]), path, errors);
  if (!isString(action.name) || !isString(action.version) || !isRecord(action.arguments)) {
    errors.push(`${path} must contain registered name, version, and arguments`);
    return;
  }
  if (!registeredLoomAction(taskRun, action.name, action.version)) {
    errors.push(`${path} name and version are not in the server action manifest`);
    return;
  }
  const args = action.arguments;
  if (action.name === "open_record" && action.version === "1.0.0") {
    hasOnlyFields(args, new Set(["source_id"]), `${path}.arguments`, errors);
    if (!isUuid(args.source_id) || !taskRun.allowed_source_ids.includes(args.source_id)) {
      errors.push(`${path}.arguments.source_id must belong to the allowed retrieval set`);
      return;
    }
    const evidence = taskRun.retrieval_context?.find((entry) => entry.source_id === args.source_id);
    if (!evidence || !isString(evidence.source_entity_type)
      || !GUIDE_READ_TYPES.has(evidence.source_entity_type)
      || !isUuid(evidence.source_entity_id)) {
      errors.push(`${path}.arguments.source_id must identify a current supported entity record`);
    }
    return;
  }
  if (action.name === "list_records" && action.version === "1.0.0") {
    hasOnlyFields(args, new Set(["record_type", "status", "limit"]), `${path}.arguments`, errors);
    if (!isString(args.record_type) || !GUIDE_READ_TYPES.has(args.record_type)) {
      errors.push(`${path}.arguments.record_type is unsupported`);
    }
    if (args.status !== undefined && (typeof args.status !== "string" || args.status.length > 40
      || !/^[a-z_ -]+$/.test(args.status))) {
      errors.push(`${path}.arguments.status is invalid`);
    }
    if (args.limit !== undefined && (!Number.isInteger(args.limit) || Number(args.limit) < 1 || Number(args.limit) > 20)) {
      errors.push(`${path}.arguments.limit must be an integer from 1 to 20`);
    }
    return;
  }
  if ((action.name === "show_source" || action.name === "explain_provenance")
    && action.version === "1.0.0") {
    hasOnlyFields(args, new Set(["source_id"]), `${path}.arguments`, errors);
    if (!isUuid(args.source_id) || !taskRun.allowed_source_ids.includes(args.source_id)) {
      errors.push(`${path}.arguments.source_id must belong to the allowed retrieval set`);
    }
    return;
  }
  if (action.name === "navigate_surface" && action.version === "1.0.0") {
    hasOnlyFields(args, new Set(["destination", "query"]), `${path}.arguments`, errors);
    if (!isString(args.destination) || !GUIDE_NAVIGATION_DESTINATIONS.has(args.destination)) {
      errors.push(`${path}.arguments.destination is unsupported`);
    }
    if (args.query !== undefined && (typeof args.query !== "string" || args.query.length > 200
      || EXECUTABLE_OR_MUTATION_PATTERN.test(args.query))) {
      errors.push(`${path}.arguments.query is invalid`);
    }
    return;
  }
  if (action.name === "draft_entity" && action.version === "1.0.0") {
    hasOnlyFields(args, new Set(["entity_type", "intent"]), `${path}.arguments`, errors);
    if (!isString(args.entity_type) || !GUIDE_ENTITY_TYPES.has(args.entity_type)) {
      errors.push(`${path}.arguments.entity_type is unsupported`);
    }
    if (!isString(args.intent) || args.intent.length > 500
      || EXECUTABLE_OR_MUTATION_PATTERN.test(args.intent)) {
      errors.push(`${path}.arguments.intent is required, bounded, and non-executable`);
    }
    return;
  }
  if (action.name === "propose_record_create" && action.version === "1.0.0") {
    hasOnlyFields(args, new Set(["entity_type", "payload", "source_ids"]), `${path}.arguments`, errors);
    if (!isString(args.entity_type) || !LOOM_RECORD_TYPES.has(args.entity_type)) {
      errors.push(`${path}.arguments.entity_type is unsupported`);
      return;
    }
    validateLoomRecordPayload(args.entity_type, args.payload, "create", `${path}.arguments.payload`, errors);
    validateOptionalLoomSources(args.source_ids, `${path}.arguments.source_ids`, taskRun, errors);
    return;
  }
  if (action.name === "propose_record_update" && action.version === "1.0.0") {
    hasOnlyFields(args, new Set(["source_id", "changes", "source_ids"]), `${path}.arguments`, errors);
    if (!isUuid(args.source_id) || !taskRun.allowed_source_ids.includes(args.source_id)) {
      errors.push(`${path}.arguments.source_id must belong to the allowed retrieval set`);
      return;
    }
    const evidence = taskRun.retrieval_context?.find((entry) => entry.source_id === args.source_id);
    if (!evidence || !isString(evidence.source_entity_type) || !LOOM_RECORD_TYPES.has(evidence.source_entity_type)
      || !isUuid(evidence.source_entity_id)) {
      errors.push(`${path}.arguments.source_id must identify a current mutable record`);
      return;
    }
    validateLoomRecordPayload(evidence.source_entity_type, args.changes, "update", `${path}.arguments.changes`, errors);
    if (args.source_ids !== undefined) validateOptionalLoomSources(args.source_ids, `${path}.arguments.source_ids`, taskRun, errors);
    return;
  }
  if ((action.name === "add_relationship" || action.name === "remove_relationship")
    && action.version === "1.0.0") {
    hasOnlyFields(args, new Set(action.name === "add_relationship"
      ? ["from_source_id", "to_source_id", "kind", "notes"]
      : ["from_source_id", "to_source_id", "kind"]), `${path}.arguments`, errors);
    for (const field of ["from_source_id", "to_source_id"] as const) {
      const sourceId = args[field];
      const evidence = taskRun.retrieval_context?.find((entry) => entry.source_id === sourceId);
      if (!isUuid(sourceId) || !taskRun.allowed_source_ids.includes(sourceId)
        || !evidence || !isString(evidence.source_entity_type)
        || !LOOM_RELATIONSHIP_TYPES.has(evidence.source_entity_type) || !isUuid(evidence.source_entity_id)) {
        errors.push(`${path}.arguments.${field} must identify an allowed relationship endpoint`);
      }
    }
    if (args.from_source_id === args.to_source_id) errors.push(`${path}.arguments endpoints must differ`);
    if (!isString(args.kind) || !WORKSHOP_RELATIONSHIP_KINDS.has(args.kind)) errors.push(`${path}.arguments.kind is invalid`);
    if (args.notes !== undefined && (typeof args.notes !== "string" || args.notes.length > 1000)) {
      errors.push(`${path}.arguments.notes is invalid`);
    }
    return;
  }
  if (action.name === "set_thread_state" && action.version === "1.0.0") {
    hasOnlyFields(args, new Set(["source_id", "state", "resolution_details"]), `${path}.arguments`, errors);
    const evidence = taskRun.retrieval_context?.find((entry) => entry.source_id === args.source_id);
    if (!isUuid(args.source_id) || !taskRun.allowed_source_ids.includes(args.source_id)
      || evidence?.source_entity_type !== "thread" || !isUuid(evidence.source_entity_id)) {
      errors.push(`${path}.arguments.source_id must identify an allowed Thread`);
    }
    if (!isString(args.state) || !LOOM_THREAD_STATES.has(args.state)) errors.push(`${path}.arguments.state is invalid`);
    if (["resolved", "failed"].includes(String(args.state)) && !isString(args.resolution_details)) {
      errors.push(`${path}.arguments.resolution_details is required for this state`);
    } else if (args.resolution_details !== undefined
      && (typeof args.resolution_details !== "string" || args.resolution_details.length > 4000)) {
      errors.push(`${path}.arguments.resolution_details is invalid`);
    }
    return;
  }
  if (action.name === "mutate_thread_objective" && action.version === "1.0.0") {
    hasOnlyFields(args, new Set(["source_id", "operation", "objective_text", "new_text", "target_index"]), `${path}.arguments`, errors);
    const evidence = taskRun.retrieval_context?.find((entry) => entry.source_id === args.source_id);
    if (!isUuid(args.source_id) || !taskRun.allowed_source_ids.includes(args.source_id)
      || evidence?.source_entity_type !== "thread" || !isUuid(evidence.source_entity_id)) {
      errors.push(`${path}.arguments.source_id must identify an allowed Thread`);
    }
    if (!isString(args.operation) || !LOOM_OBJECTIVE_OPERATIONS.has(args.operation)) {
      errors.push(`${path}.arguments.operation is invalid`);
      return;
    }
    if (args.operation !== "create" && !isString(args.objective_text)) errors.push(`${path}.arguments.objective_text is required`);
    if (["create", "edit"].includes(args.operation) && !isString(args.new_text)) errors.push(`${path}.arguments.new_text is required`);
    if (typeof args.objective_text === "string" && args.objective_text.length > 1000) errors.push(`${path}.arguments.objective_text is too long`);
    if (typeof args.new_text === "string" && args.new_text.length > 1000) errors.push(`${path}.arguments.new_text is too long`);
    if (args.operation === "move" && (!Number.isInteger(args.target_index) || Number(args.target_index) < 0 || Number(args.target_index) > 100)) {
      errors.push(`${path}.arguments.target_index is invalid`);
    }
    return;
  }
  if (action.name === "create_session" && action.version === "1.0.0") {
    hasOnlyFields(args, new Set(["name", "planned_date", "objective", "opening_scene"]), `${path}.arguments`, errors);
    if (!isString(args.name) || args.name.length > 200) errors.push(`${path}.arguments.name is invalid`);
    if (args.planned_date !== undefined && (typeof args.planned_date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(args.planned_date))) {
      errors.push(`${path}.arguments.planned_date is invalid`);
    }
    if (args.objective !== undefined && (typeof args.objective !== "string" || args.objective.length > 2000)) {
      errors.push(`${path}.arguments.objective is invalid`);
    }
    if (args.opening_scene !== undefined && (typeof args.opening_scene !== "string" || args.opening_scene.length > 4000)) {
      errors.push(`${path}.arguments.opening_scene is invalid`);
    }
    return;
  }
  if (action.name === "open_session_workflow" && action.version === "1.0.0") {
    hasOnlyFields(args, new Set(["session_source_id", "destination"]), `${path}.arguments`, errors);
    if (args.destination === "active_workshop" && args.session_source_id === undefined) return;
    const evidence = taskRun.retrieval_context?.find((entry) => entry.source_id === args.session_source_id);
    if (!isUuid(args.session_source_id) || !taskRun.allowed_source_ids.includes(args.session_source_id)
      || evidence?.source_entity_type !== "session" || !isUuid(evidence.source_entity_id)
      || args.destination !== undefined) {
      errors.push(`${path}.arguments must identify one allowed Session or active_workshop`);
    }
    return;
  }
  if (action.name === "retry_session_transcription" && action.version === "1.0.0") {
    hasOnlyFields(args, new Set(["session_source_id"]), `${path}.arguments`, errors);
    const evidence = taskRun.retrieval_context?.find((entry) => entry.source_id === args.session_source_id);
    if (!isUuid(args.session_source_id) || !taskRun.allowed_source_ids.includes(args.session_source_id)
      || evidence?.source_entity_type !== "session" || !isUuid(evidence.source_entity_id)) {
      errors.push(`${path}.arguments.session_source_id must identify an allowed Session`);
    }
    return;
  }
  if (action.name === "start_prep_task" && action.version === "1.0.0") {
    hasOnlyFields(args, new Set([
      "session_source_id", "task_name", "regenerate_scope", "role_description", "thread_source_id", "stub_source_id"
    ]), `${path}.arguments`, errors);
    const sessionEvidence = taskRun.retrieval_context?.find((entry) => entry.source_id === args.session_source_id);
    if (!isUuid(args.session_source_id) || !taskRun.allowed_source_ids.includes(args.session_source_id)
      || sessionEvidence?.source_entity_type !== "session" || !isUuid(sessionEvidence.source_entity_id)) {
      errors.push(`${path}.arguments.session_source_id must identify an allowed Session`);
    }
    if (!isString(args.task_name) || !LOOM_PREP_TASKS.has(args.task_name)) {
      errors.push(`${path}.arguments.task_name is invalid`);
      return;
    }
    if (args.task_name === "generate_session_prep") {
      if (args.regenerate_scope !== undefined && (!isString(args.regenerate_scope)
        || !LOOM_PREP_REGENERATE_SCOPES.has(args.regenerate_scope))) errors.push(`${path}.arguments.regenerate_scope is invalid`);
    } else if (args.regenerate_scope !== undefined) errors.push(`${path}.arguments.regenerate_scope is not allowed for this task`);
    if (args.task_name === "propose_npc_for_scene") {
      if (!isString(args.role_description) || args.role_description.length > 500) errors.push(`${path}.arguments.role_description is invalid`);
    } else if (args.role_description !== undefined) errors.push(`${path}.arguments.role_description is not allowed for this task`);
    for (const [field, expectedType, requiredTask] of [
      ["thread_source_id", "thread", "propose_thread_complication"],
      ["stub_source_id", null, "propose_quick_stub_fleshing"]
    ] as const) {
      if (args.task_name !== requiredTask) {
        if (args[field] !== undefined) errors.push(`${path}.arguments.${field} is not allowed for this task`);
        continue;
      }
      const evidence = taskRun.retrieval_context?.find((entry) => entry.source_id === args[field]);
      if (!isUuid(args[field]) || !taskRun.allowed_source_ids.includes(args[field] as string)
        || !evidence || (expectedType ? evidence.source_entity_type !== expectedType
          : !LOOM_RELATIONSHIP_TYPES.has(String(evidence.source_entity_type))) || !isUuid(evidence.source_entity_id)) {
        errors.push(`${path}.arguments.${field} must identify an allowed ${expectedType ?? "Quick Stub"}`);
      }
    }
    return;
  }
  errors.push(`${path} action contract is unsupported by this runtime`);
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
      if (!isRecord(candidate.action)) {
        errors.push(`${path}.action must be an allowlisted action object`);
        return;
      }
      validateLoomAction(taskRun, candidate.action, `${path}.action`, errors);
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

  if (taskRun.task_name === "plan_saga_workshop") {
    errors.push(...validateWorkshopPlan(value));
  }

  if (taskRun.task_name === "scaffold_saga") {
    errors.push(...validateWorkshopScaffold(taskRun, value));
  }

  if (taskRun.task_name === "regenerate_saga_scaffold_section") {
    errors.push(...validateWorkshopSection(taskRun, value));
  }

  if (taskRun.task_name === "draft_entity_from_prompt") {
    errors.push(...validateDeepEntityDraft(taskRun, value));
  }

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

  if (taskRun.output_mode === "draft" && taskRun.task_name !== "draft_entity_from_prompt") {
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
