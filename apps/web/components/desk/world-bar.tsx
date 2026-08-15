"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { createBoardAction } from "@/app/actions";
import {
  asCompositionId,
  type CompositionId,
  type CompositionSummary,
  type Workspace
} from "@/lib/world/model";

import styles from "./desk.module.css";

/**
 * The world's compositions, and the way between them.
 *
 * A Board is not a folder and the Desk is not its parent — they are siblings,
 * each a view of the same world. The bar reads as a trail because that is how a
 * GM moves, but nothing here is a hierarchy.
 */
export function WorldBar({
  workspace,
  active
}: {
  workspace: Workspace;
  active: CompositionId;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [naming, setNaming] = useState(false);
  const [pending, startTransition] = useTransition();
  const wrapper = useRef<HTMLDivElement>(null);
  const nameField = useRef<HTMLInputElement>(null);

  const current =
    workspace.compositions.find((c) => c.compositionId === active) ?? null;

  useEffect(() => {
    if (!open && !naming) return;
    const onDown = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) {
        setOpen(false);
        setNaming(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setNaming(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, naming]);

  useEffect(() => {
    if (naming) nameField.current?.focus();
  }, [naming]);

  const go = (composition: CompositionSummary) => {
    setOpen(false);
    router.push(
      composition.kind === "desk" ? "/" : `/c/${composition.compositionId}`
    );
  };

  const create = (name: string) => {
    const compositionId = asCompositionId(crypto.randomUUID());
    setNaming(false);
    setOpen(false);
    startTransition(async () => {
      const result = await createBoardAction({
        worldId: workspace.worldId,
        compositionId,
        name
      });
      if (result.state === "ok") router.push(`/c/${compositionId}`);
    });
  };

  return (
    <div className={styles.worldBar} ref={wrapper}>
      <span className={styles.worldName}>{workspace.name ?? "Untitled world"}</span>
      <span className={styles.trailMark} aria-hidden="true">
        ›
      </span>

      <button
        type="button"
        className={styles.compositionButton}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => {
          setOpen((was) => !was);
          setNaming(false);
        }}
      >
        {current?.name ?? "Desk"}
        <span className={styles.trailMark} aria-hidden="true">
          ⌄
        </span>
      </button>

      {open ? (
        <div className={styles.switcher} role="menu">
          <p className={styles.switcherHeading}>Compositions of this world</p>
          {workspace.compositions.map((composition) => (
            <button
              key={composition.compositionId}
              type="button"
              role="menuitem"
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

          {naming ? (
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
              <button type="submit" className={styles.primaryAction}>
                Create
              </button>
            </form>
          ) : (
            <button
              type="button"
              className={styles.switcherAdd}
              onClick={() => setNaming(true)}
              disabled={pending}
            >
              + New board
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
