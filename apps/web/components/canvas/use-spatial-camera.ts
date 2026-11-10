"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { IDENTITY_VIEWPORT, type Viewport } from "@/lib/desk/viewport";

/** Discrete navigation eases; direct manipulation always takes control immediately. */
export function useSpatialCamera() {
  const [viewport, setState] = useState<Viewport>(IDENTITY_VIEWPORT);
  const current = useRef(viewport);
  const frame = useRef<number | null>(null);
  const stop = useCallback(() => { if (frame.current !== null) cancelAnimationFrame(frame.current); frame.current = null; }, []);
  const setViewport = useCallback((next: Viewport | ((value: Viewport) => Viewport)) => {
    stop(); current.current = typeof next === "function" ? next(current.current) : next; setState(current.current);
  }, [stop]);
  const navigate = useCallback((next: Viewport) => {
    stop();
    const preference = document.documentElement.dataset.relicMotion;
    if (preference === "reduced" || (preference !== "full" && window.matchMedia("(prefers-reduced-motion: reduce)").matches)) { current.current = next; setState(next); return; }
    const from = current.current;
    let start: number | undefined;
    const tick = (now: number) => {
      start ??= now;
      const progress = Math.max(0, Math.min(1, (now - start) / 420));
      const eased = 1 - Math.pow(1 - progress, 4);
      current.current = { x: from.x + (next.x - from.x) * eased, y: from.y + (next.y - from.y) * eased, scale: from.scale + (next.scale - from.scale) * eased };
      setState(current.current);
      frame.current = progress < 1 ? requestAnimationFrame(tick) : null;
    };
    frame.current = requestAnimationFrame(tick);
  }, [stop]);
  useEffect(() => stop, [stop]);
  return { viewport, setViewport, navigate, stop };
}
