"use client";

import { useEffect, useRef } from "react";
import type { EntityContent } from "@/lib/world/entity-document";
import type { FocusPageId } from "@/lib/world/entity-composition";
import { EntityBuilder, EntityFocus, EntityRecovery } from "./entity-surfaces";
import { useEntitySession } from "./entity-session";
import { useSurfaceTransition } from "@/components/ui/use-surface-transition";
import styles from "./entity-workspace.module.css";

export function EntityFocusVisit({ worldId, objectId, seed, active, page, onPageChange, onClose, onBuilder, onFollow, canBack, onBack, canForward, onForward, builderEntityId }: {
  worldId: string; objectId: string; seed?: EntityContent; active: boolean; page: FocusPageId;
  onPageChange: (page: FocusPageId) => void; onClose: () => void; onBuilder: () => void; onFollow: (id: string) => void; canBack?: boolean; onBack?: () => void; canForward?: boolean; onForward?: () => void; builderEntityId?: string | null;
}) {
  const { session, entity, status } = useEntitySession(worldId, objectId, seed);
  useEffect(() => { if (!active) void session.flush(); }, [active, session]);
  return <div className={styles.visit} hidden={!active} inert={!active}>{entity ? <EntityFocus entity={entity} session={session} page={page} onPageChange={onPageChange} onClose={onClose} onBuilder={onBuilder} onFollow={onFollow} canBack={canBack} onBack={onBack} canForward={canForward} onForward={onForward} builderEntityId={builderEntityId}/> : <aside className={styles.focus} aria-label="Opening Focus"><div className={styles.loading}>{status === "loading" ? "Opening the world record…" : <EntityRecovery session={session}/>}</div></aside>}</div>;
}
export function EntityBuilderVisit({ worldId, objectId, seed, active, onClose, onFollow }: {
  worldId: string; objectId: string; seed?: EntityContent; active: boolean; onClose: () => void; onFollow: (id: string) => void;
}) {
  const { session, entity, status } = useEntitySession(worldId, objectId, seed);
  useEffect(() => { if (!active) void session.flush(); }, [active, session]);
  const surface = useRef<HTMLDivElement>(null);
  const present = useSurfaceTransition(active, surface, "point");
  return <div ref={surface} className={styles.builderFrame} hidden={!present} inert={!active}>{entity ? <EntityBuilder entity={entity} session={session} onClose={onClose} onFollow={onFollow}/> : <section className={styles.builder} aria-label="Opening Entity Builder"><div className={styles.loading}>{status === "loading" ? "Opening your writing workspace…" : <EntityRecovery session={session}/>}</div></section>}</div>;
}
