// ============================================================
// Relic — Sanctum UI Kit · Header (web nav)
// Ink plate with brand, section label, primary nav, search,
// session pill, and avatar.
// ============================================================

function Header({ tab, onTab, onAsk, showSessionPill }) {
  const links = ["Threads", "Entities", "Sessions", "Review"];
  const [q, setQ] = React.useState("");

  const submit = () => {
    onAsk(q);
    setQ("");
  };
  const onKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); submit(); }
    if (e.key === "Escape") { setQ(""); e.currentTarget.blur(); }
  };

  return (
    <header className="header">
      <div className="header-left">
        <div className="brand">Reli<span>c</span></div>
        <div className="header-div" />
        <div className="header-section">The Sanctum</div>
      </div>
      <nav className="header-links">
        {links.map((l) => (
          <a key={l}
             className={"nav-link" + (l.toLowerCase() === tab ? " active" : "")}
             onClick={() => onTab(l.toLowerCase())}>{l}</a>
        ))}
      </nav>
      <div className="header-search" onClick={() => onAsk(q)}>
        <span className="header-search-icon">{Icon.search}</span>
        <input className="header-search-input"
               type="text"
               placeholder="Ask Relic — search saga, lore, rules…"
               value={q}
               onChange={(e) => setQ(e.target.value)}
               onFocus={() => onAsk(q)}
               onKeyDown={onKeyDown} />
        <span className="header-search-kbd"><Kbd>⌘K</Kbd></span>
      </div>
      <div className="header-right">
        {showSessionPill && <div className="session-pill">Session 15 · Prepping</div>}
        <Avatar initials="GM" />
      </div>
    </header>
  );
}

Object.assign(window, { Header });
