// wf-surfaces-2.jsx — Library + Prepare surfaces

// ═══ LIBRARY ════════════════════════════════════════════════

const LIB_FILTERS = [
{ id: "all", label: "All", count: 64 },
{ id: "npc", label: "Characters", count: 28 },
{ id: "location", label: "Places", count: 14 },
{ id: "faction", label: "Factions", count: 7 },
{ id: "artifact", label: "Artifacts", count: 5 },
{ id: "lore", label: "Lore", count: 8 },
{ id: "archived", label: "Archived", count: 12 }];


const ENTITY_CARDS = [
{ cls: "e-npc", eyebrow: "NPC · Antagonist", title: "Castellan Veyra", desc: "Orchestrates the forgery from within the Crown's own keep. Cool under pressure; dangerous when cornered.", meta: "Updated · Session 15 · 1d ago", status: "active" },
{ cls: "e-npc", eyebrow: "NPC · Ally", title: "Mira Ashborne", desc: "Dockworker turned courier. Owes a debt she won't name. Speaks in careful half-truths.", meta: "Updated · Session 16 · 4h ago", status: "uncertain" },
{ cls: "e-npc", eyebrow: "NPC · Uncertain", title: "The Dockmaster", desc: "Revealed as an informant for the Crown. Allegiance unclear. Speaks with a slight lisp.", meta: "Draft · Session 16 · just now", status: "uncertain", draft: true },
{ cls: "e-faction", eyebrow: "Faction · Antagonist", title: "House Kael", desc: "A noble house with a manufactured lineage and real ambitions. Controls three of the harbor guild seats.", meta: "Updated · Session 14 · 3d ago", status: "active" },
{ cls: "e-location", eyebrow: "Location · Port", title: "Fenwick Harbor", desc: "The commercial heart of Eryndal. Contested. The Kael faction controls the eastern quays.", meta: "Updated · Session 16 · 4h ago", status: "active" },
{ cls: "e-location", eyebrow: "Location · Tavern", title: "The Tallow Gate", desc: "A safe house operating as a tavern. The party's de facto base of operations.", meta: "Updated · Session 13 · 2w ago", status: "active" }];


function LibraryOverview({ filter = "all", empty = false }) {
  const displayed = filter === "archived" ?
  [{ cls: "e-npc", eyebrow: "NPC · Archived", title: "Lord Esten (deceased)", desc: "Former commander of Thornwall. Killed in the ambush. Archived after Session 15.", meta: "Archived · Session 15", status: "archived" }] :
  filter === "npc" ? ENTITY_CARDS.filter((e) => e.cls === "e-npc") :
  filter === "location" ? ENTITY_CARDS.filter((e) => e.cls === "e-location") :
  filter === "faction" ? ENTITY_CARDS.filter((e) => e.cls === "e-faction") :
  ENTITY_CARDS;

  return (
    <Shell active="library" pill="none" reviewCount={7} loomExpanded={false}>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">The Shattered Crown</div>
          <div className="page-title">Library</div>
          <div className="page-sub">Characters, places, factions, and the lore that holds them together.</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary"><I n="spark" size={13} style={{ color: "var(--amber)" }} /> Draft from prompt</button>
          <button className="btn btn-ink"><I n="plus" size={13} /> New entity</button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div className="lib-filters">
          {LIB_FILTERS.map((f) =>
          <button key={f.id} className={"lf-btn" + (filter === f.id ? " active" : "")}>
              {f.label} <span className="lf-count">{f.count}</span>
            </button>
          )}
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button className="btn btn-secondary btn-sm"><I n="search" size={12} /> Filter</button>
          <button className="btn btn-secondary btn-sm"><I n="grid" size={12} /></button>
        </div>
      </div>

      {empty ?
      <div className="empty-state">
          <div style={{ fontSize: 36, fontFamily: "var(--font-display)", color: "var(--stone-300)" }}>✦</div>
          <div className="empty-title">The library is empty</div>
          <div className="empty-desc">Add your first character, place, or faction. The Loom can help you draft from a description.</div>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button className="btn btn-ink"><I n="users" size={13} /> Add character</button>
            <button className="btn btn-secondary"><I n="spark" size={13} style={{ color: "var(--amber)" }} /> Draft from prompt</button>
          </div>
        </div> :

      <>
          {filter === "archived" &&
        <div className="archived-banner">
              <I n="archive" size={15} style={{ color: "var(--stone-500)", flexShrink: 0 }} />
              <span>Archived entities are read-only and excluded from Loom searches unless explicitly included.</span>
              <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto", flexShrink: 0 }}>Manage</button>
            </div>
        }
          <div className="entity-grid">
            {displayed.map((e, i) =>
          <div key={i} className={"entity-card " + e.cls} style={e.status === "archived" ? { opacity: 0.7 } : {}}>
                <div className="entity-eyebrow">{e.eyebrow}</div>
                <div className="entity-title">{e.title}</div>
                <div className="entity-desc">{e.desc}</div>
                <div className="entity-foot">
                  <div className="entity-meta">{e.meta}</div>
                  {e.draft && <Chip tone="amber">Draft</Chip>}
                  {e.status === "uncertain" && !e.draft && <Chip tone="amber">Uncertain</Chip>}
                  {e.status === "archived" && <Chip tone="stone">Archived</Chip>}
                </div>
              </div>
          )}
          </div>
        </>
      }
    </Shell>);

}

