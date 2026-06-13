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
  const selected = query.type === "all" || !query.type
    ? "all"
    : editableEntityTypes.includes(query.type as never)
    ? (query.type as (typeof editableEntityTypes)[number])
    : "all";
  const includeArchived = query.archived === "1";
  const [{ workspace, world, saga }, entityLists] = await Promise.all([
    requireSagaContext(ids),
    Promise.all(editableEntityTypes.map(async (type) => ({
      type,
      entities: await getEntityList(ids, type, includeArchived)
    })))
  ]);
  const root = sagaPath(ids);
  const counts = new Map(entityLists.map((list) => [list.type, list.entities.length]));
  const entities = selected === "all"
    ? entityLists.flatMap((list) => list.entities).sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? "")))
    : entityLists.find((list) => list.type === selected)?.entities ?? [];
  const title = selected === "all" ? "Library" : entityConfigs[selected].plural;
  const createType = selected === "all" ? "character" : selected;

  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="entities">
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><RelicIcon name="library" size={12} /> Canon library</div>
          <div className="page-title">{title}</div>
        </div>
        <div className="page-actions">
          <Link className="btn btn-ink" href={`${root}/entities/new?type=${createType}`}>
            <RelicIcon name="plus" size={13} /> New {entityConfigs[createType].label}
          </Link>
        </div>
      </div>

      <div className="lib-filters">
        <Link
          href={`${root}/entities`}
          className={`lf-btn${selected === "all" ? " active" : ""}`}
        >
          All
          <span className="lf-count">{entityLists.reduce((sum, list) => sum + list.entities.length, 0)}</span>
        </Link>
        {editableEntityTypes.map((type) => (
          <Link
            key={type}
            href={`${root}/entities?type=${type}`}
            className={`lf-btn${type === selected ? " active" : ""}`}
          >
            {entityConfigs[type].plural}
            <span className="lf-count">{counts.get(type) ?? 0}</span>
          </Link>
        ))}
      </div>

      <div className="entity-grid">
        {entities.length ? (
          entities.map((entity) => <EntityCard key={entity.id} params={ids} entity={entity} />)
        ) : (
          <div className="empty-state" style={{ gridColumn: "1/-1" }}>
            <div className="empty-ornament" style={{ fontSize: 36, fontFamily: "var(--font-display)" }}>✦</div>
            <div className="empty-title">No {selected === "all" ? "library records" : entityConfigs[selected].plural.toLowerCase()} yet</div>
            <div className="empty-desc">Add the first one manually or capture it from Stage.</div>
            <Link className="btn btn-ink" href={`${root}/entities/new?type=${createType}`} style={{ marginTop: 8 }}>
              <RelicIcon name="plus" size={13} /> New {entityConfigs[createType].label}
            </Link>
          </div>
        )}
      </div>
    </SanctumShell>
  );
}
