/**
 * Semantic zoom: what a card *says* at a given scale.
 *
 * Zoom changes information, not pixel size. A card at far zoom is not a small
 * card — it is the same object showing less of itself, because at that scale
 * the question is "what is over there" rather than "what does it say".
 */

export type Tier = "far" | "mid" | "near";

/** Below this, a card is a mark in a cluster. */
export const FAR_EDGE = 0.45;
/** Above this, a card can afford prose, provenance and every claim. */
export const NEAR_EDGE = 1.4;

/**
 * How far past a boundary the scale must travel before the tier changes.
 *
 * Without this, a card sitting exactly on a threshold rewrites itself on every
 * frame of a pan or a trackpad pinch. The tier you are in widens its own
 * boundary, so leaving costs more than staying.
 */
export const HYSTERESIS = 0.05;

function step(scale: number, from: Tier): Tier {
  switch (from) {
    case "far":
      return scale >= FAR_EDGE + HYSTERESIS ? "mid" : "far";
    case "near":
      return scale <= NEAR_EDGE - HYSTERESIS ? "mid" : "near";
    case "mid":
      if (scale <= FAR_EDGE - HYSTERESIS) return "far";
      if (scale >= NEAR_EDGE + HYSTERESIS) return "near";
      return "mid";
  }
}

export function tierFor(scale: number, previous: Tier = "mid"): Tier {
  if (!Number.isFinite(scale)) return previous;

  // Settles rather than moving one tier per call. Fit-to-bounds can take the
  // scale from 0.2 to 4 in a single step, and a tier that advanced only one
  // level would stay a level short until something else happened to move the
  // scale again.
  let tier = previous;
  for (let guard = 0; guard < 2; guard += 1) {
    const next = step(scale, tier);
    if (next === tier) break;
    tier = next;
  }
  return tier;
}

/**
 * How many standing claims a card shows.
 *
 * Far shows none — the name is the whole message. Near shows everything,
 * because the reader has deliberately come close enough to ask.
 */
export function claimBudget(tier: Tier): number {
  switch (tier) {
    case "far":
      return 0;
    case "mid":
      return 4;
    case "near":
      return Number.POSITIVE_INFINITY;
  }
}
