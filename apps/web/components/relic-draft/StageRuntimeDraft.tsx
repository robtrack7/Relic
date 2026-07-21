"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  quickCaptureAction,
  quickStubAction,
  markMomentAction,
  recordDicePoolAction,
  recordSessionConsentAction,
  setSessionStatusAction,
} from "@/app/actions";
import { RelicIcon, type IconName } from "@/components/RelicIcon";
import { hasSupabaseEnv } from "@/lib/env";
import { getStageAudioUploadQueue, stageAudioSessionKey, type StageAudioQueueSummary, type StageAudioScope } from "@/lib/stage-audio-queue";
import { parseGmNotesTags, formatStageElapsed, quickCreateEntityType, remainingUndoSeconds } from "@/lib/stage";
import { StageRecordingAdapter, type StageRecordingChunk } from "@/lib/stage-recording";
import { sagaPath } from "@/lib/routes";
import type { StagePacket } from "@/lib/data";
import type { EntitySummary, IdParams, SearchResult } from "@/lib/types";

type StageSession = {
  id: string;
  name: string;
  status: string;
  session_number?: number | null;
  objective?: string | null;
  opening_scene?: string | null;
  scene_notes?: string | null;
  consent_state?: string;
  started_at?: string | null;
  ended_pending_undo_at?: string | null;
};

type StageRuntimeDraftProps = {
  params: IdParams;
  saga: { name: string; game_system?: string | null };
  session: StageSession;
  packet?: StagePacket;
  pinned: Array<{ pin: { entity_type: string; entity_id: string }; entity?: EntitySummary | null }>;
  activeThreads: Array<EntitySummary | undefined>;
  results: SearchResult[];
  query: string;
};

type OverlayName = "record" | "note" | "dice" | "create" | "end" | "manage" | "loom" | null;
type ServerAction = (formData: FormData) => Promise<unknown>;

const diceTypes = [4, 6, 8, 10, 12, 20, 100] as const;
const createTypes: Array<{ key: string; label: string; icon: IconName; description: string }> = [
  { key: "npc", label: "NPC", icon: "users", description: "Character, ally or antagonist" },
  { key: "location", label: "Location", icon: "map", description: "Place, region or landmark" },
  { key: "item", label: "Item", icon: "bookmark", description: "Artifact, object or prop" },
  { key: "thread", label: "Thread", icon: "threads", description: "Plot thread or consequence" },
  { key: "note", label: "Note", icon: "file", description: "Freeform table annotation" },
  { key: "faction", label: "Faction", icon: "crown", description: "Organization or group" },
];

const rules = [
  { id: "advantage", category: "Core checks", title: "Advantage & disadvantage", body: "Roll two d20s. Keep the higher result for advantage or the lower for disadvantage." },
  { id: "difficulty", category: "Core checks", title: "Difficulty classes", body: "Easy 10 · Moderate 15 · Hard 20 · Very hard 25 · Nearly impossible 30." },
  { id: "cover", category: "Combat", title: "Cover", body: "Half cover grants +2 AC and Dexterity saves; three-quarters cover grants +5." },
  { id: "conditions", category: "Combat", title: "Common conditions", body: "Blinded, charmed, frightened, grappled, incapacitated, prone, restrained, stunned." },
  { id: "death", category: "Recovery", title: "Death saves", body: "Three successes stabilize. Three failures kill. A natural 20 restores 1 hit point." },
];

function Portrait({ entity, small = false }: { entity: EntitySummary; small?: boolean }) {
  return <span className={small ? "stage-v2-portrait small" : "stage-v2-portrait"}>{entity.name.replace(/^(the|a|an)\s+/i, "")[0] ?? "?"}</span>;
}

function StageDialog({ title, icon, tone, onClose, children, wide = false }: {
  title: string;
  icon: IconName;
  tone: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>("[data-stage-autofocus]")
      ?? panel?.querySelector<HTMLElement>("button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]");
    first?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
      if (event.key === "Tab" && panel) {
        const focusable = [...panel.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href]")];
        if (!focusable.length) return;
        const firstItem = focusable[0];
        const lastItem = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === firstItem) {
          event.preventDefault(); lastItem.focus();
        } else if (!event.shiftKey && document.activeElement === lastItem) {
          event.preventDefault(); firstItem.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus(); };
  }, []);

  return (
    <div className="stage-v2-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={panelRef} className={`stage-v2-dialog${wide ? " wide" : ""}`} role="dialog" aria-modal="true" aria-labelledby="stage-v2-dialog-title">
        <header className="stage-v2-dialog-head">
          <span className={`stage-v2-dialog-icon ${tone}`}><RelicIcon name={icon} size={16} /></span>
          <h2 id="stage-v2-dialog-title">{title}</h2>
          <button className="stage-v2-icon-button" type="button" onClick={onClose} aria-label={`Close ${title}`}><RelicIcon name="x" size={17} /></button>
        </header>
        {children}
      </div>
    </div>
  );
}

