import Link from "next/link";
import { sagaPath } from "@/lib/routes";
import type { EntitySummary, IdParams } from "@/lib/types";

const groups = ["active", "loose", "dormant", "failed", "resolved"] as const;

function label(state: string) {
  return state.charAt(0).toUpperCase() + state.slice(1);
}

export function ThreadList({ params, threads }: { params: IdParams; threads: EntitySummary[] }) {
  const root = sagaPath(params);
  return <div className="thread-groups">
    {groups.map((state) => {
      const items = threads.filter((thread) => (thread.status ?? "dormant") === state);
      if (!items.length) return null;
      return <section key={state} aria-label={`${label(state)} Threads`} className="thread-group">
        <div className="tl-group-label">{label(state)} <span>{items.length}</span></div>
        {items.map((thread) => <Link key={thread.id} href={`${root}/threads/${thread.id}`} className="tl-row">
          <span className={`t-chip ${state}`}>{state}</span>
          <span className="thread-row-copy"><strong className="t-name">{thread.name}</strong><small>{thread.summary || "No summary recorded."}</small></span>
          <span className="thread-objective-count">{thread.objectives_log?.filter((item) => item && typeof item === "object" && "state" in item && (item as { state?: string }).state === "completed").length ?? 0}/{thread.objectives_log?.length ?? 0}</span>
        </Link>)}
      </section>;
    })}
  </div>;
}
