"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type FormEvent, type KeyboardEvent, type ReactNode } from "react";
import { richPlainText, richText, type MechanicsProfile, type RichDocument } from "@/lib/world/entity-document";
import { signed, statBlockLayout, type StatVital } from "@/lib/world/mechanics-presentation";
import { ObjectPicker } from "@/components/world-objects/object-picker";
import type { DeskStore } from "@/components/desk/use-desk";
import type { ObjectRef, WorldObjectId } from "@/lib/world/model";
import { RichContent, RichContentEditor } from "./rich-content";
import styles from "./mechanics.module.css";

export type StatBlockDepth = "card" | "focus" | "builder";
type Field = MechanicsProfile["fields"][number];
type Resource = MechanicsProfile["resources"][number];
type Feature = MechanicsProfile["features"][number];

export type MechanicsStatBlockProps = Readonly<{
  profile: MechanicsProfile;
  depth: StatBlockDepth;
  /** Builder depth is editable by default; set false for a read-only builder preview. */
  editable?: boolean;
  onChange?: (next: MechanicsProfile) => void;
  onReference?: (objectId: string) => void;
  /** Lets the equipment add flow link an existing world object. */
  objectPicker?: Readonly<{ store: Pick<DeskStore, "findObjects" | "search">; subject: WorldObjectId }>;
}>;

const CARD_FEATURES = 3;
const CARD_VITALS = 4;
const ROLES: readonly [MechanicsProfile["variant"], string][] = [["general", "General"], ["pc", "Player character"], ["npc", "NPC"], ["adversary", "Adversary"]];
const newId = () => crypto.randomUUID();
const display = (value: string | number | null) => value === null || value === "" ? "—" : String(value);
const coerceField = (previous: Field["value"], raw: string): Field["value"] => typeof previous === "number" && raw.trim() !== "" && Number.isFinite(Number(raw)) ? Number(raw) : typeof previous === "number" && raw.trim() === "" ? "" : raw;
const coerceCount = (raw: string): number | null | undefined => raw.trim() === "" ? null : Number.isFinite(Number(raw)) ? Number(raw) : undefined;
/** "30 ft." and "15 (natural armor)" keep the number large and the qualifier quiet. */
const leadNumber = (text: string): ReactNode => {
  const match = /^([+\-−]?\d+(?:[.,]\d+)?)\s+(.+)$/.exec(text);
  return match ? <>{match[1]}<span className={styles.vitalQualifier}> {match[2]}</span></> : /^\S{0,4}$/.test(text) ? text : <span className={styles.vitalText}>{text}</span>;
};
const move = <T,>(list: readonly T[], index: number, delta: number): T[] => {
  const next = [...list]; const target = index + delta;
  if (target < 0 || target >= next.length) return next;
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
};

/** A typeset value that becomes an input when activated. Enter or blur keeps, Escape restores. */
function EditableValue({ value, label, numeric, editable, onCommit, className, format }: { value: string | number | null; label: string; numeric?: boolean; editable: boolean; onCommit: (raw: string) => void; className?: string; format?: (text: string) => ReactNode }) {
  const [draft, setDraft] = useState<string | null>(null);
  const text = display(value);
  const shown = format ? format(text) : text;
  if (!editable) return <span className={className}>{shown}</span>;
  if (draft === null) return <button type="button" className={`${styles.editable} ${className ?? ""}`} aria-label={`${label}: ${text}. Edit`} onClick={() => setDraft(value === null ? "" : String(value))}>{shown}</button>;
  const finish = (keep: boolean) => { if (keep && draft !== String(value ?? "")) onCommit(draft); setDraft(null); };
  return <input autoFocus className={`${styles.editInput} ${className ?? ""}`} aria-label={label} value={draft} size={Math.max(2, draft.length + 1)} inputMode={numeric ? "decimal" : "text"}
    onFocus={event => event.currentTarget.select()} onChange={event => setDraft(event.target.value)} onBlur={() => finish(true)}
    onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => { if (event.key === "Enter") { event.preventDefault(); finish(true); } else if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); finish(false); } }}/>;
}

