import React from 'react';
import { Shell } from './Shell';
import { I, Dot, Chip, Avatar, SecLabel } from './Primitives';
import { useApp } from './AppContext';

const LIB_FILTERS = [
  { id: "all",      label: "All",       count: 64 },
  { id: "npc",      label: "Characters",count: 28 },
  { id: "location", label: "Places",    count: 14 },
  { id: "faction",  label: "Factions",  count: 7  },
  { id: "artifact", label: "Artifacts", count: 5  },
  { id: "lore",     label: "Lore",      count: 8  },
  { id: "archived", label: "Archived",  count: 12 }
];

interface EntityCard {
  cls: string;
  eyebrow: string;
  title: string;
  desc: string;
  meta: string;
  status: string;
  draft?: boolean;
}

const ENTITY_CARDS: EntityCard[] = [
  { cls: "e-npc",      eyebrow: "NPC · Antagonist", title: "Castellan Veyra",  desc: "Orchestrates the forgery from within the Crown's own keep. Cool under pressure; dangerous when cornered.", meta: "Updated · Session 15 · 1d ago",   status: "active"    },
  { cls: "e-npc",      eyebrow: "NPC · Ally",       title: "Mira Ashborne",    desc: "Dockworker turned courier. Owes a debt she won't name. Speaks in careful half-truths.",                       meta: "Updated · Session 16 · 4h ago",   status: "uncertain" },
  { cls: "e-npc",      eyebrow: "NPC · Uncertain",  title: "The Dockmaster",   desc: "Revealed as an informant for the Crown. Allegiance unclear. Speaks with a slight lisp.",                       meta: "Draft · Session 16 · just now",   status: "uncertain", draft: true },
  { cls: "e-faction",  eyebrow: "Faction · Antagonist", title: "House Kael",   desc: "A noble house with a manufactured lineage and real ambitions. Controls three of the harbor guild seats.",    meta: "Updated · Session 14 · 3d ago",   status: "active"    },
  { cls: "e-location", eyebrow: "Location · Port",  title: "Fenwick Harbor",   desc: "The commercial heart of Eryndal. Contested. The Kael faction controls the eastern quays.",                  meta: "Updated · Session 16 · 4h ago",   status: "active"    },
  { cls: "e-location", eyebrow: "Location · Tavern",title: "The Tallow Gate",  desc: "A safe house operating as a tavern. The party's de facto base of operations.",                              meta: "Updated · Session 13 · 2w ago",   status: "active"    }
];

interface LibraryOverviewProps {
  filter?: string;
  empty?: boolean;
}

