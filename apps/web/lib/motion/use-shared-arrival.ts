"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import { arrivalSource, captureDeparture, escapeId, flyBack, flyTo, sharedPart, snapshot, type Departure, type SharedKind } from "./shared-element";

const KINDS: readonly SharedKind[] = ["media", "title"];

function capture(root: HTMLElement): Departure[] {
  return KINDS.flatMap(kind => { const part = sharedPart(root, kind); const departure = part ? captureDeparture(part, kind) : null; return departure ? [departure] : []; });
}

/**
 * A deeper representation (Focus, Builder) arrives from the object already on
 * screen: its picture and name travel in from there. With `returnOnClose`,
 * hiding it sends them back to exactly where the canvas card is.
 *
 * Driven by visibility, not mounting: these surfaces stay mounted while hidden.
 */
export function useSharedArrival(root: RefObject<HTMLElement | null>, objectId: string, { shown, returnOnClose = false }: { shown: boolean; returnOnClose?: boolean }) {
  const wasShown = useRef(false);
  const departing = useRef<Departure[] | null>(null);
  // Originals hidden while their stand-ins fly home; restored on the next arrival.
  const parked = useRef<HTMLElement[]>([]);
  // The commit that hides the surface removes its layout, so the departing
  // parts are read here, during render, while they are still on screen.
  if (returnOnClose && wasShown.current && !shown && !departing.current && root.current) departing.current = capture(root.current);

  useLayoutEffect(() => {
    const self = root.current;
    const arriving = shown && !wasShown.current;
    const leaving = !shown && wasShown.current;
    wasShown.current = shown;
    if (arriving) { parked.current.forEach(part => { part.style.visibility = ""; }); parked.current = []; }
    if (arriving && self) {
      const source = arrivalSource(objectId, self);
      // Read the origin now; the destination may need a frame or two to be laid out.
      const origins = source ? KINDS.flatMap(kind => { const part = sharedPart(source, kind); return part ? [{ kind, from: snapshot(part) }] : []; }) : [];
      let attempts = 0;
      const land = () => {
        if (!self.isConnected || !origins.length) return;
        if (!self.getClientRects().length) { if (++attempts < 4) requestAnimationFrame(land); return; }
        for (const { kind, from } of origins) { const to = sharedPart(self, kind); if (to) flyTo(to, kind, from); }
      };
      land();
    }
    if (leaving) {
      const departures = departing.current;
      departing.current = null;
      const card = departures?.length ? [...document.querySelectorAll(`[data-object-family][data-object-id="${escapeId(objectId)}"]`)].find(element => element.getClientRects().length) : null;
      if (card && departures && self) for (const departure of departures) {
        const to = sharedPart(card, departure.kind);
        if (!to || !flyBack(departure, to)) continue;
        // The surface may linger while it withdraws; the object leaves it at once.
        const original = sharedPart(self, departure.kind);
        if (original) { original.style.visibility = "hidden"; parked.current.push(original); }
      }
    }
  });
}
