// ============================================================
// Relic — Stage UI Kit · top bar + session header (with timer)
// ============================================================

function StageShell({ title, sub, timer, recording, onToggleRec, children }) {
  return (
    <div className="stage-app">
      <div className="topbar">
        <div className="brand">Reli<span>c</span></div>
        <div className="topbar-div" />
        <div className="section">The Stage</div>
        <div className="topbar-right">
          <button className="exit-btn">Return to Sanctum</button>
        </div>
      </div>

      <div className="session-head">
        <div>
          <h1 className="session-title">{title}</h1>
          <div className="session-sub">{sub}</div>
        </div>
        <div className="session-meta">
          <div className="timer">{timer}</div>
          <button className={"rec-btn" + (recording ? "" : " is-paused")} onClick={onToggleRec}>
            <div className="rec-dot" />
            {recording ? "Recording" : "Paused"}
          </button>
        </div>
      </div>

      {children}
    </div>
  );
}

Object.assign(window, { StageShell });
