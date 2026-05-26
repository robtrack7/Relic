import Link from "next/link";
import type { EntitySummary, IdParams } from "@/lib/types";
import { sagaPath } from "@/lib/routes";

export function EntityCard({ params, entity }: { params: IdParams; entity: EntitySummary }) {
  return (
    <Link className={`entity-row ${entity.entityType}`} href={`${sagaPath(params)}/entities/${entity.entityType}/${entity.id}`}>
      <span>
        <span className="chip">{entity.entityType}</span>
        <strong className="entity-title">{entity.name}</strong>
        <span className="small muted">{entity.summary || "No summary yet."}</span>
      </span>
      <span className={`chip ${entity.scope === "world" ? "sage" : "amber"}`}>{entity.scope}</span>
    </Link>
  );
}
