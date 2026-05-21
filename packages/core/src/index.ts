export const relicHierarchy = ["workspace", "world", "era", "saga"] as const;

export const relicModelTiers = ["relic-fast", "relic-balanced", "relic-deep"] as const;

export const relicQuotaTiers = ["light", "standard", "heavy"] as const;

export const relicAiTasks = [
  "scaffold_saga",
  "draft_entity_from_prompt",
  "generate_session_prep",
  "compose_prep_briefing",
  "synthesize_session",
  "propose_scene_beats",
  "propose_thread_complication",
  "propose_npc_for_scene",
  "answer_saga_question",
  "propose_quick_stub_fleshing"
] as const;

export type RelicHierarchyLevel = (typeof relicHierarchy)[number];
export type RelicModelTier = (typeof relicModelTiers)[number];
export type RelicQuotaTier = (typeof relicQuotaTiers)[number];
export type RelicAiTask = (typeof relicAiTasks)[number];
