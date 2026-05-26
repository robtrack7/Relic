// ============================================================
// Relic — Sanctum UI Kit · Threads view
// Read-only timeline of story threads. Markers across sessions.
// ============================================================

const THREADS = [
  {
    name: "The Thornwood Accord",
    state: "active",
    summary: "Recover the stolen deed before House Kael brokers the sale. The party has until the new moon.",
    objectives: 2,
    lastTouched: "Session 14 · 2 days ago",
    markers: [
      { s: 11, kind: "start", label: "Quest opens — Tobin reads the will" },
      { s: 13, kind: "obj",   label: "Obj 1 — Find Seraphine" },
      { s: 14, kind: "obj",   label: "Obj 2 — Confirm the deed holder" },
    ],
  },
  {
    name: "The Pale Broker",
    state: "active",
    summary: "An unnamed contact referenced by Seraphine. Speaks only through intermediaries.",
    objectives: 1,
    lastTouched: "Session 14",
    markers: [
      { s: 12, kind: "start", label: "Mentioned in transcript" },
    ],
  },
  {
    name: "The Orphan's Aunt",
    state: "loose",
    summary: "A name dropped during the temple scene. No follow-up yet.",
    objectives: 0,
    lastTouched: "Flagged Session 14",
    markers: [
      { s: 14, kind: "loose", label: "Flagged loose — no follow-up" },
    ],
  },
  {
    name: "The Missing Courier",
    state: "dormant",
    summary: "Roan vanished three sessions ago. The party stopped pulling on this thread.",
    objectives: 0,
    lastTouched: "Dormant since Session 12",
    markers: [
      { s: 11, kind: "start", label: "Roan introduced" },
      { s: 12, kind: "dormant", label: "Went dormant" },
    ],
  },
];

function Threads() {
  const [active, setActive] = React.useState(0);
  const thread = THREADS[active];
  const sessions = [11, 12, 13, 14, 15];

  return (
    <div className="threads">
      <div className="page-head">
        <div>
          <h1 className="page-title">Threads</h1>
          <p className="page-sub">The story you're holding — across {THREADS.length} active arcs.</p>
        </div>
        <div className="page-actions">
          <Btn variant="secondary" size="sm">{Icon.filter} Filter</Btn>
          <Btn variant="amber" size="sm">{Icon.plus} New thread</Btn>
        </div>
      </div>

      <div className="threads-grid">
        <ul className="thread-list">
          {THREADS.map((t, i) => (
            <li key={t.name}
                className={"thread-row" + (i === active ? " is-active" : "")}
                onClick={() => setActive(i)}>
              <ThreadChip state={t.state}>{t.state}</ThreadChip>
              <span className="thread-name">{t.name}</span>
              <span className="thread-meta">{t.lastTouched}</span>
            </li>
          ))}
        </ul>

        <article className="thread-detail">
          <div className="thread-detail-head">
            <Eyebrow>Thread · {thread.state}</Eyebrow>
            <h2 className="thread-detail-title">{thread.name}</h2>
            <p className="thread-detail-sum">{thread.summary}</p>
          </div>

          <div className="timeline">
            <div className="timeline-axis">
              {sessions.map((s) => <div key={s} className="timeline-tick">S{s}</div>)}
            </div>
            <div className="timeline-track">
              <div className={"timeline-line line-" + thread.state} />
              {thread.markers.map((m, i) => {
                const pct = ((m.s - 11) / 4) * 100;
                const align = pct < 15 ? "is-start" : pct > 85 ? "is-end" : "is-mid";
                return (
                  <div key={i}
                       className={"timeline-marker marker-" + m.kind + " row-" + (i % 2) + " " + align}
                       style={{ left: pct + "%" }}>
                    <div className="marker-dot" />
                    <div className="marker-stem" />
                    <div className="marker-label">{m.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="thread-foot">
            <span className="t-mono-meta">Derived from objectives_log + canon_audit</span>
            <div className="thread-foot-actions">
              <Btn variant="ghost" size="sm">View entity ties</Btn>
              <Btn variant="secondary" size="sm">Open in editor</Btn>
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}

Object.assign(window, { Threads });
