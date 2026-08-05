"use client";

import Link from "next/link";
import { useState } from "react";
import { abandonSagaWorkshopAction } from "@/app/actions";

export type ResumableSagaWorkshop = {
  id: string;
  saga_name?: string | null;
  world_name?: string | null;
  path?: string | null;
  phase?: string | null;
  updated_at?: string | null;
};

export function ResumeSagaWorkshopCard({ workshop }: { workshop: ResumableSagaWorkshop }) {
  const [discarded, setDiscarded] = useState(false);
  const [notice, setNotice] = useState("");
  if (discarded) return null;

  async function discard() {
    if (!window.confirm("Discard this saved Saga draft? No canon will be removed, but the workshop will no longer appear as resumable.")) return;
    setNotice("Discarding…");
    const result = await abandonSagaWorkshopAction(workshop.id);
    if (!result.ok) { setNotice(result.message ?? "The draft could not be discarded."); return; }
    setDiscarded(true);
  }

  return <aside className="card form-stack" aria-label="Resume saga creation">
    <div className="page-eyebrow">Resume saga creation · {String(workshop.phase ?? "drafting").replaceAll("_", " ")}</div>
    <h2>{workshop.saga_name || "Untitled Saga"}</h2>
    <p className="muted">{workshop.world_name ? `${workshop.world_name} · ` : ""}{workshop.path === "bring_your_notes" ? "Bring your notes" : "Build with the Loom"}{workshop.updated_at ? ` · saved ${new Date(workshop.updated_at).toLocaleString()}` : ""}</p>
    {notice && <div className="notice" role="status">{notice}</div>}
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <Link className="btn btn-ink" href={`/app/new-saga/${workshop.id}`}>Resume</Link>
      <button className="btn btn-ghost" type="button" onClick={discard}>Discard draft</button>
    </div>
  </aside>;
}
