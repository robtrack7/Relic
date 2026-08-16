"use client";

import type { RefObject } from "react";

import type { Point } from "@/lib/desk/viewport";
import type { CardId } from "@/lib/world/model";

/**
 * What the chrome needs from whichever surface is drawing the composition.
 *
 * The canvas and the stack answer both questions differently — one has a
 * viewport, the other a scroll position — and neither answer belongs to the
 * chrome. Two imperative calls rather than lifted viewport state, because the
 * viewport changes on every frame of a pan and nothing above it should re-render
 * for that.
 */
export type SurfaceControls = Readonly<{
  /** Where material retrieved from elsewhere should land: what is being looked at. */
  landing(): Point;
  /**
   * Bring a card into view. Never changes selection or focus — those are
   * decisions, and this is only a matter of where the eye is pointed.
   */
  reveal(cardId: CardId): void;
}>;

export type SurfaceControlsRef = RefObject<SurfaceControls | null>;
