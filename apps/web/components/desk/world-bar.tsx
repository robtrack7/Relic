"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { createBoardAction, createSessionAction } from "@/app/actions";
import {
  asCompositionId,
  asSessionId,
  type CompositionId,
  type CompositionSummary,
  type SessionSummary,
  type Workspace
} from "@/lib/world/model";

import styles from "./desk.module.css";
import { FloatingSurface } from "@/components/ui/floating-surface";
import { CanvasGlyph } from "@/components/canvas/canvas-controls";
import type { WorkspaceDestination } from "@/components/workspace/workspace-navigation";

export type WorldNavigationRequest = { destination: Exclude<WorkspaceDestination, "library">; trigger: HTMLButtonElement };

/**
 * The world's compositions, and the way between them.
 *
 * A Board is not a folder and the Desk is not its parent — they are siblings,
 * each a view of the same world. The bar reads as a trail because that is how a
 * GM moves, but nothing here is a hierarchy.
 */
export function WorldBar({
  workspace,
  active,
  navigationRequest,
  onNavigationClose
}: {
  workspace: Workspace;
  active: CompositionId;
  navigationRequest?: WorldNavigationRequest | null;
  onNavigationClose?: () => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  /** Which thing is being named: a Board, a session, or nothing. */
  const [naming, setNaming] = useState<"board" | "session" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const wrapper = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const navigationTrigger = useRef<HTMLButtonElement>(null);
  const [destination, setDestination] = useState<WorldNavigationRequest["destination"] | null>(null);
  const nameField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!navigationRequest) { if (navigationTrigger.current) { setOpen(false); setDestination(null); } return; }
    navigationTrigger.current = navigationRequest.trigger;
    setDestination(navigationRequest.destination);
    setNaming(null);
    setError(null);
    setOpen(true);
  }, [navigationRequest]);

  const current =
    workspace.compositions.find((c) => c.compositionId === active) ?? null;

  // Every prep composition belongs to a session, so the list of boards is the
  // compositions that do not — a session is reached as a session, not as a
  // place that happens to be somebody's evening.
  const prepared = new Set(workspace.sessions.map((s) => s.compositionId as string));
  const places = workspace.compositions.filter((c) => !prepared.has(c.compositionId));

  useEffect(() => {
    if (naming !== null) nameField.current?.focus();
  }, [naming]);

  const go = (composition: CompositionSummary) => {
    setOpen(false);
    onNavigationClose?.();
    // Resolve the Desk in this world too. `/` opens the default world and can
    // otherwise discard the context of a session or linked composition.
    router.push(`/c/${composition.compositionId}`);
  };

  // A session is opened at its Prep, which is an ordinary composition route.
  // Prep is not a mode: it is this world, arranged for one evening.
  const goToSession = (session: SessionSummary) => {
    setOpen(false);
    onNavigationClose?.();
    router.push(`/c/${session.compositionId}`);
  };

  const create = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give this board a name before creating it.");
      return;
    }
    const compositionId = asCompositionId(crypto.randomUUID());
    setError(null);
    startTransition(async () => {
      const result = await createBoardAction({
        worldId: workspace.worldId,
        compositionId,
        name: trimmed
      });
      if (result.state === "ok") {
        setNaming(null);
        setOpen(false);
        onNavigationClose?.();
        router.push(`/c/${compositionId}`);
      } else {
        setError("That board could not be created. Your name is still here; try again.");
      }
    });
  };

  /** Starts a session and lands the GM on the Prep created with it. */
  const startSession = (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError("Give this session a name before preparing it.");
      return;
    }
    const compositionId = asCompositionId(crypto.randomUUID());
    setError(null);
    startTransition(async () => {
      const result = await createSessionAction({
        worldId: workspace.worldId,
        sessionId: asSessionId(crypto.randomUUID()),
        compositionId,
        title: trimmed
      });
      if (result.state === "ok") {
        setNaming(null);
        setOpen(false);
        onNavigationClose?.();
        router.push(`/c/${compositionId}`);
      } else {
        setError("That session could not be prepared. Your name is still here; try again.");
      }
    });
  };

  return (
    <div className={styles.worldBar} ref={wrapper}>
      <span className={styles.worldName}>{workspace.name ?? "Untitled world"}</span>
      <span className={styles.trailMark} aria-hidden="true">
        ›
      </span>

      <button
        ref={trigger}
        type="button"
        className={styles.compositionButton}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Current Context: ${current?.name ?? "Desk"}`}
        title={current?.name ?? "Desk"}
        onClick={() => {
          setOpen((was) => !was);
          setDestination(null);
          setNaming(null);
          setError(null);
        }}
      >
        <span className={styles.compositionName}>{current?.name ?? "Desk"}</span>
        <CanvasGlyph name="chevronDown" />
      </button>

      {open ? (
        <FloatingSurface open={open} label={destination === "boards" ? "Boards" : destination === "prepare" ? "Prepare a session" : destination === "sessions" ? "Sessions" : "Current Context"} role="dialog" triggerRef={destination ? navigationTrigger : trigger} placement={destination ? "right" : "bottom"} align={destination ? "start" : "center"} width={320}
          onClose={restore => { setOpen(false); setNaming(null); setError(null); onNavigationClose?.(); if (restore) (destination ? navigationTrigger : trigger).current?.focus(); }}>
        <div className={styles.switcherContent}>
          {error ? <p className={styles.switcherError} role="alert">{error}</p> : null}
          {destination === null || destination === "boards" ? <>
          <p className={styles.switcherHeading}>{workspace.name ?? "This world"} · Now</p>
          {places.map((composition) => (
            <button
              key={composition.compositionId}
              type="button"
              className={styles.switcherItem}
              data-current={composition.compositionId === active || undefined}
              aria-current={composition.compositionId === active || undefined}
              aria-label={composition.name}
              onClick={() => go(composition)}
            >
              <span className={styles.switcherName}>{composition.name}</span>
              <span className={styles.switcherCount}>
                {composition.cardCount} {composition.cardCount === 1 ? "card" : "cards"}
              </span>
            </button>
          ))}

          {naming === "board" ? (
            <form
              className={styles.namingRow}
              onSubmit={(event) => {
                event.preventDefault();
                const value = new FormData(event.currentTarget).get("name");
                create(typeof value === "string" ? value : "");
              }}
            >
              <input
                ref={nameField}
                name="name"
                className={styles.nameField}
                placeholder="Name this board"
                aria-label="Board name"
                maxLength={120}
                autoComplete="off"
              />
              <button type="submit" className={styles.primaryAction} disabled={pending}>
                Create
              </button>
            </form>
          ) : (
            <button
              type="button"
              className={styles.switcherAdd}
              onClick={() => setNaming("board")}
              disabled={pending}
            >
              + New board
            </button>
          )}

          </> : null}
          {destination === "prepare" || destination === "sessions" ? <>
          {/* Sessions sit apart from the compositions rather than among them.
              A session *has* a Prep; offering the Prep on its own would be a
              way into tonight that arrived without knowing what tonight is. */}
          <p className={styles.switcherHeading}>{destination === "prepare" ? "Prepare your next session" : "Session history & upcoming play"}</p>
          <p className={styles.switcherDescription}>{destination === "prepare" ? "Plan a running order and gather the world material you need." : "Return to an evening’s preparation and its recorded context. Story history stays with each object."}</p>
          {workspace.sessions.filter(session => destination !== "prepare" || session.state !== "played").length === 0 ? <p className={styles.switcherDescription}>{destination === "prepare" ? "No sessions waiting for preparation." : "No sessions recorded yet."}</p> : null}
          {workspace.sessions.filter(session => destination !== "prepare" || session.state !== "played").map((session) => (
            <button
              key={session.sessionId}
              type="button"
              className={styles.switcherItem}
              data-current={session.compositionId === active || undefined}
              aria-current={session.compositionId === active || undefined}
              aria-label={session.title}
              onClick={() => goToSession(session)}
            >
              <span className={styles.switcherName}>{session.title}</span>
              <span className={styles.switcherCount}>
                {session.state === "planned" ? "planned" : session.state === "in_play" ? "in play" : "played"}
                {session.beatCount > 0 ? ` · ${session.beatCount} ${session.beatCount === 1 ? "beat" : "beats"}` : ""}
              </span>
            </button>
          ))}

          {destination === "prepare" && naming === "session" ? (
            <form
              className={styles.namingRow}
              onSubmit={(event) => {
                event.preventDefault();
                const value = new FormData(event.currentTarget).get("name");
                startSession(typeof value === "string" ? value : "");
              }}
            >
              <input
                ref={nameField}
                name="name"
                className={styles.nameField}
                placeholder="Name this session"
                aria-label="Session name"
                maxLength={120}
                autoComplete="off"
              />
              <button type="submit" className={styles.primaryAction} disabled={pending}>
                Start
              </button>
            </form>
          ) : destination === "prepare" ? (
            <button
              type="button"
              className={styles.switcherAdd}
              onClick={() => setNaming("session")}
              disabled={pending}
            >
              + Prepare a session
            </button>
          ) : null}
          </> : null}
        </div>
        </FloatingSurface>
      ) : null}
    </div>
  );
}