function EntityDetail({ edit = false, dup = false, archived = false }) {
  return (
    <Shell active="library" pill="none" reviewCount={7} loomExpanded={true} loomMode="ask">
      {dup &&
      <div className="dup-warning">
          <div className="dup-title"><I n="alert" size={12} /> Possible duplicate detected</div>
          <div className="dup-cards">
            <div className="dup-card">
              <div className="dup-card-name">Castellan Veyra</div>
              <div className="dup-card-meta">NPC · Antagonist · Session 11</div>
            </div>
            <div className="dup-card" style={{ borderColor: "var(--amber)" }}>
              <div className="dup-card-name">Ser Veyra</div>
              <div className="dup-card-meta">NPC · Draft · just now</div>
            </div>
          </div>
          <div style={{ marginTop: 9, display: "flex", gap: 7 }}>
            <button className="btn btn-secondary btn-sm">Merge</button>
            <button className="btn btn-ghost btn-sm">Keep separate</button>
            <button className="btn btn-ghost btn-sm">Discard new</button>
          </div>
        </div>
      }
      {archived &&
      <div className="archived-banner">
          <I n="archive" size={14} style={{ flexShrink: 0 }} />
          <span>This entity is archived. It is read-only and excluded from active Loom searches.</span>
          <button className="btn btn-secondary btn-sm" style={{ marginLeft: "auto", flexShrink: 0 }}>Restore</button>
        </div>
      }
      <div className="lib-detail-layout">
        <div className="card entity-sidebar">
          <div style={{ width: 72, height: 72, borderRadius: "var(--radius-md)", background: "var(--stone-100)", border: "1px solid var(--border-1)", display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
            <Avatar name="Castellan Veyra" size={60} />
          </div>
          <div className="es-field">
            <div className="es-key">Status</div>
            <div className="es-val" style={{ display: "flex", alignItems: "center", gap: 5 }}><Dot kind="active" />Living</div>
          </div>
          <div className="es-sep" />
          <div className="es-field">
            <div className="es-key">Role</div>
            <div className="es-val">Antagonist</div>
          </div>
          <div className="es-field">
            <div className="es-key">Faction</div>
            <div className="es-val" style={{ color: "var(--hue-faction)" }}>House Kael</div>
          </div>
          <div className="es-field">
            <div className="es-key">Location</div>
            <div className="es-val">The Crown's Keep</div>
          </div>
          <div className="es-sep" />
          <div className="es-field">
            <div className="es-key">Canon sources</div>
            <div style={{ display: "flex", flexWrap: "wrap", marginTop: 3 }}>
              {["Session 11", "Session 14", "Session 15"].map((s) =>
              <span key={s} className="source-chip"><I n="anchor" size={8} />{s}</span>
              )}
            </div>
          </div>
          <div className="es-sep" />
          <div className="es-field">
            <div className="es-key">Last updated</div>
            <div className="es-val" style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.06em" }}>Session 15 · 1 day ago</div>
          </div>
          {!archived &&
          <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 4 }}>
              {edit ?
            <button className="btn btn-ink btn-sm" style={{ width: "100%", justifyContent: "center" }}>Save changes</button> :
            <button className="btn btn-secondary btn-sm" style={{ width: "100%", justifyContent: "center" }}><I n="notes" size={12} /> Edit</button>}
              <button className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "center" }}><I n="archive" size={12} /> Archive</button>
            </div>
          }
        </div>

        <div className="card entity-main">
          <div className="em-eyebrow">
            <span className="entity-card e-npc" style={{ display: "inline", padding: 0, background: "none", border: "none", boxShadow: "none" }}>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--stone-500)" }}>NPC · Antagonist · Revealed</span>
            </span>
          </div>
          <div className="em-name">Castellan Veyra</div>
          <div className="em-desc-line">Cool under pressure; dangerous when cornered. She has been waiting for this moment for eleven years.</div>
          <div className="em-actions">
            {edit ?
            <>
                  <button className="btn btn-ink btn-sm">Save</button>
                  <button className="btn btn-secondary btn-sm">Cancel</button>
                </> :
            <>
                  <button className="btn btn-secondary btn-sm"><I n="notes" size={12} /> Edit</button>
                  <button className="btn btn-ghost btn-sm"><I n="pin" size={12} /> Pin to prep</button>
                  <button className="btn btn-ghost btn-sm"><I n="spark" size={12} style={{ color: "var(--amber)" }} /> Ask Loom</button>
                </>}
          </div>

          {edit ?
          <>
              <div className="em-sep" />
              <div className="em-section-label">Description</div>
              <textarea style={{ width: "100%", minHeight: 90, padding: "9px 11px", border: "1px solid var(--border-1)", borderRadius: "var(--radius-md)", background: "var(--bg-1)", fontFamily: "var(--font-ui)", fontSize: 13, lineHeight: 1.6, color: "var(--fg-1)", resize: "vertical" }} defaultValue="Cool under pressure; dangerous when cornered. She has been waiting for this moment for eleven years. Speaks in half-truths. Keeps a personal cipher she uses for correspondence." />
              <div className="em-sep" />
              <div className="em-section-label">GM notes (private)</div>
              <textarea style={{ width: "100%", minHeight: 70, padding: "9px 11px", border: "1px solid var(--border-1)", borderRadius: "var(--radius-md)", background: "var(--bg-1)", fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 13, lineHeight: 1.6, color: "var(--fg-2)", resize: "vertical" }} defaultValue="She's not purely evil — she believes the current Crown is corrupt and this is the only way to fix it. Possible redemption arc if the party finds the right lever." />
              <div className="em-sep" />
              <div className="em-section-label" style={{ marginBottom: 8 }}>Linked entities</div>
              {[{ name: "House Kael", type: "Faction", color: "var(--hue-faction)" }, { name: "The Forged Deed", type: "Artifact", color: "#8B6914" }, { name: "Fenwick Harbor", type: "Location", color: "var(--hue-location)" }].map((e, i) =>
            <div key={i} className="ent-link">
                  <div className="ent-rule" style={{ background: e.color }} />
                  <div style={{ flex: 1 }}><div className="ent-link-name">{e.name}</div><div className="ent-link-type">{e.type}</div></div>
                  <button className="btn btn-ghost btn-sm"><I n="x" size={11} /></button>
                </div>
            )}
              <button className="btn btn-secondary btn-sm" style={{ marginTop: 6 }}><I n="plus" size={11} /> Link entity</button>
            </> :

          <>
              <div className="em-sep" />
              <div className="em-section-label">Description</div>
              <div className="em-body">Cool under pressure; dangerous when cornered. She has been waiting for this moment for eleven years. Speaks in half-truths. Keeps a personal cipher she uses for correspondence. Frequents the Tallow Gate — the party may not realise she knows they use it too.</div>
              <div className="em-sep" />
              <div className="em-section-label">GM notes (private)</div>
              <div className="em-gm-notes">She's not purely evil — she believes the current Crown is corrupt and this is the only way to fix it. Possible redemption arc if the party finds the right lever.</div>
              <div className="em-sep" />
              <div className="em-section-label">Canon history</div>
              {[{ text: "Revealed as the architect of the Kael forgery. The party overheard her giving orders at the keep.", meta: "Session 14 · Transcript 01:12:34" }, { text: "Orchestrated the ambush at the eastern gate. Three guards were bribed.", meta: "Session 15 · Transcript 00:44:01" }, { text: "Last seen boarding a riverboat headed toward the capital.", meta: "Session 15 · Transcript 01:58:22" }].map((e, i) =>
            <div key={i} className="canon-entry">
                  <div className="canon-dot" style={{ background: i === 2 ? "var(--amber)" : "var(--stone-300)" }} />
                  <div><div className="canon-text">{e.text}</div><div className="canon-meta">{e.meta}</div></div>
                </div>
            )}
              <div className="em-sep" />
              <div className="em-section-label">Related entities</div>
              {[{ name: "House Kael", type: "Faction", color: "var(--hue-faction)" }, { name: "The Forged Deed", type: "Artifact", color: "#8B6914" }, { name: "Fenwick Harbor", type: "Location", color: "var(--hue-location)" }].map((e, i) =>
            <div key={i} className="ent-link">
                  <div className="ent-rule" style={{ background: e.color }} />
                  <div style={{ flex: 1 }}><div className="ent-link-name">{e.name}</div><div className="ent-link-type">{e.type}</div></div>
                  <I n="chevRight" size={13} style={{ color: "var(--stone-500)" }} />
                </div>
            )}
            </>
          }
        </div>
      </div>
    </Shell>);

}