/** Rules prose that folds after three lines at Focus depth. */
function FeatureEntry({ name, description, depth, editable, onName, onDescription, onReference, nameEditable = true, emptyText = "No rules text yet." }: { emptyText?: string; name: string; description: RichDocument; depth: StatBlockDepth; editable: boolean; onName?: (name: string) => void; onDescription?: (value: RichDocument) => void; onReference?: (id: string) => void; nameEditable?: boolean }) {
  const body = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const [editing, setEditing] = useState(false);
  const folds = depth === "focus" && !editable;
  const hasText = richPlainText(description).trim() !== "";
  useLayoutEffect(() => {
    const element = body.current;
    if (!element || !folds || open) return;
    const measure = () => setOverflows(element.scrollHeight > element.clientHeight + 1);
    measure();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
    observer?.observe(element);
    return () => observer?.disconnect();
  }, [folds, open, description]);
  const title = editable && nameEditable && onName
    ? <EditableValue className={styles.featureName} value={name} label="Feature name" editable onCommit={raw => raw.trim() && onName(raw.trim())}/>
    : <span className={styles.featureName}>{name}</span>;
  return <div className={styles.feature} data-depth={depth}>
    <div ref={body} className={styles.featureBody} data-folded={(folds && !open) || depth === "card" || undefined}>
      {title}<span className={styles.featureStop}>. </span>
      {hasText ? <RichContent className={styles.featureProse} value={description} onReference={onReference}/> : editable ? <span className={styles.quiet}>{emptyText}</span> : null}
    </div>
    {folds && (overflows || open) ? <button type="button" className={styles.fold} aria-expanded={open} onClick={() => setOpen(current => !current)}>{open ? "Show less" : "Show more"}</button> : null}
    {editable && onDescription ? editing
      ? <div className={styles.featureEditor}><RichContentEditor value={description} ariaLabel={`${name} description`} onChange={onDescription} onExit={() => setEditing(false)}/><button type="button" className={styles.textAction} onClick={() => setEditing(false)}>Done</button></div>
      : <button type="button" className={styles.textAction} onClick={() => setEditing(true)} aria-label={`Edit text: ${name}`}>Edit text</button> : null}
  </div>;
}

function Vital({ vital, editable, onField, onResource }: { vital: StatVital; editable: boolean; onField: (field: Field, raw: string) => void; onResource: (resource: Resource, patch: Partial<Resource>) => void }) {
  if (vital.kind === "field") {
    const { field } = vital;
    return <div className={styles.vital}><dt>{field.label}</dt><dd><EditableValue className={styles.vitalValue} value={field.value} label={field.label} numeric={typeof field.value === "number"} editable={editable} onCommit={raw => onField(field, raw)} format={leadNumber}/></dd></div>;
  }
  const { resource } = vital;
  const step = (delta: number) => onResource(resource, { current: (resource.current ?? resource.max ?? 0) + delta });
  return <div className={styles.vital}>
    <dt>{resource.label}</dt>
    <dd>
      <EditableValue className={styles.vitalValue} value={resource.current} label={`${resource.label} current`} numeric editable={editable} onCommit={raw => { const next = coerceCount(raw); if (next !== undefined) onResource(resource, { current: next }); }}/>
      {resource.max !== null || editable ? <span className={styles.vitalMax}><span aria-hidden="true">/</span><span className={styles.visuallyHidden}>of</span><EditableValue value={resource.max} label={`${resource.label} maximum`} numeric editable={editable} onCommit={raw => { const next = coerceCount(raw); if (next !== undefined) onResource(resource, { max: next }); }}/></span> : null}
      {editable ? <span className={styles.stepper}><button type="button" aria-label={`Decrease ${resource.label}`} onClick={() => step(-1)}>−</button><button type="button" aria-label={`Increase ${resource.label}`} onClick={() => step(1)}>+</button></span> : null}
    </dd>
  </div>;
}

/** The ruleset's vitals alone, read-only: the at-the-table line in Focus. Renders nothing when there are none. */
export function MechanicsVitals({ profile, limit = CARD_VITALS }: { profile: MechanicsProfile; limit?: number }) {
  const vitals = statBlockLayout(profile).vitals.slice(0, limit);
  if (!vitals.length) return null;
  const ignore = () => undefined;
  return <dl className={styles.vitals} aria-label="Vitals">{vitals.map(vital => <Vital key={vital.kind === "field" ? vital.field.id : vital.resource.id} vital={vital} editable={false} onField={ignore} onResource={ignore}/>)}</dl>;
}