export function LibraryOverview({ filter = "all", empty = false }: LibraryOverviewProps) {
  const app = useApp();

  const displayed: EntityCard[] = filter === "archived" ?
    [{ cls: "e-npc", eyebrow: "NPC · Archived", title: "Lord Esten (deceased)", desc: "Former commander of Thornwall. Killed in the ambush. Archived after Session 15.", meta: "Archived · Session 15", status: "archived" }] :
    filter === "npc"      ? ENTITY_CARDS.filter(e => e.cls === "e-npc") :
    filter === "location" ? ENTITY_CARDS.filter(e => e.cls === "e-location") :
    filter === "faction"  ? ENTITY_CARDS.filter(e => e.cls === "e-faction") :
    [...ENTITY_CARDS];

  return (
    <Shell active="library" pill="none" reviewCount={7} loomExpanded={false}>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">The Shattered Crown</div>
          <div className="page-title">Library</div>
          <div className="page-sub">Characters, places, factions, and the lore that holds them together.</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => app?.navigate("library", { libraryView: "newFromPrompt" })}><I n="spark" size={13} style={{ color: "var(--amber)" }} /> Draft from prompt</button>
          <button className="btn btn-ink" onClick={() => app?.navigate("library", { libraryView: "new" })}><I n="plus" size={13} /> New entity</button>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <div className="lib-filters">
          {LIB_FILTERS.map(f =>
            <button
              key={f.id}
              className={"lf-btn" + (filter === f.id ? " active" : "")}
              onClick={() => app?.update({ libraryFilter: f.id })}
            >
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
            <button className="btn btn-ink" onClick={() => app?.navigate("library", { libraryView: "new" })}><I n="users" size={13} /> Add character</button>
            <button className="btn btn-secondary" onClick={() => app?.navigate("library", { libraryView: "newFromPrompt" })}><I n="spark" size={13} style={{ color: "var(--amber)" }} /> Draft from prompt</button>
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
              <div
                key={i}
                className={"entity-card " + e.cls}
                style={e.status === "archived" ? { opacity: 0.7, cursor: "pointer" } : { cursor: "pointer" }}
                onClick={() => app?.navigate("library", { libraryView: "detail", libraryEntityEdit: false })}
              >
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
    </Shell>
  );
}

interface EntityDetailProps {
  edit?: boolean;
  dup?: boolean;
  archived?: boolean;
}

export function EntityDetail({ edit = false, dup = false, archived = false }: EntityDetailProps) {
  const app = useApp();
  return (
    <Shell active="library" pill="none" reviewCount={7} loomExpanded={true} loomMode="ask">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <button className="btn btn-ghost btn-sm" onClick={() => app?.navigate("library", { libraryView: "grid", libraryEntityEdit: false })}>
          <I n="chevLeft" size={12} /> Library
        </button>
      </div>

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
          <div style={{ width: 72, height: 72, borderRadius: "var(--r-md)", background: "var(--stone-100)", border: "1px solid var(--border-1)", display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
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
              {["Session 11", "Session 14", "Session 15"].map(s =>
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
                <button className="btn btn-ink btn-sm" style={{ width: "100%", justifyContent: "center" }} onClick={() => app?.update({ libraryEntityEdit: false })}>Save changes</button> :
                <button className="btn btn-secondary btn-sm" style={{ width: "100%", justifyContent: "center" }} onClick={() => app?.update({ libraryEntityEdit: true })}><I n="notes" size={12} /> Edit</button>}
              <button className="btn btn-ghost btn-sm" style={{ width: "100%", justifyContent: "center" }}><I n="archive" size={12} /> Archive</button>
            </div>
          }
        </div>

        <div className="card entity-main">
          <div className="em-eyebrow">
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--stone-500)" }}>NPC · Antagonist · Revealed</span>
          </div>
          <div className="em-name">Castellan Veyra</div>
          <div className="em-desc-line">Cool under pressure; dangerous when cornered. She has been waiting for this moment for eleven years.</div>
          <div className="em-actions">
            {edit ?
              <>
                <button className="btn btn-ink btn-sm" onClick={() => app?.update({ libraryEntityEdit: false })}>Save</button>
                <button className="btn btn-secondary btn-sm" onClick={() => app?.update({ libraryEntityEdit: false })}>Cancel</button>
              </> :
              <>
                <button className="btn btn-secondary btn-sm" onClick={() => app?.update({ libraryEntityEdit: true })}><I n="notes" size={12} /> Edit</button>
                <button className="btn btn-ghost btn-sm"><I n="pin" size={12} /> Pin to prep</button>
                <button className="btn btn-ghost btn-sm"><I n="spark" size={12} style={{ color: "var(--amber)" }} /> Ask Loom</button>
              </>}
          </div>

          {edit ?
            <>
              <div className="em-sep" />
              <div className="em-section-label">Description</div>
              <textarea style={{ width: "100%", minHeight: 90, padding: "9px 11px", border: "1px solid var(--border-1)", borderRadius: "var(--r-md)", background: "var(--bg-1)", fontFamily: "var(--font-ui)", fontSize: 13, lineHeight: 1.6, color: "var(--fg-1)", resize: "vertical" }} defaultValue="Cool under pressure; dangerous when cornered. She has been waiting for this moment for eleven years. Speaks in half-truths. Keeps a personal cipher she uses for correspondence." />
              <div className="em-sep" />
              <div className="em-section-label">GM notes (private)</div>
              <textarea style={{ width: "100%", minHeight: 70, padding: "9px 11px", border: "1px solid var(--border-1)", borderRadius: "var(--r-md)", background: "var(--bg-1)", fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 13, lineHeight: 1.6, color: "var(--fg-2)", resize: "vertical" }} defaultValue="She's not purely evil — she believes the current Crown is corrupt and this is the only way to fix it. Possible redemption arc if the party finds the right lever." />
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
                <div key={i} className="ent-link" onClick={() => app?.navigate("library", { libraryView: "detail" })} style={{ cursor: "pointer" }}>
                  <div className="ent-rule" style={{ background: e.color }} />
                  <div style={{ flex: 1 }}><div className="ent-link-name">{e.name}</div><div className="ent-link-type">{e.type}</div></div>
                  <I n="chevRight" size={13} style={{ color: "var(--stone-500)" }} />
                </div>
              )}
            </>
          }
        </div>
      </div>
    </Shell>
  );
}

interface LibraryNewEntityProps {
  fromPrompt?: boolean;
}

export function LibraryNewEntity({ fromPrompt = false }: LibraryNewEntityProps) {
  const app = useApp();
  return (
    <Shell active="library" pill="none" reviewCount={7} loomExpanded={true} loomMode="ask">
      <div className="page-head">
        <div>
          <div className="page-eyebrow">Library · New entity</div>
          <div className="page-title" style={{ fontSize: 32 }}>New character</div>
        </div>
        <div className="page-actions">
          <button className="btn btn-secondary" onClick={() => app?.navigate("library", { libraryView: "grid" })}>Cancel</button>
          <button className="btn btn-ink" onClick={() => app?.navigate("library", { libraryView: "grid" })}>Save to library</button>
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
          <div style={{ width: 72, height: 72, borderRadius: "var(--r-md)", background: "var(--stone-100)", border: "1px dashed var(--border-1)", display: "grid", placeItems: "center", margin: "0 auto 12px", color: "var(--stone-500)", cursor: "pointer" }}>
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
    </Shell>
  );
}
