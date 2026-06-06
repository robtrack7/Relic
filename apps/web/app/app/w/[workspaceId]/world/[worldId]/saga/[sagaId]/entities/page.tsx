import Link from "next/link";
import { RelicIcon } from "@/components/RelicIcon";
import { SanctumShell } from "@/components/SanctumShell";
import { editableEntityTypes, entityConfigs } from "@/lib/entities";
import { getEntityList, requireSagaContext } from "@/lib/data";
import { sagaPath } from "@/lib/routes";
import type { EntitySummary, IdParams } from "@/lib/types";

function entityCardClass(type: string) {
  const map: Record<string, string> = {
    character: "e-npc",
    place: "e-location",
    faction: "e-faction",
    artifact: "e-artifact",
    thread: "e-lore",
    note: "e-note",
  };
  return map[type] ?? "e-note";
}

function EntityCard({ entity, params }: { entity: EntitySummary; params: IdParams }) {
  const root = sagaPath(params);
  return (
    <Link
      href={`${root}/entities/${entity.entityType}/${entity.id}`}
      className={`entity-card ${entityCardClass(entity.entityType)}`}
      style={{ textDecoration: "none" }}
    >
      <div className="entity-eyebrow">{entity.entityType}{entity.is_stub ? " · stub" : ""}</div>
      <div className="entity-title">{entity.name}</div>
      {entity.summary && <div className="entity-desc">{entity.summary}</div>}
      <div className="entity-foot">
        <span className="entity-meta">{entity.scope} canon</span>
        <span className={entity.canon_state === "archived" ? "chip rust" : "chip stone"}>
          {entity.canon_state}
        </span>
      </div>
    </Link>
  );
}

export default async function EntitiesPage({
  params,
  searchParams,
}: {
  params: Promise<IdParams>;
  searchParams: Promise<{ type?: string; archived?: string }>;
}) {
  const ids = await params;
  const query = await searchParams;
  const selected = editableEntityTypes.includes(query.type as never)
    ? (query.type as (typeof editableEntityTypes)[number])
    : "character";
  const [{ workspace, world, saga }, entities] = await Promise.all([
    requireSagaContext(ids),
    getEntityList(ids, selected, query.archived === "1"),
  ]);
  const root = sagaPath(ids);

  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="entities">
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><RelicIcon name="library" size={12} /> Entity library</div>
          <div className="page-title">{entityConfigs[selected].plural}</div>
        </div>
        <div className="page-actions">
          <Link className="btn btn-ink" href={`${root}/entities/new?type=${selected}`}>
            <RelicIcon name="plus" size={13} /> New {entityConfigs[selected].label}
          </Link>
        </div>
      </div>

      <div className="lib-filters">
        {editableEntityTypes.map((type) => (
          <Link
            key={type}
            href={`${root}/entities?type=${type}`}
            className={`lf-btn${type === selected ? " active" : ""}`}
          >
            {entityConfigs[type].plural}
            <span className="lf-count"> </span>
          </Link>
        ))}
      </div>

      <div className="entity-grid">
        {entities.length ? (
          entities.map((entity) => <EntityCard key={entity.id} params={ids} entity={entity} />)
        ) : (
          <div className="empty-state" style={{ gridColumn: "1/-1" }}>
            <div className="empty-ornament" style={{ fontSize: 36, fontFamily: "var(--font-display)" }}>✦</div>
            <div className="empty-title">No {entityConfigs[selected].plural.toLowerCase()} yet</div>
            <div className="empty-desc">Add the first one manually or capture it from Stage.</div>
            <Link className="btn btn-ink" href={`${root}/entities/new?type=${selected}`} style={{ marginTop: 8 }}>
              <RelicIcon name="plus" size={13} /> New {entityConfigs[selected].label}
            </Link>
          </div>
        )}
      </div>
    </SanctumShell>
  );
}
