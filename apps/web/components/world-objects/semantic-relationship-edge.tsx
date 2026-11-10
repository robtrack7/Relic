import type { Link } from "@/lib/world/model";
import { relationshipPhrase, relationshipTypeFor } from "./relationship-types";
import styles from "./relationship-edge.module.css";

export type RelationshipBundle = Readonly<{
  key: string;
  links: readonly Link[];
}>;

/**
 * Group semantic edges by the two projected endpoints. A relationship remains
 * independently addressable inside the bundle; the grouping only keeps a
 * busy Board from turning several claims into parallel visual spaghetti.
 */
export function bundleRelationshipLinks(links: readonly Link[]): readonly RelationshipBundle[] {
  const groups = new Map<string, Link[]>();
  for (const link of links) {
    const key = `${link.other.objectId}:${link.direction}`;
    const current = groups.get(key) ?? [];
    current.push(link);
    groups.set(key, current);
  }
  return [...groups.entries()].map(([key, grouped]) => ({ key, links: grouped }));
}

/** A labelled semantic edge; geometry remains a Board projection, never world truth. */
export function SemanticRelationshipEdge({ link, x1, y1, x2, y2, selected = false, onSelect, bundleIndex = 0, bundleCount = 1, bundleLinks, persisted = false, labelPosition, labelScale = 1 }: { link: Link; x1: number; y1: number; x2: number; y2: number; selected?: boolean; onSelect?: () => void; bundleIndex?: number; bundleCount?: number; bundleLinks?: readonly Link[]; persisted?: boolean; labelPosition?: { x: number; y: number }; labelScale?: number }) {
  const type = relationshipTypeFor(link.claimKind);
  const label = relationshipPhrase(link.claimKind, link.direction);
  const displayLabel = bundleCount > 1 ? `${bundleCount} relationships` : label;
  const truth = bundleLinks?.some(link => link.truthState === "disputed") ? "disputed" : bundleLinks?.some(link => link.truthState === "pencil") ? "pencil" : link.truthState;
  const stateLabel = truth === "pencil" ? " · pending" : truth === "disputed" ? " · disputed" : "";
  // Symmetric predicates carry no arrow. A custom predicate remains directed
  // by the stored subject/object orientation even though it has no inverse
  // phrase in the registry.
  const directed = bundleCount === 1 && (!type || !type.symmetric);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / length;
  const ny = dx / length;
  // Offset bundled edges symmetrically. The endpoint positions stay tied to the
  // card geometry supplied by the Board, while nearby claims remain legible.
  const spread = Math.min(18, Math.max(0, bundleCount - 1) * 7);
  const bundleOffset = bundleCount > 1 ? (bundleIndex - (bundleCount - 1) / 2) * Math.min(12, spread) : 0;
  const sx = x1 + nx * bundleOffset;
  const sy = y1 + ny * bundleOffset;
  const ex = x2 + nx * bundleOffset;
  const ey = y2 + ny * bundleOffset;
  const midX = labelPosition?.x ?? (sx + ex) / 2 + nx * (16 + bundleOffset * .35);
  const midY = labelPosition?.y ?? (sy + ey) / 2 + ny * (16 + bundleOffset * .35);
  const controlX = labelPosition ? 2 * midX - (sx + ex) / 2 : (sx + ex) / 2 + nx * (34 + bundleOffset * .4);
  const controlY = labelPosition ? 2 * midY - (sy + ey) / 2 : (sy + ey) / 2 + ny * (34 + bundleOffset * .4);
  const path = `M${sx} ${sy} Q${controlX} ${controlY} ${ex} ${ey}`;
  const accessibleLabel = `${displayLabel}${stateLabel} · ${link.other.label}`;
  const labelText = `${displayLabel}${stateLabel}`;
  return <g className={styles.edge} data-semantic-edge="true" data-persisted={persisted || undefined} data-relationship-ids={(bundleLinks ?? [link]).map(link => link.relationshipId ?? link.claimId).join(" ")} data-truth={truth} data-bundled={bundleCount > 1 || undefined} data-selected={selected || undefined} onPointerDown={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()} onClick={onSelect} role={onSelect ? "button" : undefined} tabIndex={onSelect ? 0 : undefined} aria-roledescription="semantic relationship" aria-label={accessibleLabel} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); onSelect?.(); } }}>
    <path d={path} className={styles.hit} aria-hidden="true"/>
    <path className={styles.line} d={path} markerEnd={directed && link.direction === "out" ? "url(#relic-semantic-arrow)" : undefined} markerStart={directed && link.direction === "in" ? "url(#relic-semantic-arrow)" : undefined} />
    <g transform={`translate(${midX} ${midY}) scale(${labelScale})`} className={styles.label}><rect x={-labelText.length * 3.6 - 10} y={-14} width={labelText.length * 7.2 + 20} height={28} rx={12}/><text textAnchor="middle" dominantBaseline="central">{labelText}</text></g>
  </g>;
}
