// ============================================================
// Relic — Sanctum UI Kit · Sessions view
// Past sessions list + session-prep card (amber rule, Sanctum)
// ============================================================

const SESSIONS = [
  { n: 14, title: "The Thornwood Accord", date: "Last Tuesday", state: "Recorded · Reviewed", duration: "3h 42m", touched: 4 },
  { n: 13, title: "The Drowning Rat",      date: "Two weeks ago", state: "Recorded · Reviewed", duration: "3h 11m", touched: 2 },
  { n: 12, title: "Smoke over Ashfen",     date: "Three weeks ago", state: "Recorded · Reviewed", duration: "2h 58m", touched: 3 },
  { n: 11, title: "The Reading of the Will", date: "Last month",   state: "Recorded · Reviewed", duration: "3h 20m", touched: 5 },
];

function Sessions() {
  return (
    <div className="sessions">
      <div className="page-head">
        <div>
          <h1 className="page-title">Sessions</h1>
          <p className="page-sub">The arc of play, kept honest.</p>
        </div>
        <div className="page-actions">
          <Btn variant="secondary" size="sm">View all recaps</Btn>
        </div>
      </div>

      {/* Prep card — amber 4px left rule */}
      <div className="prep-block">
        <Eyebrow accent>Session 15 · Prep</Eyebrow>
        <article className="prep-card">
          <div className="prep-left">
            <h2 className="prep-title">Session 15 · Ready for Stage</h2>
            <p className="prep-sub">Three threads queued. Two NPCs primed. The Drowning Rat is set as the opening scene.</p>
            <div className="prep-chips">
              <ThreadChip state="active">Thornwood Accord</ThreadChip>
              <ThreadChip state="loose">Pale Broker</ThreadChip>
              <ThreadChip state="active">Orphan's aunt</ThreadChip>
            </div>
          </div>
          <div className="prep-right">
            <Btn variant="amber">Open the Stage</Btn>
            <Btn variant="ghost" size="sm">Continue prep →</Btn>
          </div>
        </article>
      </div>

      <SectionLabel>Past sessions</SectionLabel>
      <ul className="session-list">
        {SESSIONS.map(s => (
          <li key={s.n} className="session-row">
            <div className="session-num">S{String(s.n).padStart(2,"0")}</div>
            <div className="session-body">
              <div className="session-title">{s.title}</div>
              <div className="session-meta">{s.date} · {s.duration} · {s.touched} canon updates</div>
            </div>
            <div className="session-state">{s.state}</div>
            <Btn variant="ghost" size="sm">Open recap {Icon.chevronRight}</Btn>
          </li>
        ))}
      </ul>
    </div>
  );
}

Object.assign(window, { Sessions });
