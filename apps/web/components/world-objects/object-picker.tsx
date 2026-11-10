"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ObjectRef, RepresentationKind, WorldObjectId } from "@/lib/world/model";
import type { DeskStore } from "@/components/desk/use-desk";
import { FAMILY_LABELS } from "@/lib/world/object-presentation";
import styles from "./object-detail.module.css";

/** A semantic reference picker: names resolve to identities, never Canvas positions. */
export function ObjectPicker({ store, subject, label, value, onChange, kinds }: {
  store: Pick<DeskStore, "findObjects" | "search">;
  subject: WorldObjectId;
  label: string;
  value: ObjectRef | null;
  onChange: (value: ObjectRef | null) => void;
  kinds?: readonly RepresentationKind[];
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(value?.label ?? "");
  const [matches, setMatches] = useState<readonly ObjectRef[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [problem, setProblem] = useState(false);
  const { findObjects, search } = store;
  const kindKey = kinds?.join(",");
  useEffect(() => { if (value) setQuery(value.label); }, [value?.objectId, value?.label]);
  useEffect(() => {
    if (query.trim().length < 2 || value?.label === query) { setMatches([]); return; }
    let live = true;
    const timer = setTimeout(async () => {
      try {
        const found = kindKey ? (await search({ query, excludeId: subject, kinds: kindKey.split(",") as RepresentationKind[], limit: 6 })).map(entry => entry.ref) : await findObjects(query, subject);
        if (live) { setMatches(found); setActive(0); setProblem(false); }
      } catch { if (live) setProblem(true); }
    }, 180);
    return () => { live = false; clearTimeout(timer); };
  }, [query, value?.label, findObjects, search, subject, kindKey]);
  const choose = (ref: ObjectRef) => { setQuery(ref.label); onChange(ref); setOpen(false); };
  return <div ref={root} className={styles.picker} onBlur={event => { if (!root.current?.contains(event.relatedTarget)) setOpen(false); }}>
    <label htmlFor={id}>{label}</label>
    <input id={id} role="combobox" aria-autocomplete="list" aria-expanded={open && matches.length > 0} aria-controls={`${id}-results`} aria-activedescendant={open && matches[active] ? `${id}-option-${active}` : undefined} value={query} placeholder="Find an object in this world" onFocus={() => setOpen(true)} onChange={event => { setQuery(event.target.value); if (value) onChange(null); setOpen(true); }} onKeyDown={event => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); event.stopPropagation(); setOpen(true); setActive(current => Math.max(0, Math.min(matches.length - 1, current + (event.key === "ArrowDown" ? 1 : -1)))); }
      if (event.key === "Enter" && open && matches[active]) { event.preventDefault(); event.stopPropagation(); choose(matches[active]); }
      if (event.key === "Escape" && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); }
    }}/>
    {open && matches.length ? <div id={`${id}-results`} className={styles.pickerResults} role="listbox" aria-label={label}>{matches.map((ref, index) => <button type="button" role="option" id={`${id}-option-${index}`} aria-selected={active === index} key={ref.objectId} onMouseDown={event => event.preventDefault()} onClick={() => choose(ref)}><span>{ref.label}</span><small>{FAMILY_LABELS[ref.kind ?? "fragment"]}</small></button>)}</div> : null}
    {value ? <small className={styles.pickerSelected}>Linked to this world object</small> : null}
    {problem ? <small role="status">Search is unavailable. Try the name again.</small> : null}
  </div>;
}
