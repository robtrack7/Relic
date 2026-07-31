"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  autosaveSessionPrepAction,
  mutateSessionPrepAction,
  readyForStageAction,
  setPrepAiReviewStateAction,
  startPrepAiAction
} from "@/app/actions";
import { RelicIcon } from "@/components/RelicIcon";
import { SessionPrepAiPanel } from "@/components/SessionPrepAiPanel";
import type { PrepAiRequest } from "@/lib/data";
import { sagaPath } from "@/lib/routes";
import type { IdParams, SessionPrepData, SessionPrepPin } from "@/lib/types";

type SaveState = "saved" | "unsaved" | "recovered" | "saving" | "offline" | "failed" | "conflict";
type DraftValues = { name: string; plannedStartAt: string; objective: string; openingScene: string; sceneNotes: string; prepChecklist: string; pinnedEntityKeys: string[]; activeThreadIds: string[] };
type StoredDraft = { baseVersion: string; values: DraftValues; savedAt: string };

function localDateTime(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso); const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function isoDateTime(value: string) { return value ? new Date(value).toISOString() : ""; }
function checklistText(prep: SessionPrepData) { return (prep.session.prep_checklist ?? []).map((item) => item.text).filter(Boolean).join("\n"); }
function initialValues(prep: SessionPrepData): DraftValues {
  return { name: prep.session.name, plannedStartAt: localDateTime(prep.session.planned_start_at), objective: prep.session.objective ?? "", openingScene: prep.session.opening_scene ?? "", sceneNotes: prep.session.scene_notes ?? "", prepChecklist: checklistText(prep), pinnedEntityKeys: prep.pinned_entities.map((pin) => pin.key), activeThreadIds: prep.active_threads.map((pin) => pin.entity_id) };
}
function serialized(values: DraftValues) { return JSON.stringify(values); }
function move<T>(items: T[], index: number, direction: -1 | 1) { const target=index+direction;if(target<0||target>=items.length)return items;const copy=[...items];[copy[index],copy[target]]=[copy[target],copy[index]];return copy; }