function LibraryNewEntity({ fromPrompt = false }) {
  return (
    <Shell active="library" pill="none" reviewCount={7} loomExpanded={true} loomMode="ask">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Library · New entity</div>
          <div className="page-title" style={{ fontSize: 32 }}>New character</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary">Cancel</button>
          <button className="btn btn-ink">Save to library</button>
        </div>
      </div>

      {fromPrompt &&
      <div className="guide-draft" style={{ marginBottom: 16 }}>
          <div className="guide-draft-label"><I n="spark" size={11} /> Drafted by Loom</div>
          <div className="guide-draft-text">This draft was generated from your prompt. Review and edit before saving to the library. It will not be added to canon until you save it.</div>
        </div>
      }

      <div className="lib-detail-layout">
        <div className="card entity-sidebar">
          <div style={{ width: 72, height: 72, borderRadius: "var(--radius-md)", background: "var(--stone-100)", border: "1px dashed var(--border-1)", display: "grid", placeItems: "center", margin: "0 auto 12px", color: "var(--stone-500)", cursor: "pointer" }}>
            <I n="plus" size={20} />
          </div>
          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--stone-500)", textAlign: "center", marginBottom: 12 }}>Add portrait</div>
          <div className="es-field">
            <div className="es-key">Type</div>
            <select className="settings-select" style={{ width: "100%", marginTop: 3 }}>
              <option>Character (NPC)</option>
              <option>Place</option>
              <option>Faction</option>
              <option>Artifact</option>
              <option>Lore note</option>
            </select>
          </div>
          <div className="es-sep" />
          <div className="es-field">
            <div className="es-key">Role</div>
            <select className="settings-select" style={{ width: "100%", marginTop: 3 }}><option>—</option><option>Ally</option><option>Antagonist</option><option>Neutral</option><option>Unknown</option></select>
          </div>
          <div className="es-field">
            <div className="es-key">Faction</div>
            <input className="settings-field" placeholder="Search factions…" style={{ marginTop: 3 }} />
          </div>
          <div className="es-field">
            <div className="es-key">Location</div>
            <input className="settings-field" placeholder="Search places…" style={{ marginTop: 3 }} />
          </div>
        </div>
        <div className="card entity-main">
          <div style={{ marginBottom: 14 }}>
            <div className="em-section-label" style={{ marginBottom: 5 }}>Name</div>
            <input className="settings-field" style={{ fontSize: 22, fontFamily: "var(--font-display)", padding: "9px 12px" }} placeholder={fromPrompt ? "The Dockmaster" : "Character name…"} defaultValue={fromPrompt ? "The Dockmaster" : ""} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div className="em-section-label" style={{ marginBottom: 5 }}>One-line description</div>
            <input className="settings-field" placeholder="Speaks with a slight lisp and carries a map he refuses to show anyone." defaultValue={fromPrompt ? "Revealed as an informant for the Crown. Allegiance unclear. Controls the eastern quay licences." : ""} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <div className="em-section-label" style={{ marginBottom: 5 }}>Description</div>
            <textarea className="settings-field" rows={5} style={{ resize: "vertical" }} placeholder="Full description, personality, history…" defaultValue={fromPrompt ? "He controls the eastern quay licences and has been feeding information to the Crown's intelligence service for three years. He does it not out of loyalty, but out of fear — House Kael has leverage over his family." : ""} />
          </div>
          <div>
            <div className="em-section-label" style={{ marginBottom: 5 }}>GM notes (private)</div>
            <textarea className="settings-field" rows={3} style={{ resize: "vertical", fontFamily: "var(--font-display)", fontStyle: "italic" }} placeholder="Private notes — never shown to players." />
          </div>
        </div>
      </div>
    </Shell>);

}

