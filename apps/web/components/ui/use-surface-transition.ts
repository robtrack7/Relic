"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";

/** Retains a withdrawing surface and reverses from its current rendered state. */
export function useSurfaceTransition(open: boolean, node: RefObject<HTMLElement | null>, side: "left" | "right" | "point" = "right") {
  const [present, setPresent] = useState(open);
  const animation = useRef<Animation | null>(null);
  const previous = useRef(open);
  useLayoutEffect(() => {
    if (open && !present) { setPresent(true); return; }
    const element = node.current;
    if (!element || !present) { previous.current = open; return; }
    const preference = document.documentElement.dataset.relicMotion;
    const reduced = preference === "reduced" || (preference !== "full" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false));
    const running = animation.current;
    const current = running ? getComputedStyle(element) : null;
    const withdrawal = side === "point" ? "translateY(5px)" : `translateX(${side === "left" ? -22 : 22}px)`;
    const from = current ? { opacity: current.opacity, transform: current.transform } : open
      ? { opacity: 0, transform: withdrawal }
      : { opacity: 1, transform: "translateX(0px)" };
    running?.cancel();
    if (reduced || !element.animate) {
      animation.current = null;
      element.style.opacity = "";
      element.style.transform = "";
      setPresent(open); previous.current = open; return;
    }
    // Mounts that start open are already part of the working composition.
    if (previous.current && open && !running && side !== "point") return;
    const transition = element.animate([from, open ? { opacity: 1, transform: "translate(0px,0px)" } : { opacity: 0, transform: withdrawal }], {
      duration: side === "point" ? open ? 160 : 100 : open ? 260 : 180, easing: open ? "cubic-bezier(.16,1,.3,1)" : "cubic-bezier(.4,0,1,1)", fill: "both"
    });
    animation.current = transition;
    previous.current = open;
    transition.onfinish = () => {
      if (animation.current !== transition) return;
      animation.current = null;
      // Commit the terminal frame before cancelling WAAPI. Cancelling first
      // briefly restores the authored style while React is still scheduling
      // `hidden`, which is the blank flash seen when a carriage closes.
      element.style.opacity = open ? "" : "0";
      element.style.transform = open ? "" : withdrawal;
      setPresent(open);
      transition.cancel();
    };
  }, [open, present, node, side]);
  useLayoutEffect(() => () => animation.current?.cancel(), []);
  return present;
}
