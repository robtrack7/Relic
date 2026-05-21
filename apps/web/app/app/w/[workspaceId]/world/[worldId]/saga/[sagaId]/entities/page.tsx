import Link from "next/link";
import { EntityCard } from "@/components/EntityCard";
import { SanctumShell } from "@/components/SanctumShell";
import { editableEntityTypes, entityConfigs } from "@/lib/entities";
import { getEntityList, requireSagaContext } from "@/lib/data";
import { sagaPath } from "@/lib/routes";
import type { IdParams } from "@/lib/types";

export default async function EntitiesPage({ params, searchParams }: { params: Promise<IdParams>; searchParams: Promise<{ type?: string; archived?: string }> }) {
  const ids = await params;
  const query = await searchParams;
  const selected = editableEntityTypes.includes(query.type as never) ? query.type as (typeof editableEntityTypes)[number] : "character";
  const [{ workspace, world, saga }, entities] = await Promise.all([
    requireSagaContext(ids),
    getEntityList(ids, selected, query.archived === "1")
  ]);
  const root = sagaPath(ids);

  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="entities">
      <section className="topbar">
        <div>
          <div className="eyebrow">Entity library</div>
          <h1 className="page-title">{entityConfigs[selected].plural}</h1>
        </div>
        <Link className="button" href={`${root}/entities/new?type=${selected}`}>New {entityConfigs[selected].label}</Link>
      </section>
      <div className="button-row">
        {editableEntityTypes.map((type) => (
          <Link key={type} className={type === selected ? "button-secondary" : "button-ghost"} href={`${root}/entities?type=${type}`}>{entityConfigs[type].plural}</Link>
        ))}
      </div>
      <div className="entity-list">
        {entities.length ? entities.map((entity) => <EntityCard key={entity.id} params={ids} entity={entity} />) : (
          <div className="card">No {entityConfigs[selected].plural.toLowerCase()} yet.</div>
        )}
      </div>
    </SanctumShell>
  );
}