export function MechanicsStatBlock({ profile, depth, editable = depth === "builder", onChange, onReference, objectPicker }: MechanicsStatBlockProps) {
  const canEdit = editable && !!onChange && depth === "builder";
  const update = (next: MechanicsProfile) => onChange?.(next);
  const layout = statBlockLayout(profile, { includeEmpty: canEdit });
  const { attributes, groups } = layout;
  const vitals = depth === "card" ? layout.vitals.slice(0, CARD_VITALS) : layout.vitals;
  const [templateOpen, setTemplateOpen] = useState(false);
  const [addRequest, setAddRequest] = useState(0);
  const setField = (field: Field, raw: string) => update({ ...profile, fields: profile.fields.map(current => current.id === field.id ? { ...current, value: coerceField(current.value, raw) } : current) });
  const setResource = (resource: Resource, patch: Partial<Resource>) => update({ ...profile, resources: profile.resources.map(current => current.id === resource.id ? { ...current, ...patch } : current) });
  const setFeature = (feature: Feature, patch: Partial<Feature>) => update({ ...profile, features: profile.features.map(current => current.id === feature.id ? { ...current, ...patch } : current) });
  const features = depth === "card" ? profile.features.slice(0, CARD_FEATURES) : profile.features;
  const notesText = richPlainText(profile.notes).trim();
  const populated = profile.fields.filter(field => String(field.value).trim() !== "").length + profile.resources.length + profile.features.length;
  const empty = !vitals.length && !attributes.length && !groups.length && !profile.features.length && !profile.equipment.length;
  const columns = Math.min(6, attributes.length);

  const sections: ReactNode[] = [];
  if (vitals.length) sections.push(<dl key="vitals" className={styles.vitals} aria-label="Vitals">{vitals.map(vital => <Vital key={vital.kind === "field" ? vital.field.id : vital.resource.id} vital={vital} editable={canEdit} onField={setField} onResource={setResource}/>)}</dl>);
  if (attributes.length) sections.push(<dl key="attributes" className={styles.attributes} aria-label="Attributes" data-columns={columns} style={{ "--columns": columns } as CSSProperties}>
    {attributes.map(({ field, display: label, modifier }) => <div key={field.id}>
      <dt title={label === field.label ? undefined : field.label}>{label}</dt>
      <dd><EditableValue value={field.value} label={field.label} numeric={typeof field.value === "number"} editable={canEdit} onCommit={raw => setField(field, raw)}/>{modifier !== null ? <span className={styles.modifier}> ({signed(modifier)})</span> : null}</dd>
    </div>)}
  </dl>);
  if (depth !== "card") {
    for (const group of groups) sections.push(<div key={`group:${group.label}`} className={styles.lines} role="group" aria-label={group.label || "Statistics"}>
      {group.fields.length > 1 && group.label ? <span className={styles.groupLead}>{group.label}</span> : null}
      {group.fields.map(field => <span key={field.id} className={styles.line} data-long={String(field.value).length > 40 || undefined}>
        <span className={styles.lineLabel}>{field.label}</span>{" "}
        <EditableValue className={styles.lineValue} value={field.value} label={field.label} numeric={typeof field.value === "number"} editable={canEdit} onCommit={raw => setField(field, raw)}/>
      </span>)}
    </div>);
    if (profile.equipment.length) sections.push(<p key="equipment" className={styles.equipment}>
      <span className={styles.lineLabel}>Equipment</span>{" "}
      {profile.equipment.map((item, index) => <span key={item.id}>{item.objectId && onReference ? <button type="button" className={styles.reference} onClick={() => onReference(item.objectId!)}>{item.label}</button> : item.label}{index < profile.equipment.length - 1 ? ", " : ""}</span>)}
    </p>);
  }
  if (features.length) sections.push(<div key="features" className={styles.features} role="group" aria-label="Features">
    {features.map(feature => <FeatureEntry key={feature.id} name={feature.name} description={feature.description} depth={depth} editable={canEdit} onReference={onReference}
      onName={name => setFeature(feature, { name })} onDescription={description => setFeature(feature, { description })}/>)}
    {depth === "card" && profile.features.length > CARD_FEATURES ? <p className={styles.quiet}>{profile.features.length - CARD_FEATURES} more in Focus</p> : null}
  </div>);
  if (depth !== "card" && (notesText || canEdit)) sections.push(<div key="notes" className={styles.features}>
    <FeatureEntry name="Notes" emptyText="No notes yet." nameEditable={false} description={profile.notes} depth={depth} editable={canEdit} onReference={onReference} onDescription={notes => update({ ...profile, notes })}/>
  </div>);

  return <div className={styles.statBlock} data-depth={depth} data-editable={canEdit || undefined}>
    {depth !== "card" ? <p className={styles.system}><span>{profile.system || "Mechanics"}</span>{profile.variant !== "general" ? <span>{ROLES.find(([value]) => value === profile.variant)?.[1]}</span> : null}</p> : null}
    {sections}
    {canEdit && populated < 6 ? <button type="button" className={styles.addStatistics} onClick={() => { setTemplateOpen(true); setAddRequest(count => count + 1); }}>Add statistics</button>
      : empty && !canEdit ? <p className={styles.quiet}>No statistics recorded yet.</p> : null}
    {canEdit ? <TemplatePanel profile={profile} update={update} open={templateOpen} onOpenChange={setTemplateOpen} objectPicker={objectPicker} addRequest={addRequest}/> : null}
  </div>;
}