// ═══ PREPARE ════════════════════════════════════════════════

function PrepareView({ locked = false, ready = false }) {
  return (
    <Shell active="prepare" pill={locked ? "active" : ready ? "ready" : "prepping"} reviewCount={7} loomExpanded={true} loomMode="prep">
      <div className="page-head">
        <div>
          <div className="page-eyebrow"><Dot kind={ready ? "active" : locked ? "live pulse" : "amber"} /> Session 16 · {locked ? "Locked — session in progress" : ready ? "Ready for Stage" : "Prepping"}</div>
          <div className="page-title" style={{ fontSize: 36 }}>The Harbor Reckoning</div>
        </div>
        <div className="page-actions">
          {!locked && !ready && <button className="btn btn-secondary"><I n="sessions" size={13} /> Session overview</button>}
          {locked && <button className="btn btn-amber" style={{ gap: 8 }}><I n="bolt" size={13} /> Return to Stage</button>}
        </div>
      </div>

      {locked &&
      <div className="prep-locked-banner">
          <I n="lock" size={15} style={{ flexShrink: 0 }} />
          <span>Prep is locked while a session is in progress. You can read the packet but cannot edit it.</span>
        </div>
      }
      {ready &&
      <div className="prep-ready-banner">
          <I n="checkCircle" size={16} style={{ color: "var(--verdigris)", flexShrink: 0 }} />
          <div><div className="prep-ready-banner-label">Prep complete · Stage packet ready</div><div style={{ fontSize: 11, color: "var(--stone-700)", marginTop: 2 }}>10 of 10 checks · 5 scenes locked · Continuity verified</div></div>
          <button className="btn btn-secondary btn-sm" style={{ marginLeft: "auto", flexShrink: 0 }}>Edit prep</button>
        </div>
      }

      <div className="prep-grid">
        <div className="prep-col-left">
          <div className="card mini-card">
            <div className="mini-head">
              <SecLabel icon="sessions">Session overview</SecLabel>
              {!locked && <button className="btn btn-ghost btn-sm"><I n="notes" size={11} /></button>}
            </div>
            {[["Date", "Saturday · 7pm"], ["System", "D&D 5e"], ["Expected", "4 players"], ["Expected length", "3–4 hours"]].map(([k, v]) =>
            <div key={k} className="kv"><span className="kv-k">{k}</span><span className="kv-v">{v}</span></div>
            )}
          </div>
          <div className="card mini-card">
            <div className="mini-head"><SecLabel icon="checklist">Prep checklist</SecLabel></div>
            {[
            { done: true, text: "Write objective" },
            { done: true, text: "Write opening scene" },
            { done: true, text: "Plan key beats" },
            { done: true, text: "Scene planner complete" },
            { done: true, text: "Pin key entities" },
            { done: true, text: "Review active threads" },
            { done: ready || locked, text: "Check continuity risks" },
            { done: ready || locked, text: "Prepare contingencies" },
            { done: ready || locked, text: "Final read-through" },
            { done: ready || locked, text: "Mark as ready" }].
            map((item, i) =>
            <div key={i} className={"cl-item " + (item.done ? "done" : "todo")}>
                <div className={"cl-chk " + (item.done ? "done" : "todo")}>
                  {item.done ? <I n="check" size={11} /> : <I n="x" size={9} sw={1.5} style={{ opacity: 0.25 }} />}
                </div>
                <span className="cl-text">{item.text}</span>
              </div>
            )}
            <div style={{ padding: "8px 2px 2px", display: "flex", alignItems: "center", gap: 9 }}>
              <Meter value={ready || locked ? 10 : 6} max={10} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--stone-500)", whiteSpace: "nowrap" }}>{ready || locked ? 10 : 6} / 10</span>
            </div>
          </div>
          <div className="card mini-card">
            <div className="mini-head"><SecLabel icon="alert">Continuity watch</SecLabel></div>
            {[
            { warn: true, text: "Dockmaster allegiance not established in canon" },
            { warn: false, text: "Mira's debt — 2 session carry-over resolved" },
            { warn: false, text: "Veyra last confirmed at the capital" }].
            map((item, i) =>
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 0", borderTop: i > 0 ? "1px solid var(--border-2)" : "none" }}>
                <I n={item.warn ? "alert" : "checkCircle"} size={13} style={{ color: item.warn ? "var(--rust)" : "var(--verdigris)", flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 11, color: item.warn ? "var(--fg-1)" : "var(--stone-500)", lineHeight: 1.4 }}>{item.text}</span>
              </div>
            )}
          </div>
        </div>

        <div className="prep-center">
          <div className="card packet-card">
            <div className="packet-card-head">
              <SecLabel icon="notes">Session packet</SecLabel>
              {!locked && <button className="btn btn-ghost btn-sm"><I n="notes" size={11} /> Edit all</button>}
            </div>
            <div className="detail-tiles">
              {[
              { icon: "target", label: "Objective", body: "Mira must confront the Dockmaster before House Kael's agent arrives at midnight. Success means the deed is recoverable." },
              { icon: "flame", label: "Opening scene", body: "Dawn at Fenwick Harbor. The fog hasn't lifted. Dockworkers move crates. A body floats face-down in the slip between quays three and four." },
              { icon: "notes", label: "Briefing", body: "Session 15 ended with the ambush at the eastern gate. Mira survived. Veyra is en route to the capital. The clock is ticking." },
              { icon: "feather", label: "Continuity", body: "3 active threads feeding in. The Forged Succession enters its final phase. The siege clock ticks down — 3 sessions remain." }].
              map((t, i) =>
              <div key={i} className="detail-tile">
                  <div className="tile-head"><span className="tile-ico"><I n={t.icon} size={13} /></span><span className="tile-label">{t.label}</span></div>
                  <div className="tile-body">{t.body}</div>
                </div>
              )}
            </div>
          </div>

          <div className="scene-planner">
            <div className="planner-label">Scene planner</div>
            <div className="planner-track">
              {[
              { n: 1, name: "The Body", desc: "Discovery. Fog. Tension.", status: "locked", cls: "s-lock" },
              { n: 2, name: "The Dockmaster's Office", desc: "Confrontation. He's scared.", status: "locked", cls: "s-lock" },
              { n: 3, name: "The Midnight Signal", desc: "House Kael's agent arrives.", status: "locked", cls: "s-lock" },
              { n: 4, name: "The Quay Chase", desc: "Needs detail.", status: "needs", cls: "s-needs" },
              { n: 5, name: "Resolution", desc: "Open.", status: "needs", cls: "s-needs" }].
              map((s, i) =>
              <div key={i} className={"scene-card " + s.cls}>
                  <div className="scene-num">{s.n}</div>
                  <div className="scene-name-txt">{s.name}</div>
                  <div className="scene-desc-txt">{s.desc}</div>
                  <div className={"scene-status-txt " + (s.status === "locked" ? "lock" : "needs")}>
                    {s.status === "locked" ? <><I n="check" size={9} />Locked</> : <><I n="alert" size={9} />Needs detail</>}
                  </div>
                </div>
              )}
              {!locked && <button className="scene-add"><I n="plus" size={13} /><span>Scene</span></button>}
            </div>
          </div>

          <div className="prep-triple">
            {[
            { label: "Pinned entities", icon: "pin", items: [{ n: "Castellan Veyra", t: "NPC", cls: "e-npc" }, { n: "The Dockmaster", t: "NPC", cls: "e-npc" }, { n: "Mira Ashborne", t: "NPC", cls: "e-npc" }, { n: "Fenwick Harbor", t: "Location", cls: "e-location" }] },
            { label: "Locations & handouts", icon: "map", items: [{ n: "Harbor map", t: "Handout", cls: "e-location" }, { n: "The Tallow Gate", t: "Location", cls: "e-location" }, { n: "Quay 4", t: "Location detail", cls: "e-location" }] },
            { label: "Contingencies", icon: "bolt", items: [{ n: "If Mira refuses", t: "Consequence", cls: "e-lore" }, { n: "If Kael agent arrives early", t: "Beat variant", cls: "e-lore" }, { n: "If Dockmaster dies", t: "Thread impact", cls: "e-lore" }] }].
            map((col, i) =>
            <div key={i} className="card triple-card">
                <SecLabel icon={col.icon}>{col.label}</SecLabel>
                {col.items.map((item, j) =>
              <div key={j} className="asset-row">
                    <span className="asset-ico"><I n={col.icon} size={12} /></span>
                    <span className="asset-name">{item.n}</span>
                    <span className="asset-type-txt">{item.t}</span>
                  </div>
              )}
                {!locked && <button className="btn btn-ghost btn-sm" style={{ marginTop: 6, width: "100%", justifyContent: "flex-start" }}><I n="plus" size={11} />Add</button>}
              </div>
            )}
          </div>

          {!locked &&
          <div className="prep-cta">
              {ready ?
            <button className="cta-stage" style={{ fontSize: 26 }}><Seal size={24} /> Open in Stage</button> :
            <button className="cta-stage" style={{ gap: "10px" }}><Seal size={22} /> Ready for Stage</button>}
              <button className="btn-icon btn"><I n="more" size={16} /></button>
            </div>
          }
        </div>
      </div>
    </Shell>);

}

Object.assign(window, { LibraryOverview, EntityDetail, LibraryNewEntity, PrepareView });