export function SessionPrepEditor({
  params,
  initialPrep,
  initialAiRequests = [],
  surface
}: {
  params: IdParams;
  initialPrep: SessionPrepData;
  initialAiRequests?: PrepAiRequest[];
  surface: "inline" | "full";
}) {
  const router = useRouter(); const root = sagaPath(params); const draftKey = `relic:prep-draft:${params.workspaceId}:${params.worldId}:${params.sagaId}:${initialPrep.session.id}`;
  const serverInitial = useMemo(() => initialValues(initialPrep), [initialPrep]);
  const [values, setValues] = useState(serverInitial);
  const [pins, setPins] = useState<SessionPrepPin[]>(initialPrep.pinned_entities);
  const [threads, setThreads] = useState<SessionPrepPin[]>(initialPrep.active_threads);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [message, setMessage] = useState(""); const [menuOpen,setMenuOpen]=useState(false); const [actionBusy,setActionBusy]=useState(false);
  const valuesRef=useRef(values);const pinsRef=useRef(pins);const threadsRef=useRef(threads);const versionRef=useRef(initialPrep.session.updated_at??"");const lastSavedRef=useRef(serialized(serverInitial));const timerRef=useRef<ReturnType<typeof setTimeout>|null>(null);const inFlightRef=useRef<Promise<boolean>|null>(null);const conflictRef=useRef(false);const hydratedRef=useRef(false);
  const locked=!(["planned","ready"].includes(initialPrep.session.status)); const ready=initialPrep.session.status==="ready";
  valuesRef.current=values;pinsRef.current=pins;threadsRef.current=threads;conflictRef.current=saveState==="conflict";

  const currentValues=useCallback(():DraftValues=>({...valuesRef.current,pinnedEntityKeys:pinsRef.current.map((pin)=>pin.key),activeThreadIds:threadsRef.current.map((pin)=>pin.entity_id)}),[]);
  const persistDraft=useCallback((next:DraftValues)=>{try{localStorage.setItem(draftKey,JSON.stringify({baseVersion:versionRef.current,values:next,savedAt:new Date().toISOString()} satisfies StoredDraft));}catch{setMessage("Local recovery storage is unavailable. Keep this tab open until saving succeeds.");}},[draftKey]);

  const buildForm=useCallback((captured:DraftValues)=>{const form=new FormData();Object.entries(params).forEach(([key,value])=>form.set(key,value));form.set("sessionId",initialPrep.session.id);form.set("expectedVersion",versionRef.current);form.set("name",captured.name);form.set("plannedStartAt",isoDateTime(captured.plannedStartAt));form.set("objective",captured.objective);form.set("openingScene",captured.openingScene);form.set("sceneNotes",captured.sceneNotes);form.set("prepChecklist",captured.prepChecklist);captured.pinnedEntityKeys.forEach((key)=>form.append("pinnedEntity",key));captured.activeThreadIds.forEach((id)=>form.append("activeThread",id));return form;},[initialPrep.session.id,params]);

  useEffect(()=>{let recovered:StoredDraft|null=null;try{recovered=JSON.parse(localStorage.getItem(draftKey)??"null") as StoredDraft|null;}catch{localStorage.removeItem(draftKey);}hydratedRef.current=true;if(!recovered)return;const nextPins=recovered.values.pinnedEntityKeys.map((key)=>initialPrep.pinned_entities.find((pin)=>pin.key===key)??initialPrep.options.entities.find((pin)=>pin.key===key)??{key,entity_type:key.split(":")[0] as SessionPrepPin["entity_type"],entity_id:key.split(":")[1],name:`Unavailable ${key.split(":")[0]}`,state:"missing" as const,order_index:0});const nextThreads=recovered.values.activeThreadIds.map((id)=>initialPrep.active_threads.find((pin)=>pin.entity_id===id)??initialPrep.options.threads.find((pin)=>pin.entity_id===id)??{key:`thread:${id}`,entity_type:"thread" as const,entity_id:id,name:"Unavailable Thread",state:"missing" as const,order_index:0});setValues(recovered.values);setPins(nextPins);setThreads(nextThreads);setSaveState(recovered.baseVersion===(initialPrep.session.updated_at??"")?"recovered":"conflict");},[draftKey,initialPrep]);

  const saveNow=useCallback(async():Promise<boolean>=>{
    if(locked||conflictRef.current)return false;
    if(inFlightRef.current){await inFlightRef.current;if(serialized(currentValues())!==lastSavedRef.current)return saveNow();return true;}
    const captured=currentValues();const snapshot=serialized(captured);if(snapshot===lastSavedRef.current){localStorage.removeItem(draftKey);setSaveState("saved");return true;}
    persistDraft(captured);if(!navigator.onLine){setSaveState("offline");setMessage("Offline. Your draft is stored on this device; retry when the connection returns.");return false;}
    setSaveState("saving");setMessage("");
    const request=(async()=>{try{const result=await autosaveSessionPrepAction(buildForm(captured));if(!result.ok){setSaveState(result.conflict?"conflict":"failed");setMessage(result.error);return false;}versionRef.current=result.updatedAt;lastSavedRef.current=snapshot;const latest=currentValues();if(serialized(latest)===snapshot){localStorage.removeItem(draftKey);setSaveState("saved");}else{persistDraft(latest);setSaveState("unsaved");}return true;}catch{setSaveState("failed");setMessage("Save failed. Your input is stored on this device; retry when the connection returns.");return false;}finally{inFlightRef.current=null;}})();inFlightRef.current=request;const ok=await request;if(serialized(currentValues())!==lastSavedRef.current&&!conflictRef.current){if(timerRef.current)clearTimeout(timerRef.current);timerRef.current=setTimeout(()=>void saveNow(),0);}return ok;
  },[buildForm,currentValues,draftKey,locked,persistDraft]);

  useEffect(()=>{if(!hydratedRef.current||locked)return;const next=currentValues();if(serialized(next)===lastSavedRef.current)return;persistDraft(next);setSaveState((state)=>["recovered","saving","offline","failed","conflict"].includes(state)?state:"unsaved");if(["saving","offline","failed","conflict"].includes(saveState))return;if(timerRef.current)clearTimeout(timerRef.current);timerRef.current=setTimeout(()=>void saveNow(),800);return()=>{if(timerRef.current)clearTimeout(timerRef.current);};},[currentValues,locked,persistDraft,pins,saveNow,saveState,threads,values]);
  useEffect(()=>{const online=()=>{if(saveState==="offline")setMessage("Connection restored. Retry when ready.");};const offline=()=>{if(serialized(currentValues())!==lastSavedRef.current)setSaveState("offline");};window.addEventListener("online",online);window.addEventListener("offline",offline);return()=>{window.removeEventListener("online",online);window.removeEventListener("offline",offline);};},[currentValues,saveState]);

  function update(field:keyof Omit<DraftValues,"pinnedEntityKeys"|"activeThreadIds">,value:string){setValues((current)=>({...current,[field]:value}));}
  function removePin(pin:SessionPrepPin,kind:"entity"|"thread"){if(kind==="entity")setPins((current)=>current.filter((item)=>item.key!==pin.key));else setThreads((current)=>current.filter((item)=>item.entity_id!==pin.entity_id));}
  async function prepAction(operation:"reset"|"archive"|"duplicate"){if(!(await saveNow()))return;setActionBusy(true);const form=new FormData();Object.entries(params).forEach(([key,value])=>form.set(key,value));form.set("sessionId",initialPrep.session.id);form.set("expectedVersion",versionRef.current);form.set("operation",operation);form.set("requestKey",globalThis.crypto?.randomUUID?.()??`${Date.now()}-${operation}`);const result=await mutateSessionPrepAction(form);setActionBusy(false);if(!result.ok){setMessage(result.error);setSaveState(result.conflict?"conflict":"failed");return;}localStorage.removeItem(draftKey);if(operation==="duplicate"&&typeof result.result.session_id==="string")router.push(`${root}/sessions/${result.result.session_id}/prep`);else if(operation==="archive")router.push(`${root}/sessions`);else router.refresh();}
  async function readyForStage(){if(!(await saveNow())){setMessage("Ready for Stage is waiting for a successful save.");return;}const form=new FormData();Object.entries(params).forEach(([key,value])=>form.set(key,value));form.set("sessionId",initialPrep.session.id);const result=await readyForStageAction(form);if(!result.ok){setMessage(result.error);return;}router.push(result.stagePath);}
  const reviewPrepAi=useCallback(async(request:PrepAiRequest,state:"accepted"|"rejected"|"dismissed",editedPayload:Record<string,unknown>|null=null)=>{
    const form=new FormData();Object.entries(params).forEach(([key,value])=>form.set(key,value));form.set("sessionId",initialPrep.session.id);form.set("requestId",request.id);form.set("reviewState",state);if(editedPayload)form.set("editedPayload",JSON.stringify(editedPayload));if(state==="accepted")form.set("acceptedPrepVersion",versionRef.current);
    const result=await setPrepAiReviewStateAction(form);if(!result.ok){setMessage(result.error);return false;}setMessage(state==="accepted"?(result.result.destination==="approval_queue"?"Proposal sent to the Approval Queue.":"Suggestion accepted through Prep autosave."):`Suggestion ${state}.`);router.refresh();return true;
  },[initialPrep.session.id,params,router]);
  const startPrepAi=useCallback(async(task:string,input:Record<string,unknown>,options?:{requestId?:string;prepVersion?:string;parentRequestId?:string|null})=>{
    if(!options?.requestId&&!(await saveNow())){setMessage("Prep AI is waiting for the current manual draft to save.");return false;}
    const requestId=options?.requestId??globalThis.crypto.randomUUID();const form=new FormData();Object.entries(params).forEach(([key,value])=>form.set(key,value));form.set("sessionId",initialPrep.session.id);form.set("taskName",task);form.set("requestId",requestId);form.set("prepVersion",options?.prepVersion??versionRef.current);form.set("input",JSON.stringify(input));if(options?.parentRequestId)form.set("parentRequestId",options.parentRequestId);
    const result=await startPrepAiAction(form);if(!result.ok)setMessage(result.error);else setMessage("Prep AI result is ready for review.");router.refresh();return result.ok;
  },[initialPrep.session.id,params,router,saveNow]);
  const acceptPrepAi=useCallback(async(request:PrepAiRequest,scope:"objective"|"opening_scene"|"scene_notes"|"prep_checklist"|"pinned_entities"|"active_threads",value:string|string[],editedPayload:Record<string,unknown>)=>{
    const next=currentValues();let nextPins=[...pinsRef.current];let nextThreads=[...threadsRef.current];
    if(scope==="objective"&&typeof value==="string")next.objective=value;
    else if(scope==="opening_scene"&&typeof value==="string")next.openingScene=value;
    else if(scope==="scene_notes"&&typeof value==="string"&&!next.sceneNotes.includes(value.trim()))next.sceneNotes=[next.sceneNotes.trim(),value.trim()].filter(Boolean).join("\n\n");
    else if(scope==="prep_checklist"&&Array.isArray(value)){const existing=next.prepChecklist.split(/\r?\n/).map((item)=>item.trim()).filter(Boolean);next.prepChecklist=[...existing,...value.filter((item)=>!existing.includes(item))].join("\n");}
    else if(scope==="pinned_entities"&&Array.isArray(value)){for(const id of value){const option=initialPrep.options.entities.find((item)=>item.entity_id===id);if(option&&!nextPins.some((item)=>item.key===option.key))nextPins.push(option);}}
    else if(scope==="active_threads"&&Array.isArray(value)){for(const id of value){const option=initialPrep.options.threads.find((item)=>item.entity_id===id);if(option&&!nextThreads.some((item)=>item.entity_id===id))nextThreads.push(option);}}
    else {setMessage("This suggestion cannot be applied to Prep.");return false;}
    next.pinnedEntityKeys=nextPins.map((pin)=>pin.key);next.activeThreadIds=nextThreads.map((thread)=>thread.entity_id);valuesRef.current=next;pinsRef.current=nextPins;threadsRef.current=nextThreads;setValues(next);setPins(nextPins);setThreads(nextThreads);persistDraft(next);setSaveState("unsaved");
    if(!(await saveNow())){setMessage("The suggestion remains pending. Your merged local Prep draft is preserved.");return false;}
    return reviewPrepAi(request,"accepted",editedPayload);
  },[currentValues,initialPrep.options.entities,initialPrep.options.threads,persistDraft,reviewPrepAi,saveNow]);
  const quickStubs=useMemo(()=>pins.flatMap((pin)=>{const option=initialPrep.options.entities.find((item)=>item.key===pin.key);return option?.is_stub&&["character","place","faction","artifact","thread"].includes(option.entity_type)?[option]:[];}),[initialPrep.options.entities,pins]);
  const statusText=saveState==="saved"?"Saved":saveState==="unsaved"?"Unsaved changes":saveState==="recovered"?"Recovered local draft · not saved":saveState==="saving"?"Saving…":saveState==="offline"?"Offline · draft stored locally":saveState==="failed"?"Save failed · draft preserved":"Conflict · local draft preserved";

  return <section className={`session-prep-editor prep-${surface}`} aria-label={`${surface} Session Prep editor`}>
    <header className="prep-editor-head"><div><div className="page-eyebrow"><span className={`dot${ready?" amber":" dormant"}`}/>{ready?"Ready for Stage":"Prepare workspace"}</div>{surface==="full"&&<h1 className="page-title">{values.name}</h1>}<p className="page-sub">Session {initialPrep.session.session_number??"—"}{values.plannedStartAt?` · ${values.plannedStartAt.replace("T"," ")}`:" · Not scheduled"}</p></div><div className="page-actions"><div className={`autosave-indicator ${saveState}`} role="status" aria-live="polite">{locked?"Read-only · Session state locked":statusText}</div>{!locked&&<div className="prep-actions-wrap"><button className="btn btn-ghost btn-sm" type="button" aria-haspopup="menu" aria-expanded={menuOpen} onClick={()=>setMenuOpen((open)=>!open)}>Prep actions</button>{menuOpen&&<div className="prep-actions-menu" role="menu"><button role="menuitem" disabled={actionBusy} onClick={()=>void prepAction("reset")}>Reset prep</button><button role="menuitem" disabled={actionBusy} onClick={()=>void prepAction("duplicate")}>Duplicate as new planned</button><button role="menuitem" disabled={actionBusy} onClick={()=>void prepAction("archive")}>Archive session</button></div>}</div>}{surface==="inline"&&<Link className="btn btn-ghost btn-sm" href={`${root}/sessions/${initialPrep.session.id}/prep`}>Open full editor</Link>}</div></header>
    {locked&&<div className="prep-locked-banner"><RelicIcon name="alert" size={16}/>Prep is read-only while this Session is live, ended, archived, or otherwise locked.</div>}
    {initialPrep.prior_summary&&<aside className={`prior-session-summary ${initialPrep.prior_summary.state}`}><strong>Previously · {initialPrep.prior_summary.session_name??"First Session"}</strong><span>{initialPrep.prior_summary.text}</span></aside>}
    {message&&<div className="validation-warning" role="alert">{message}</div>}
    {!locked&&["offline","failed","recovered"].includes(saveState)&&<button className="btn btn-secondary btn-sm" type="button" onClick={()=>void saveNow()}>Retry save</button>}
    <div className="prep-editor-fields">
      <label className="field"><span>Session title</span><input aria-label="Session title" className="settings-field" value={values.name} disabled={locked} onChange={(e)=>update("name",e.target.value)} onBlur={()=>void saveNow()}/></label>
      <label className="field"><span>Scheduled date and time</span><input aria-label="Scheduled date and time" className="settings-field" type="datetime-local" value={values.plannedStartAt} disabled={locked} onChange={(e)=>update("plannedStartAt",e.target.value)} onBlur={()=>void saveNow()}/></label>
      <label className="field"><span>Objective</span><input aria-label="Objective" className="settings-field" value={values.objective} disabled={locked} onChange={(e)=>update("objective",e.target.value)} onBlur={()=>void saveNow()}/></label>
      <label className="field"><span>Opening scene</span><input aria-label="Opening scene" className="settings-field" value={values.openingScene} disabled={locked} onChange={(e)=>update("openingScene",e.target.value)} onBlur={()=>void saveNow()}/></label>
      <label className="field prep-wide"><span>Scene notes</span><textarea aria-label="Scene notes" className="settings-field" rows={surface==="full"?5:3} value={values.sceneNotes} disabled={locked} onChange={(e)=>update("sceneNotes",e.target.value)} onBlur={()=>void saveNow()}/></label>
      <label className="field prep-wide"><span>Prep checklist</span><textarea aria-label="Prep checklist" className="settings-field" rows={surface==="full"?5:3} value={values.prepChecklist} disabled={locked} onChange={(e)=>update("prepChecklist",e.target.value)} onBlur={()=>void saveNow()}/></label>
    </div>
    <div className="prep-pin-grid"><PinList title="Pinned entities" pins={pins} locked={locked} onRemove={(pin)=>removePin(pin,"entity")} onMove={(index,direction)=>setPins((current)=>move(current,index,direction))}/><PinList title="Thread carry-forward" pins={threads} locked={locked} onRemove={(pin)=>removePin(pin,"thread")} onMove={(index,direction)=>setThreads((current)=>move(current,index,direction))}/></div>
    {!locked&&<div className="prep-add-grid"><label className="field"><span>Add pinned record</span><select aria-label="Add pinned record" defaultValue="" onChange={(e)=>{const option=initialPrep.options.entities.find((pin)=>pin.key===e.target.value);if(option&&!pins.some((pin)=>pin.key===option.key))setPins((current)=>[...current,option]);e.target.value="";}}><option value="">Choose…</option>{initialPrep.options.entities.filter((option)=>!pins.some((pin)=>pin.key===option.key)&&option.state!=="archived").map((option)=><option key={option.key} value={option.key}>{option.name} · {option.entity_type}</option>)}</select></label><label className="field"><span>Add Thread</span><select aria-label="Add Thread" defaultValue="" onChange={(e)=>{const option=initialPrep.options.threads.find((pin)=>pin.entity_id===e.target.value);if(option&&!threads.some((pin)=>pin.entity_id===option.entity_id))setThreads((current)=>[...current,option]);e.target.value="";}}><option value="">Choose…</option>{initialPrep.options.threads.filter((option)=>!threads.some((pin)=>pin.entity_id===option.entity_id)&&option.state!=="archived").map((option)=><option key={option.key} value={option.entity_id}>{option.name}</option>)}</select></label></div>}
    {surface==="full"&&<SessionPrepAiPanel requests={initialAiRequests} locked={locked} activeThreads={threads} quickStubs={quickStubs} onStart={startPrepAi} onReview={reviewPrepAi} onAcceptPrep={acceptPrepAi}/>}
    <footer className="prep-cta"><button className="cta-stage" type="button" disabled={locked||saveState==="saving"} onClick={()=>void readyForStage()}>{ready?"Open in Stage":"Ready for Stage"}</button></footer>
  </section>;
}

function PinList({title,pins,locked,onRemove,onMove}:{title:string;pins:SessionPrepPin[];locked:boolean;onRemove:(pin:SessionPrepPin)=>void;onMove:(index:number,direction:-1|1)=>void}){
  return <section className="card prep-pin-list" aria-label={title}><div className="sec-label">{title}</div>{pins.length?<ol>{pins.map((pin,index)=><li key={pin.key} className={`prep-pin ${pin.state}`}><span>{pin.name}{pin.state!=="available"?` · ${pin.state.replace("_"," ")}`:""}</span>{!locked&&<span className="prep-pin-actions"><button type="button" aria-label={`Move ${pin.name} up`} disabled={index===0} onClick={()=>onMove(index,-1)}>↑</button><button type="button" aria-label={`Move ${pin.name} down`} disabled={index===pins.length-1} onClick={()=>onMove(index,1)}>↓</button><button type="button" aria-label={`Remove ${pin.name}`} onClick={()=>onRemove(pin)}>Remove</button></span>}</li>)}</ol>:<p className="inspector-empty">None selected.</p>}</section>;
}
