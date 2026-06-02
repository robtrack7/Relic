import React, { useState, useEffect } from 'react';
import { Shell } from './Shell';
import { I, Dot, SecLabel } from './Primitives';
import { useApp } from './AppContext';

const REVIEW_ITEMS = [
  { title:"The Dockmaster",               type:"New NPC",         conf:"high", dot:"new",    sess:"Session 16", has_conflict:false },
  { title:"Mira Ashborne — status update",type:"NPC update",      conf:"med",  dot:"update", sess:"Session 16", has_conflict:true  },
  { title:"Fenwick Harbor — consequence", type:"Location update", conf:"high", dot:"update", sess:"Session 16", has_conflict:false },
  { title:"The Forged Succession advance",type:"Thread update",   conf:"med",  dot:"update", sess:"Session 16", has_conflict:false },
  { title:"Recap: Session 16",            type:"Session recap",   conf:"med",  dot:"new",    sess:"Session 16", has_conflict:false },
  { title:"Aldric Fenmore",               type:"New NPC",         conf:"low",  dot:"danger", sess:"Session 15", has_conflict:false },
  { title:"Lord Esten — deceased",        type:"Status change",   conf:"high", dot:"danger", sess:"Session 15", has_conflict:false },
];

interface ReviewViewProps {
  emptyState?: boolean;
  selected?: number;
}

export function ReviewView({ emptyState=false, selected=0 }: ReviewViewProps) {
  const app = useApp();
  const [selectedIdx, setSelectedIdx] = useState(selected);

  useEffect(() => { setSelectedIdx(selected); }, [selected]);

  function selectItem(i: number) {
    setSelectedIdx(i);
    app?.update({ selectedReviewIdx: i });
  }

  const item = REVIEW_ITEMS[selectedIdx] || REVIEW_ITEMS[0];
  const groups = [
    { label:"Session 16", items: REVIEW_ITEMS.filter(i=>i.sess==="Session 16"), offset: 0 },
    { label:"Session 15", items: REVIEW_ITEMS.filter(i=>i.sess==="Session 15"), offset: REVIEW_ITEMS.filter(i=>i.sess==="Session 16").length },
  ];

  return (
    <Shell active="review" pill="none" reviewCount={emptyState?0:7} loomExpanded={false}>
      <div className="page-head">
        <div>
          <div className="page-eyebrow">The Shattered Crown</div>
          <div className="page-title">Review</div>
          <div className="page-sub">Nothing enters canon until you approve it.</div>
        </div>
      </div>

      {emptyState ? (
        <div className="empty-state">
          <div style={{fontSize:36,fontFamily:"var(--font-display)",color:"var(--stone-300)"}}>✓</div>
          <div className="empty-title">Queue is clear</div>
          <div className="empty-desc">All items have been reviewed. Your saga is in good shape.</div>
        </div>
      ) : (
        <div className="review-layout">
          <div className="card rq-card">
            <div className="rq-head">
              <div className="rq-title-txt">Approval queue</div>
              <div className="rq-count"><Dot kind="loose" style={{marginRight:4}} />{REVIEW_ITEMS.length} pending</div>
            </div>
            {groups.map(group=>(
              <div key={group.label}>
                <div className="rq-group-label">{group.label}</div>
                {group.items.map((it,i)=>{
                  const globalIdx = group.offset + i;
                  return (
                    <div
                      key={i}
                      className={"rq-item"+(globalIdx===selectedIdx?" sel":"")}
                      onClick={() => selectItem(globalIdx)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className={"rq-dot "+it.dot} />
                      <div className="rq-item-body">
                        <div className="rq-item-title">{it.title}</div>
                        <div className="rq-item-type">{it.type}</div>
                      </div>
                      <div className={"rq-conf "+it.conf}>{it.conf}</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="card dd-card">
            <div className="dd-eyebrow">
              <span className="chip stone">{item.type}</span>
              <span className={"conf-badge "+item.conf}>{item.conf} confidence</span>
              <span style={{marginLeft:"auto",fontFamily:"var(--font-mono)",fontSize:8,color:"var(--stone-500)"}}>{item.sess}</span>
            </div>
            <div className="dd-title">{item.title}</div>
            <div className="dd-actions">
              <button className="btn btn-amber btn-sm"><I n="check" size={12} /> Approve</button>
              <button className="btn btn-secondary btn-sm"><I n="notes" size={12} /> Edit &amp; Approve</button>
              <button className="btn btn-rust btn-sm"><I n="x" size={12} /> Reject</button>
              <button className="btn btn-ghost btn-sm"><I n="archive" size={12} /> Archive</button>
            </div>

            {item.has_conflict && (
              <div className="conflict-panel">
                <div className="conflict-title"><I n="alert" size={11} />Continuity conflict</div>
                <div className="conflict-desc">This update conflicts with an existing canon entry. Mira's status was "Endangered" in Session 15 canon. Review both before approving.</div>
                <button className="btn btn-ghost btn-sm" style={{marginTop:7}}>View conflicting entry</button>
              </div>
            )}

            {item.conf==="low" && (
              <div className="stale-warning">
                <I n="alert" size={14} style={{color:"var(--amber)",flexShrink:0}} />
                <span>Low confidence — source is incomplete or ambiguous. Verify before committing to canon.</span>
              </div>
            )}

            <div className="diff-block">
              <div className="diff-label">Proposed changes</div>
              {selectedIdx===0 ? (
                <>
                  <div className="diff-row">
                    <span className="diff-key">New entity</span>
                    <span className="diff-new" style={{fontFamily:"var(--font-display)",fontSize:14}}>The Dockmaster</span>
                  </div>
                  <div className="diff-row">
                    <span className="diff-key">Type</span>
                    <span className="diff-ctx">NPC · Uncertain</span>
                  </div>
                  <div className="diff-row">
                    <span className="diff-key">Description</span>
                    <span className="diff-ctx">Revealed as an informant for the Crown. Controls eastern quay licences.</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="diff-row">
                    <span className="diff-key">Status</span>
                    <span className="diff-old">Endangered</span>
                    <span className="diff-arr">→</span>
                    <span className="diff-new">At large</span>
                  </div>
                  <div className="diff-row">
                    <span className="diff-key">Note</span>
                    <span className="diff-ctx">Escaped the harbor confrontation. Location unknown.</span>
                  </div>
                </>
              )}
            </div>

            <div className="source-dock">
              <div className="source-dock-label">Source &amp; provenance</div>
              <div className="source-ref"><em>Transcript</em> · Session 16 · 01:23:45</div>
              <div className="source-ref" style={{marginTop:4,color:"var(--stone-500)"}}>{"\"He works for the Crown. Has done for three years. He didn't want to, but they have his family.\""}</div>
              <div style={{marginTop:7,display:"flex",gap:6,flexWrap:"wrap"}}>
                <span className="source-chip"><I n="anchor" size={8} />Session 16 transcript</span>
                <span className="source-chip"><I n="notes" size={8} />Quick capture</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </Shell>
  );
}