function GmScreen({ system, onClose }: { system: string; onClose: () => void }) {
  const panelRef = useRef<HTMLElement>(null);
  const [search, setSearch] = useState("");
  const [pinned, setPinned] = useState(["advantage", "death"]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const filtered = rules.filter((rule) => `${rule.category} ${rule.title} ${rule.body}`.toLowerCase().includes(search.toLowerCase()));
  const ordered = [...filtered].sort((a, b) => Number(pinned.includes(b.id)) - Number(pinned.includes(a.id)));
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.removeEventListener("keydown", closeOnEscape); previous?.focus(); };
  }, [onClose]);
  return (
    <aside ref={panelRef} className="stage-v2-gm-panel" aria-label="GM Screen">
      <header><RelicIcon name="library" size={18} /><div><strong>GM Screen</strong><span>Rules at the table — pin what you need.</span></div><em>{system}</em><button onClick={onClose} aria-label="Close GM Screen"><RelicIcon name="x" size={16} /></button></header>
      <label className="stage-v2-gm-search"><RelicIcon name="search" size={15} /><span className="sr-only">Search rules</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${system} rules…`} /></label>
      <div className="stage-v2-gm-body">
        {!ordered.length && <p className="stage-v2-empty">No rules match “{search}”.</p>}
        {ordered.map((rule) => {
          const isOpen = expanded.includes(rule.id);
          const isPinned = pinned.includes(rule.id);
          return <article className="stage-v2-rule" key={rule.id}>
            <button className="stage-v2-rule-main" onClick={() => setExpanded((items) => isOpen ? items.filter((id) => id !== rule.id) : [...items, rule.id])} aria-expanded={isOpen}>
              <span><small>{isPinned ? "Pinned · " : ""}{rule.category}</small>{rule.title}</span><RelicIcon name="chevronDown" size={15} />
            </button>
            {isOpen && <div className="stage-v2-rule-body"><p>{rule.body}</p><button onClick={() => setPinned((items) => isPinned ? items.filter((id) => id !== rule.id) : [rule.id, ...items])}><RelicIcon name={isPinned ? "x" : "pin"} size={12} />{isPinned ? "Unpin" : "Pin reference"}</button></div>}
          </article>;
        })}
      </div>
    </aside>
  );
}

function DiceTool({ packetRolls, busy, onRoll, onPin, onClose }: {
  packetRolls: NonNullable<StagePacket["dice_rolls"]>;
  busy: boolean;
  onRoll: (pool: number[], modifier: number, mode: string, label: string) => Promise<Record<string, unknown> | null>;
  onPin: (config: { pool: number[]; modifier: number; mode: string }) => void;
  onClose: () => void;
}) {
  const [pool, setPool] = useState<number[]>([]);
  const [modifier, setModifier] = useState(0);
  const [mode, setMode] = useState("normal");
  const [label, setLabel] = useState("");
  const [latest, setLatest] = useState<Record<string, unknown> | null>(null);
  const [localHistory, setLocalHistory] = useState<Array<Record<string, unknown>>>([]);
  const add = (sides: number) => setPool((items) => [...items, sides]);
  const remove = (sides: number) => setPool((items) => { const index = items.lastIndexOf(sides); return index < 0 ? items : [...items.slice(0, index), ...items.slice(index + 1)]; });
  const counts = diceTypes.map((sides) => ({ sides, count: pool.filter((die) => die === sides).length }));
  const history = [...localHistory, ...packetRolls.map((roll) => ({ expression: roll.expression, total: roll.result_total, label: roll.label }))];

  async function roll() {
    const result = await onRoll(pool, modifier, mode, label);
    if (result) { setLatest(result); setLocalHistory((items) => [result, ...items].slice(0, 20)); }
  }

  return <StageDialog title="Dice" icon="dice" tone="amber" onClose={onClose} wide>
    <div className="stage-v2-dialog-body dice-tool">
      <label className="stage-v2-field"><span>Roll label <small>optional</small></span><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Attack roll, perception, stealth…" data-stage-autofocus /></label>
      <div className="stage-v2-dice-picker">
        {counts.map(({ sides, count }) => <div className="stage-v2-die-slot" key={sides}><button className={count ? "selected" : ""} onClick={() => add(sides)}><RelicIcon name="dice" size={23} /><span>d{sides === 100 ? "%" : sides}</span></button>{count > 0 && <div><button onClick={() => remove(sides)} aria-label={`Remove d${sides}`}>−</button><span>{count}</span><button onClick={() => add(sides)} aria-label={`Add d${sides}`}>+</button></div>}</div>)}
      </div>
      {pool.includes(20) && <div className="stage-v2-segmented" role="group" aria-label="d20 roll mode">{[["normal", "Normal"], ["advantage", "↑ Advantage"], ["disadvantage", "↓ Disadvantage"]].map(([value, text]) => <button key={value} className={mode === value ? "active" : ""} onClick={() => setMode(value)}>{text}</button>)}</div>}
      <div className="stage-v2-pool-row"><div><small>Rolling</small><strong>{pool.length ? counts.filter((d) => d.count).map((d) => `${d.count}d${d.sides}`).join(" + ") : "Pick a die above"}</strong></div><label>Mod<input type="number" min={-99} max={99} value={modifier} onChange={(e) => setModifier(Number(e.target.value))} /></label>{pool.length > 0 && <button onClick={() => { setPool([]); setLatest(null); setMode("normal"); }}>Clear</button>}</div>
      <button className="stage-v2-roll-button" disabled={!pool.length || busy} onClick={roll}>{busy ? "Rolling…" : pool.length ? "Roll" : "Pick a die above"}</button>
      {latest && <div className="stage-v2-roll-result"><strong>{String(latest.total)}</strong><span>{String(latest.label || latest.expression)}</span><small>{Array.isArray(latest.rolls) ? latest.rolls.join(" · ") : ""}</small></div>}
      {history.length > 0 && <div className="stage-v2-history"><header><span>History</span><button onClick={() => setLocalHistory([])}>Clear local</button></header>{history.slice(0, 8).map((item, index) => <button key={`${String(item.expression)}-${index}`} onClick={() => { const match = /^(\d+)d(\d+)/.exec(String(item.expression)); if (match) setPool(Array.from({ length: Number(match[1]) }, () => Number(match[2]))); }}><span>{String(item.label || item.expression)}</span><strong>{String(item.total)}</strong><RelicIcon name="arrowRight" size={12} /></button>)}</div>}
    </div>
    <footer className="stage-v2-dialog-foot"><button className="stage-v2-secondary" disabled={!pool.length} onClick={() => onPin({ pool, modifier, mode })}><RelicIcon name="pin" size={13} />Pin to board</button><button className="stage-v2-primary" onClick={onClose}>Done</button></footer>
  </StageDialog>;
}

export function StageRuntimeDraft({ params, saga, session, packet, pinned, activeThreads, results, query }: StageRuntimeDraftProps) {
  const router = useRouter();
  const pathname = usePathname();
  const root = sagaPath(params);
  const searchRef = useRef<HTMLInputElement>(null);
  const recordingAdapter = useRef<StageRecordingAdapter | null>(null);
  const finalizing = useRef(false);
  const [status, setStatus] = useState(session.status);
  const [overlay, setOverlay] = useState<OverlayName>(null);
  const [loomOpen, setLoomOpen] = useState(true);
  const [loomMode, setLoomMode] = useState<"live" | "prep">("live");
  const [gmOpen, setGmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [recording, setRecording] = useState(false);
  const [recordingNote, setRecordingNote] = useState("");
  const [audioSummary, setAudioSummary] = useState<StageAudioQueueSummary>({ status: "idle", queued: 0, uploading: 0, failed: 0, totalChunks: 0, lastError: null });
  const [consent, setConsent] = useState(packet?.consent_state ?? session.consent_state ?? "unknown");
  const [now, setNow] = useState(Date.now());
  const [hiddenPins, setHiddenPins] = useState<string[]>([]);
  const initialPins = pinned.filter((item): item is { pin: { entity_type: string; entity_id: string }; entity: EntitySummary } => Boolean(item.entity));
  const visiblePinned = initialPins.filter(({ entity }) => !hiddenPins.includes(entity.id));
  const [selectedId, setSelectedId] = useState(initialPins[0]?.entity.id ?? "");
  const selectedEntity = visiblePinned.find(({ entity }) => entity.id === selectedId)?.entity ?? visiblePinned[0]?.entity;
  const threads = activeThreads.filter((thread): thread is EntitySummary => Boolean(thread));
  const live = status === "started" || status === "in_progress";
  const canWrite = live;
  const endedPending = status === "ended_pending_undo";
  const undoSeconds = endedPending ? remainingUndoSeconds(session.ended_pending_undo_at, now) : 60;
  const elapsed = formatStageElapsed(session.started_at, now);
  const sceneNotes = (session.scene_notes ?? "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const tags = selectedEntity ? parseGmNotesTags(selectedEntity.gm_notes) : null;
  const [pinnedDice, setPinnedDice] = useState<{ pool: number[]; modifier: number; mode: string } | null>(null);
  const [pinnedResult, setPinnedResult] = useState<Record<string, unknown> | null>(null);
  const audioScope: StageAudioScope = { workspaceId: params.workspaceId, worldId: params.worldId, sagaId: params.sagaId, sessionId: session.id };
  const audioSessionKey = stageAudioSessionKey(audioScope);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!hasSupabaseEnv() || typeof indexedDB === "undefined") return;
    const queue = getStageAudioUploadQueue();
    const update = (scope: StageAudioScope, summary: StageAudioQueueSummary) => {
      if (stageAudioSessionKey(scope) === audioSessionKey) setAudioSummary(summary);
    };
    const unsubscribe = queue.subscribe(update);
    void queue.prepareSession(audioScope)
      .then(() => queue.flushSession(audioScope))
      .then(setAudioSummary)
      .catch((caught) => setRecordingNote(caught instanceof Error ? caught.message : "Saved audio is waiting to retry."));
    return unsubscribe;
  // Scope identifiers are immutable for one Stage route.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioSessionKey]);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const queryList = window.matchMedia("(max-width: 1100px)");
    const sync = () => setLoomOpen(!queryList.matches);
    sync();
    queryList.addEventListener("change", sync);
    return () => queryList.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!endedPending || undoSeconds > 0 || finalizing.current) return;
    finalizing.current = true;
    void changeStatus("ended").then(() => router.push(`${root}/sessions/${session.id}/review`));
  // changeStatus is intentionally event-like; the countdown inputs are the lifecycle boundary.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endedPending, undoSeconds]);

  useEffect(() => () => { void recordingAdapter.current?.stop(); }, []);

  function formData(values: Record<string, string>) {
    const data = new FormData();
    data.set("workspaceId", params.workspaceId); data.set("worldId", params.worldId); data.set("sagaId", params.sagaId); data.set("sessionId", session.id);
    Object.entries(values).forEach(([key, value]) => data.set(key, value));
    return data;
  }

  async function perform(action: ServerAction, values: Record<string, string>): Promise<Record<string, unknown> | undefined | false> {
    setBusy(true); setError("");
    try { const result = await action(formData(values)); router.refresh(); return result as Record<string, unknown> | undefined; }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Stage action failed."); return false; }
    finally { setBusy(false); }
  }

  async function changeStatus(next: string) {
    const result = await perform(setSessionStatusAction, { status: next });
    if (result !== false) setStatus(next);
  }

  async function beginSession() {
    if (status === "ready") await changeStatus("started");
    else if (status === "started") await changeStatus("in_progress");
  }

  async function saveNote(payload: { title: string; body: string; tag: string }) {
    const prefix = `[${payload.tag}]${payload.title ? ` ${payload.title}` : ""}`;
    const result = await perform(quickCaptureAction, { body: `${prefix}\n${payload.body}` });
    if (result !== false) { setNotice("Note saved to this scene."); setOverlay(null); }
  }

  async function markMoment(label: string) {
    if (!recording) return;
    const result = await perform(markMomentAction, { label });
    if (result !== false) {
      setNotice(`Marked · ${elapsed}.`);
      setOverlay(null);
    }
  }

  async function createQuick(type: string, name: string, summary: string) {
    const entityType = quickCreateEntityType(type);
    if (!entityType) return;
    const result = entityType === "note"
      ? await perform(quickCaptureAction, { title: name, body: summary || name })
      : await perform(quickStubAction, { entityType, name, summary });
    if (result !== false) {
      setNotice(entityType === "note" ? "Note saved to Library." : `${createTypes.find((item) => item.key === type)?.label} created as a GM-authored stub.`);
      setOverlay(null);
    }
  }

  async function rollPool(pool: number[], modifier: number, mode: string, label: string) {
    const result = await perform(recordDicePoolAction, { pool: JSON.stringify(pool), modifier: String(modifier), mode, label });
    return result === false ? null : result ?? null;
  }

  async function saveRecordingChunk(chunk: StageRecordingChunk) {
    const queue = getStageAudioUploadQueue();
    await queue.enqueueChunk(audioScope, chunk.blob, chunk.mimeType, chunk.durationMs, chunk.recordedAt);
    void queue.flushSession(audioScope).then(setAudioSummary);
  }

  async function setRecordingConsent(granted: boolean) {
    const result = await perform(recordSessionConsentAction, { granted: String(granted) });
    if (result === false) return false;
    setConsent(granted ? "granted" : "denied");
    if (!granted) setRecordingNote("Recording disabled for this session. Existing notes and Mark Moment remain unchanged.");
    return true;
  }

  async function toggleRecording(consentConfirmed = false) {
    if (recording) {
      const capture = await recordingAdapter.current?.stop();
      setRecording(false);
      setRecordingNote(capture?.chunkCount ? `Recording stopped · ${capture.chunkCount} chunks saved locally or uploaded.` : "Recording stopped.");
      setOverlay(null);
      return;
    }
    if (consent !== "granted" && !consentConfirmed) return;
    try {
      const queue = getStageAudioUploadQueue();
      await queue.prepareSession(audioScope);
      recordingAdapter.current ??= new StageRecordingAdapter();
      await recordingAdapter.current.start(saveRecordingChunk);
      if (status === "started") await changeStatus("in_progress");
      setRecording(true); setRecordingNote(""); setOverlay(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Microphone access failed.");
    }
  }

  async function endSession() {
    let stoppedChunkCount = 0;
    if (recording) {
      const capture = await recordingAdapter.current?.stop();
      stoppedChunkCount = capture?.chunkCount ?? 0;
      setRecording(false);
    }
    if (audioSummary.totalChunks > 0 || stoppedChunkCount > 0) {
      setAudioSummary(await getStageAudioUploadQueue().requestFinalization(audioScope));
    }
    await changeStatus("ended_pending_undo");
    setOverlay(null);
    setNow(Date.now());
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = searchRef.current?.value.trim() ?? "";
    router.push(value ? `${pathname}?q=${encodeURIComponent(value)}` : pathname);
  }

  const relatedPlaces = visiblePinned.filter(({ entity }) => entity.entityType === "place").map(({ entity }) => entity);
  const relatedNpcs = visiblePinned.filter(({ entity }) => entity.entityType === "character" && entity.id !== selectedEntity?.id).map(({ entity }) => entity);
  const pendingAudio = audioSummary.queued + audioSummary.uploading + audioSummary.failed;
  const audioStateLabel = audioSummary.status === "idle"
    ? "Synced"
    : audioSummary.status === "recovered"
      ? "Recovered"
      : audioSummary.status === "uploading"
        ? `Uploading · ${pendingAudio}`
        : audioSummary.status === "failed"
          ? `Failed · ${audioSummary.failed}`
          : `Queued · ${pendingAudio}`;

  return <div className="stage-runtime stage-v2-shell">
    <header className="stage-v2-session-bar">
      <div className="stage-v2-session-left"><div className="stage-v2-labels"><span>The Stage</span><span>Session {session.session_number ?? (session.name.replace(/\D+/g, "") || "—")}</span></div><div className="stage-v2-chips"><span className={live ? "live" : "ready"}><i />{status === "in_progress" ? "Live" : status === "started" ? "Started" : status === "ended_pending_undo" ? "Ending" : "Ready"}</span>{live && <span className={recording ? "recording active" : "recording"}><i />{recording ? "Recording" : "Not recording"}</span>}<span className={audioSummary.status}><RelicIcon name={audioSummary.status === "failed" ? "alert" : audioSummary.status === "idle" || audioSummary.status === "recovered" ? "check" : "clock"} size={11} />{audioStateLabel}</span></div></div>
      <div className="stage-v2-session-right">{live && <div className="stage-v2-elapsed"><RelicIcon name="clock" size={14} /><strong>{elapsed}</strong><span>elapsed</span></div>}{(status === "ready" || status === "started") && <button className="stage-v2-start" disabled={busy} onClick={beginSession}>{status === "ready" ? "Start Session" : "Go live"}</button>}<button className="stage-v2-mobile-loom" onClick={() => setOverlay("loom")}><RelicIcon name="spark" size={14} />Loom</button><Link className="stage-v2-sanctum" href={root}><RelicIcon name="chevronRight" size={13} />To Sanctum</Link><Link className="stage-v2-profile" href={`${root}/settings`} aria-label="GM profile"><RelicIcon name="profile" size={22} /></Link></div>
    </header>

    <div className="stage-v2-body">
      <main className="stage-v2-main">
        <div className="stage-v2-scroll">
          <h1 className="stage-v2-title">{session.name}</h1>
          <section className="stage-v2-card stage-v2-agenda" aria-label="Agenda"><header><RelicIcon name="file" size={16} /><span>Agenda</span><RelicIcon name="chevronDown" size={16} /></header><div className="stage-v2-agenda-grid"><article><h2><RelicIcon name="target" size={17} />Objective</h2><p>{session.objective || "No objective has been prepared."}</p></article><article><h2><RelicIcon name="bookmark" size={17} />Opening Scene</h2><p>{session.opening_scene || "No opening scene has been prepared."}</p></article><article><h2><RelicIcon name="file" size={17} />Scene Notes ({sceneNotes.length})</h2>{sceneNotes.length ? <ul>{sceneNotes.map((note) => <li key={note}>{note}</li>)}</ul> : <p>No scene notes yet.</p>}</article></div></section>
          <form className="stage-v2-search" role="search" onSubmit={submitSearch}><RelicIcon name="search" size={17} /><label className="sr-only" htmlFor="stage-saga-search">Search saga during play</label><input ref={searchRef} id="stage-saga-search" type="search" defaultValue={query} placeholder="Search saga…" onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); const value = event.currentTarget.value.trim(); router.push(value ? `${pathname}?q=${encodeURIComponent(value)}` : pathname); } else if (event.key === "Escape") { event.currentTarget.value = ""; router.push(pathname); } }} /><kbd>⌘ K</kbd></form>
          {query && <section className="stage-v2-search-results" aria-label="Saga search results"><header>Search results <span>{results.length}</span></header>{results.length ? results.slice(0, 8).map((result) => <button key={`${result.source_kind}-${result.source_entity_id}`} onClick={() => { if (visiblePinned.some(({ entity }) => entity.id === result.source_entity_id)) setSelectedId(result.source_entity_id); }}><span>{result.source_entity_type ?? result.source_kind}</span><p>{result.snippet}</p></button>) : <p>No canon results. Adjust the search or create a quick stub.</p>}</section>}
          <section className="stage-v2-card stage-v2-pinned" aria-label="Pinned entities"><header><span><RelicIcon name="pin" size={15} />Pinned Entities</span><button onClick={() => setOverlay("manage")}><RelicIcon name="settings" size={14} />Manage</button></header>{visiblePinned.length ? <div className="stage-v2-pinned-grid">{visiblePinned.map(({ entity }) => <button key={entity.id} className={selectedEntity?.id === entity.id ? "selected" : ""} onClick={() => setSelectedId(entity.id)}><Portrait entity={entity} small /><span><strong>{entity.name}</strong><small>{entity.entityType} · {entity.status || (entity.is_stub ? "Stub" : "Canon")}</small><em><i />{entity.status || "Active"}</em></span></button>)}</div> : <p className="stage-v2-empty">No pinned entities. Use Manage to restore this board or return to Prepare to pin canon.</p>}</section>
          {selectedEntity ? <section className="stage-v2-card stage-v2-entity"><div className="stage-v2-entity-art"><Portrait entity={selectedEntity} /></div><div className="stage-v2-entity-summary"><h2>{selectedEntity.name}<RelicIcon name="pin" size={16} /></h2><small>{selectedEntity.entityType} · {selectedEntity.status || "Canon"}</small>{selectedEntity.narrative && <blockquote>“{selectedEntity.narrative}”</blockquote>}<h3>Summary</h3><p>{selectedEntity.summary || "No summary recorded."}</p></div><div className="stage-v2-entity-notes"><h3>Wants / Voice</h3>{tags?.wants && <p><strong>Wants:</strong> {tags.wants}</p>}{tags?.voice && <p><strong>Voice:</strong> {tags.voice}</p>}{!tags?.wants && !tags?.voice && <p>No structured wants or voice notes.</p>}<h3>GM Notes</h3><p>{tags?.body || "No GM notes recorded."}</p></div><div className="stage-v2-entity-links"><h3>Links</h3>{threads.map((thread) => <span key={thread.id}><RelicIcon name="threads" size={14} />{thread.name}</span>)}<h3>Places</h3>{relatedPlaces.map((place) => <span key={place.id}><RelicIcon name="map" size={14} />{place.name}</span>)}<h3>Related NPCs</h3>{relatedNpcs.map((npc) => <span key={npc.id}><RelicIcon name="users" size={14} />{npc.name}</span>)}<Link href={`${root}/entities/${selectedEntity.entityType}/${selectedEntity.id}`}>Open in Library <RelicIcon name="arrowRight" size={12} /></Link></div></section> : <section className="stage-v2-card stage-v2-empty-card">Pin entities in Prepare to see their live detail here.</section>}
        </div>

        {gmOpen ? <div className="stage-v2-gm-overlay"><button className="stage-v2-gm-scrim" aria-label="Close GM Screen" onClick={() => setGmOpen(false)} /><GmScreen system={saga.game_system || "Game system"} onClose={() => setGmOpen(false)} /></div> : <button className="stage-v2-gm-edge" onClick={() => setGmOpen(true)}><RelicIcon name="library" size={18} /><span>GM Screen</span></button>}

        {pinnedDice && <aside className="stage-v2-pinned-dice" aria-label="Pinned dice widget"><header><span><RelicIcon name="dice" size={13} />Dice</span><button onClick={() => setPinnedDice(null)} aria-label="Unpin dice"><RelicIcon name="pin" size={12} /></button></header><div>{diceTypes.map((sides) => <button key={sides} className={pinnedDice.pool.includes(sides) ? "active" : ""} onClick={() => setPinnedDice((config) => config ? { ...config, pool: config.pool.includes(sides) ? config.pool.filter((die) => die !== sides) : [...config.pool, sides] } : null)}>d{sides === 100 ? "%" : sides}</button>)}</div><label>Mod<input type="number" value={pinnedDice.modifier} onChange={(e) => setPinnedDice({ ...pinnedDice, modifier: Number(e.target.value) })} /></label><button disabled={busy || !pinnedDice.pool.length} onClick={async () => setPinnedResult(await rollPool(pinnedDice.pool, pinnedDice.modifier, pinnedDice.mode, "Pinned roll"))}>Roll</button>{pinnedResult && <strong>{String(pinnedResult.total)}</strong>}</aside>}

        {endedPending && <div className="stage-v2-undo" role="status"><strong>{undoSeconds}</strong><div><span>Session ended</span><p>Undo is available for {undoSeconds} seconds. Then this session enters the review pipeline.</p></div><button disabled={busy} onClick={() => { finalizing.current = false; void changeStatus("in_progress"); }}>Undo</button></div>}

        <nav className="stage-v2-actions" aria-label="Stage actions">{[
          { key: "record", label: recording ? "Recording" : "Record", icon: recording ? "mic" : "micOff", tone: "rust" },
          { key: "note", label: "Note", icon: "file", tone: "amber" },
          { key: "dice", label: "Dice", icon: "dice", tone: "stone" },
          { key: "create", label: "Create", icon: "plus", tone: "verdigris" },
          { key: "end", label: "End Session", icon: "export", tone: "rust" },
        ].map((item) => <button key={item.key} className={item.tone} disabled={!canWrite || busy || endedPending} onClick={() => setOverlay(item.key as OverlayName)}><RelicIcon name={item.icon as IconName} size={18} />{item.label}</button>)}</nav>
      </main>

      <aside className={`stage-v2-loom${loomOpen ? " open" : " collapsed"}`} aria-label="The Loom"><button className="stage-v2-loom-tab" onClick={() => setLoomOpen((value) => !value)} aria-label={loomOpen ? "Collapse The Loom" : "Open The Loom"}><RelicIcon name={loomOpen ? "chevronRight" : "chevronDown"} size={15} /></button>{loomOpen ? <><header><RelicIcon name="spark" size={20} /><div><strong>The Loom</strong><span>Your AI partner for live story support.</span></div></header><div className="stage-v2-loom-modes"><button className={loomMode === "prep" ? "active" : ""} onClick={() => setLoomMode("prep")}>Prep Mode</button><button className={loomMode === "live" ? "active" : ""} onClick={() => setLoomMode("live")}>Live Mode</button></div><div className="stage-v2-loom-body">{loomMode === "live" ? <><section><h2>Recent Context</h2><p><RelicIcon name="file" size={15} />{packet?.quick_captures?.length ?? 0} scene captures</p><p><RelicIcon name="threads" size={15} />{threads.length} active threads</p></section><section><h2>Recent Dice</h2>{(packet?.dice_rolls ?? []).slice(0, 4).map((roll) => <p key={roll.id}><RelicIcon name="dice" size={15} />{roll.label ? `${roll.label} · ` : ""}{roll.expression} = {roll.result_total}</p>)}</section></> : <><section><h2>Continuity Alerts</h2>{threads.length ? threads.map((thread) => <p key={thread.id}><RelicIcon name="alert" size={15} />{thread.name}</p>) : <p>No active threads are pinned to this session.</p>}</section><section><h2>Prep Suggestion</h2><p>Keep the objective and opening scene visible; capture deviations as scene notes.</p></section></>}</div><footer><p>Relic can make mistakes. Verify important details.</p></footer></> : <div className="stage-v2-loom-rail"><RelicIcon name="spark" size={20} /><span>The Loom</span></div>}</aside>
    </div>

    {notice && <div className="stage-v2-toast" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss"><RelicIcon name="x" size={13} /></button></div>}
    {(error || recordingNote) && <div className={`stage-v2-banner ${error ? "error" : "info"}`} role="alert">{error || recordingNote}<button onClick={() => { setError(""); setRecordingNote(""); }} aria-label="Dismiss"><RelicIcon name="x" size={13} /></button></div>}

    {overlay === "record" && <StageDialog title="Recording" icon="mic" tone="rust" onClose={() => setOverlay(null)}><div className="stage-v2-dialog-body stage-v2-record"><div className={recording ? "stage-v2-record-ring active" : "stage-v2-record-ring"}><RelicIcon name={recording ? "mic" : "micOff"} size={31} /></div><div><h3>{recording ? "Recording in progress" : consent === "unknown" || consent === "unset" ? "Players consented to recording?" : consent === "denied" ? "Recording disabled" : "Ready to record"}</h3><p>{session.name} · Consent {consent}</p></div><p className="stage-v2-record-note">Completed chunks are saved locally before upload. Queued or failed audio stays on this device and retries on reconnect.</p>{(consent === "unknown" || consent === "unset") ? <div className="stage-v2-consent-actions"><button className="stage-v2-secondary" disabled={busy} onClick={() => void setRecordingConsent(false)}>No</button><button className="stage-v2-primary" disabled={busy} onClick={async () => { if (await setRecordingConsent(true)) await toggleRecording(true); }}>Yes, start recording</button></div> : consent === "denied" ? <button className="stage-v2-secondary" disabled={busy} onClick={() => void setRecordingConsent(true)}>Players now consent</button> : <button className={recording ? "stage-v2-danger" : "stage-v2-primary"} disabled={busy} onClick={() => void toggleRecording()}>{recording ? "Stop Recording" : "Start Recording"}</button>}{pendingAudio > 0 && <div className={`stage-v2-upload-state ${audioSummary.status}`}><strong>{audioStateLabel}</strong><span>{audioSummary.lastError || "Audio is preserved until upload and registration complete."}</span>{audioSummary.status === "failed" && <button className="stage-v2-secondary" onClick={() => void getStageAudioUploadQueue().flushSession(audioScope, true).then(setAudioSummary)}>Retry upload</button>}</div>}</div></StageDialog>}
    {overlay === "note" && <QuickNote busy={busy} scene={session.name} recording={recording} onClose={() => setOverlay(null)} onSave={saveNote} onMark={markMoment} />}
    {overlay === "dice" && <DiceTool packetRolls={packet?.dice_rolls ?? []} busy={busy} onRoll={rollPool} onPin={(config) => { setPinnedDice(config); setOverlay(null); }} onClose={() => setOverlay(null)} />}
    {overlay === "create" && <QuickCreate busy={busy} onClose={() => setOverlay(null)} onCreate={createQuick} />}
    {overlay === "end" && <EndSession busy={busy} elapsed={elapsed} sceneCount={sceneNotes.length} onClose={() => setOverlay(null)} onConfirm={endSession} />}
    {overlay === "manage" && <StageDialog title="Manage Pinned Entities" icon="pin" tone="amber" onClose={() => setOverlay(null)}><div className="stage-v2-dialog-body stage-v2-manage"><p>Choose what stays on this live board. Prep remains the source of the saved pin set.</p>{initialPins.map(({ entity }) => <label key={entity.id}><input type="checkbox" checked={!hiddenPins.includes(entity.id)} onChange={(e) => setHiddenPins((items) => e.target.checked ? items.filter((id) => id !== entity.id) : [...items, entity.id])} /><Portrait entity={entity} small /><span>{entity.name}<small>{entity.entityType}</small></span></label>)}</div><footer className="stage-v2-dialog-foot"><button className="stage-v2-secondary" onClick={() => setHiddenPins([])}>Restore all</button><button className="stage-v2-primary" onClick={() => setOverlay(null)}>Done</button></footer></StageDialog>}
    {overlay === "loom" && <StageDialog title="The Loom" icon="spark" tone="amber" onClose={() => setOverlay(null)}><div className="stage-v2-dialog-body stage-v2-mobile-loom-body"><div className="stage-v2-segmented"><button className={loomMode === "live" ? "active" : ""} onClick={() => setLoomMode("live")}>Live Mode</button><button className={loomMode === "prep" ? "active" : ""} onClick={() => setLoomMode("prep")}>Prep Mode</button></div><h3>{loomMode === "live" ? "Recent Context" : "Continuity Alerts"}</h3><p>{threads.length} active threads · {visiblePinned.length} pinned records · Consent {consent}</p></div></StageDialog>}
  </div>;
}

export function QuickNote({ scene, busy, recording, onClose, onSave, onMark }: { scene: string; busy: boolean; recording: boolean; onClose: () => void; onSave: (payload: { title: string; body: string; tag: string }) => Promise<void>; onMark: (label: string) => Promise<void> }) {
  const [title, setTitle] = useState(""); const [body, setBody] = useState(""); const [tag, setTag] = useState("Scene"); const [markLabel, setMarkLabel] = useState(""); const [touched, setTouched] = useState(false);
  return <StageDialog title="Quick Note" icon="file" tone="amber" onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); setTouched(true); if (body.trim()) void onSave({ title: title.trim(), body: body.trim(), tag }); }}><div className="stage-v2-dialog-body"><section className="stage-v2-mark-moment" aria-label="Mark Moment"><div><strong>Mark Moment</strong><span>{recording ? "Save a timestamp for post-session review." : "Available while recording."}</span></div><label className="stage-v2-field"><span className="sr-only">Moment label</span><input value={markLabel} onChange={(event) => setMarkLabel(event.target.value)} placeholder="decision, lie, secret…" disabled={!recording || busy} /></label><button type="button" className="stage-v2-secondary" disabled={!recording || busy} onClick={() => void onMark(markLabel.trim())}><RelicIcon name="bookmark" size={13} />Mark moment</button></section><label className="stage-v2-field"><span>Title <small>optional</small></span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A short memory hook" data-stage-autofocus /></label><label className="stage-v2-field"><span>Note</span><textarea value={body} onChange={(e) => setBody(e.target.value)} onBlur={() => setTouched(true)} rows={5} placeholder="What happened? What do you want to remember?" aria-invalid={touched && !body.trim()} />{touched && !body.trim() && <em>Write a note before saving.</em>}</label><div className="stage-v2-note-tags" aria-label="Note tag">{["Scene", "NPC", "Lore", "Reminder", "Thread"].map((value) => <button type="button" key={value} className={tag === value ? "active" : ""} onClick={() => setTag(value)}>{value}</button>)}</div></div><footer className="stage-v2-dialog-foot"><span><RelicIcon name="bookmark" size={12} />{scene}</span><button className="stage-v2-primary" disabled={!body.trim() || busy}>Save Note</button></footer></form></StageDialog>;
}

function QuickCreate({ busy, onClose, onCreate }: { busy: boolean; onClose: () => void; onCreate: (type: string, name: string, summary: string) => Promise<void> }) {
  const [type, setType] = useState(""); const [name, setName] = useState(""); const [summary, setSummary] = useState(""); const selected = createTypes.find((item) => item.key === type);
  return <StageDialog title="Create" icon="plus" tone="verdigris" onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); if (type && name.trim()) void onCreate(type, name.trim(), summary.trim()); }}><div className="stage-v2-dialog-body"><div className="stage-v2-create-grid">{createTypes.map((item) => <button type="button" key={item.key} className={type === item.key ? "active" : ""} onClick={() => setType(item.key)}><RelicIcon name={item.icon} size={19} /><strong>{item.label}</strong><span>{item.description}</span></button>)}</div>{selected && <div className="stage-v2-create-fields"><label className="stage-v2-field"><span>Name</span><input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={`Name this ${selected.label.toLowerCase()}…`} /></label><label className="stage-v2-field"><span>Short note <small>optional</small></span><textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What matters at the table?" /></label></div>}</div><footer className="stage-v2-dialog-foot"><button type="button" className="stage-v2-secondary" onClick={onClose}>Cancel</button><button className="stage-v2-primary" disabled={!type || !name.trim() || busy}>Create {selected?.label ?? "record"}</button></footer></form></StageDialog>;
}

function EndSession({ busy, elapsed, sceneCount, onClose, onConfirm }: { busy: boolean; elapsed: string; sceneCount: number; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [step, setStep] = useState(0);
  return <StageDialog title="End Session" icon="export" tone="rust" onClose={onClose}><div className="stage-v2-dialog-body stage-v2-end"><div className="stage-v2-end-stats"><span><strong>{elapsed}</strong>Duration</span><span><strong>{sceneCount}</strong>Scene notes</span></div>{step === 0 ? <><p>Ending stops recording, saves notes and timestamps, and opens a 60-second undo window before review begins.</p><div className="stage-v2-dialog-foot"><button className="stage-v2-secondary" onClick={onClose}>Cancel</button><button className="stage-v2-danger" onClick={() => setStep(1)}>End Session</button></div></> : <><p className="confirm">Are you sure? You will have 60 seconds to undo before the review pipeline starts.</p><div className="stage-v2-dialog-foot"><button className="stage-v2-secondary" onClick={() => setStep(0)}>Go back</button><button className="stage-v2-danger solid" disabled={busy} onClick={() => void onConfirm()}>Yes, end session</button></div></>}</div></StageDialog>;
}