function RowControls({ label, index, count, onMove, onRemove }: { label: string; index: number; count: number; onMove: (delta: number) => void; onRemove: () => void }) {
  return <span className={styles.rowControls}>
    <button type="button" aria-label={`Move ${label} up`} disabled={index === 0} onClick={() => onMove(-1)}>↑</button>
    <button type="button" aria-label={`Move ${label} down`} disabled={index === count - 1} onClick={() => onMove(1)}>↓</button>
    <button type="button" aria-label={`Remove ${label}`} onClick={onRemove}>Remove</button>
  </span>;
}

function TemplatePanel({ profile, update, open, onOpenChange, objectPicker, addRequest }: { profile: MechanicsProfile; update: (next: MechanicsProfile) => void; open: boolean; onOpenChange: (open: boolean) => void; objectPicker?: MechanicsStatBlockProps["objectPicker"]; addRequest: number }) {
  const addInput = useRef<HTMLInputElement>(null);
  useEffect(() => { if (addRequest) addInput.current?.focus(); }, [addRequest]);
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldGroup, setFieldGroup] = useState("");
  const [fieldKind, setFieldKind] = useState<"number" | "text">("number");
  const [equipmentLabel, setEquipmentLabel] = useState("");
  const [equipmentRef, setEquipmentRef] = useState<ObjectRef | null>(null);
  const groups = [...new Set(profile.fields.map(field => field.group).filter(Boolean))];
  const addField = (event: FormEvent) => {
    event.preventDefault();
    if (!fieldLabel.trim()) return;
    update({ ...profile, fields: [...profile.fields, { id: newId(), label: fieldLabel.trim(), group: fieldGroup.trim() || groups[0] || "Statistics", value: fieldKind === "number" ? 0 : "" }] });
    setFieldLabel("");
  };
  const addEquipment = (event: FormEvent) => {
    event.preventDefault();
    if (!equipmentLabel.trim() && !equipmentRef) return;
    update({ ...profile, equipment: [...profile.equipment, { id: newId(), label: equipmentRef?.label || equipmentLabel.trim(), ...(equipmentRef ? { objectId: equipmentRef.objectId } : {}) }] });
    setEquipmentLabel(""); setEquipmentRef(null);
  };
  return <details className={styles.template} open={open} onToggle={event => onOpenChange(event.currentTarget.open)}>
    <summary>Template</summary>
    <div className={styles.templateBody}>
      <div className={styles.templateRow}>
        <label>Ruleset<input aria-label="Ruleset" value={profile.system} onChange={event => update({ ...profile, system: event.target.value })}/></label>
        <label>Role<select aria-label="Mechanical role" value={profile.variant} onChange={event => update({ ...profile, variant: event.target.value as MechanicsProfile["variant"] })}>{ROLES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>

      <fieldset><legend>Fields</legend>
        <ul className={styles.templateList}>{profile.fields.map((field, index) => <li key={field.id}>
          <input aria-label="Field label" value={field.label} onChange={event => update({ ...profile, fields: profile.fields.map(current => current.id === field.id ? { ...current, label: event.target.value } : current) })}/>
          <input aria-label={`${field.label} group`} value={field.group} list="mechanics-groups" onChange={event => update({ ...profile, fields: profile.fields.map(current => current.id === field.id ? { ...current, group: event.target.value } : current) })}/>
          <select aria-label={`${field.label} type`} value={typeof field.value === "number" ? "number" : "text"} onChange={event => update({ ...profile, fields: profile.fields.map(current => current.id !== field.id ? current : { ...current, value: event.target.value === "number" ? (Number.isFinite(Number(current.value)) && String(current.value).trim() !== "" ? Number(current.value) : 0) : String(current.value) }) })}><option value="number">Number</option><option value="text">Text</option></select>
          <RowControls label={field.label} index={index} count={profile.fields.length} onMove={delta => update({ ...profile, fields: move(profile.fields, index, delta) })} onRemove={() => update({ ...profile, fields: profile.fields.filter(current => current.id !== field.id) })}/>
        </li>)}</ul>
        <datalist id="mechanics-groups">{groups.map(group => <option key={group} value={group}/>)}</datalist>
        <form className={styles.templateAdd} onSubmit={addField}>
          <input ref={addInput} aria-label="New mechanical field" value={fieldLabel} onChange={event => setFieldLabel(event.target.value)} placeholder="Field name"/>
          <input aria-label="New field group" value={fieldGroup} list="mechanics-groups" onChange={event => setFieldGroup(event.target.value)} placeholder={groups[0] || "Group"}/>
          <select aria-label="New field type" value={fieldKind} onChange={event => setFieldKind(event.target.value as "number" | "text")}><option value="number">Number</option><option value="text">Text</option></select>
          <button>Add field</button>
        </form>
      </fieldset>

      <fieldset><legend>Resources</legend>
        <ul className={styles.templateList}>{profile.resources.map((resource, index) => <li key={resource.id}>
          <input aria-label="Resource name" value={resource.label} onChange={event => update({ ...profile, resources: profile.resources.map(current => current.id === resource.id ? { ...current, label: event.target.value } : current) })}/>
          <RowControls label={resource.label} index={index} count={profile.resources.length} onMove={delta => update({ ...profile, resources: move(profile.resources, index, delta) })} onRemove={() => update({ ...profile, resources: profile.resources.filter(current => current.id !== resource.id) })}/>
        </li>)}</ul>
        <button type="button" className={styles.textAction} onClick={() => update({ ...profile, resources: [...profile.resources, { id: newId(), label: "New resource", current: null, max: null }] })}>Add resource</button>
      </fieldset>

      <fieldset><legend>Features</legend>
        <ul className={styles.templateList}>{profile.features.map((feature, index) => <li key={feature.id}>
          <input aria-label="Feature name" value={feature.name} onChange={event => update({ ...profile, features: profile.features.map(current => current.id === feature.id ? { ...current, name: event.target.value } : current) })}/>
          <RowControls label={feature.name} index={index} count={profile.features.length} onMove={delta => update({ ...profile, features: move(profile.features, index, delta) })} onRemove={() => update({ ...profile, features: profile.features.filter(current => current.id !== feature.id) })}/>
        </li>)}</ul>
        <button type="button" className={styles.textAction} onClick={() => update({ ...profile, features: [...profile.features, { id: newId(), name: "New feature", description: richText("") }] })}>Add feature</button>
      </fieldset>

      <fieldset><legend>Equipment</legend>
        <ul className={styles.templateList}>{profile.equipment.map((item, index) => <li key={item.id}>
          <input aria-label="Equipment name" value={item.label} onChange={event => update({ ...profile, equipment: profile.equipment.map(current => current.id === item.id ? { ...current, label: event.target.value } : current) })}/>
          <RowControls label={item.label} index={index} count={profile.equipment.length} onMove={delta => update({ ...profile, equipment: move(profile.equipment, index, delta) })} onRemove={() => update({ ...profile, equipment: profile.equipment.filter(current => current.id !== item.id) })}/>
        </li>)}</ul>
        <form className={styles.templateAdd} data-picker={objectPicker ? true : undefined} onSubmit={addEquipment}>
          <input aria-label="New equipment" value={equipmentLabel} onChange={event => setEquipmentLabel(event.target.value)} placeholder="Equipment name"/>
          {objectPicker ? <ObjectPicker store={objectPicker.store} subject={objectPicker.subject} value={equipmentRef} onChange={setEquipmentRef} label="Or link an existing item"/> : null}
          <button>Add equipment</button>
        </form>
      </fieldset>
    </div>
  </details>;
}
