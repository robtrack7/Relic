import { randomUUID } from "node:crypto";
import {
  deleteSagaAction,
  renameSagaAction,
  signOutAction,
  updateGmProfileSettingsAction,
  updateNotificationPreferencesAction,
  updateSagaOperationalSettingsAction,
  updateSagaRetentionSettingsAction
} from "@/app/actions";
import { HiddenContextFields } from "@/components/HiddenContextFields";
import { RelicIcon } from "@/components/RelicIcon";
import { SanctumShell } from "@/components/SanctumShell";
import { getNotificationDeliverySummary, getSettingsControlPlane, requireSagaContext } from "@/lib/data";
import { sagaPath } from "@/lib/routes";
import type { IdParams } from "@/lib/types";

type UsageMeter = { limit_key?: string; used?: number | string; limit?: number | string; remaining?: number | string; severity?: string; reset_at?: string };

function usageMeters(usage: unknown): UsageMeter[] {
  if (!usage || typeof usage !== "object") return [];
  const meters = (usage as { meters?: unknown }).meters;
  return Array.isArray(meters) ? meters as UsageMeter[] : [];
}

function usageReset(usage: unknown) {
  if (!usage || typeof usage !== "object") return null;
  const reset = (usage as { reset_at?: unknown }).reset_at;
  return typeof reset === "string" ? reset : null;
}

function usageLabel(key?: string) {
  return ({ ai_credits_monthly: "AI credits", transcription_seconds_monthly: "Transcription minutes", storage_bytes: "Storage", imports_monthly: "Imports", exports_monthly: "Exports" } as Record<string, string>)[key ?? ""] ?? key ?? "Usage";
}

function meterValue(key: string | undefined, value: number) {
  if (key === "transcription_seconds_monthly") return `${Math.round(value / 60)}m`;
  if (key === "storage_bytes") return `${Math.round(value / 1024 / 1024)} MB`;
  return String(Math.round(value));
}

function meterPercent(meter: UsageMeter) {
  const used = Number(meter.used ?? 0); const limit = Number(meter.limit ?? 0);
  if (!Number.isFinite(used) || !Number.isFinite(limit) || limit <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((used / limit) * 100)));
}

function pref(preferences: Record<string, unknown>, channel: "email" | "push", kind: string) {
  const group = preferences[channel];
  return Boolean(group && typeof group === "object" && (group as Record<string, unknown>)[kind]);
}

const experienceOptions = [["new", "New GM"], ["returning", "Returning GM"], ["experienced", "Experienced GM"], ["veteran", "Veteran GM"]] as const;
const improvOptions = [["planner", "Plan-first"], ["mixed", "Mixed"], ["improv_first", "Improv-first"]] as const;
const prepOptions = [["heavy", "Detailed prep"], ["mixed", "Mixed prep"], ["light", "Light prep"]] as const;

function ProfileFields({ profile }: { profile: Record<string, unknown> }) {
  return <div className="settings-inline-action settings-profile-fields">
    <label className="field"><span>Experience</span><select className="settings-field" name="experienceLevel" defaultValue={String(profile.experience_level ?? "returning")}>{experienceOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="field"><span>Improv style</span><select className="settings-field" name="improvComfort" defaultValue={String(profile.improv_comfort ?? "mixed")}>{improvOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    <label className="field"><span>Prep style</span><select className="settings-field" name="prepStyle" defaultValue={String(profile.prep_style ?? "mixed")}>{prepOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
  </div>;
}

export default async function SettingsPage({ params, searchParams }: { params: Promise<IdParams>; searchParams: Promise<{ lifecycleNotice?: string; lifecycleError?: string; settingsNotice?: string; settingsError?: string; from?: string }> }) {
  const ids = await params; const query = await searchParams;
  const [{ workspace, world, saga }, settings, deliveries] = await Promise.all([requireSagaContext(ids), getSettingsControlPlane(ids), getNotificationDeliverySummary(ids)]);
  const root = sagaPath(ids); const meters = usageMeters(settings.usage); const resetAt = usageReset(settings.usage);
  const profile = settings.gm_profile; const override = settings.saga.gm_profile_override; const effectiveOverride = override ?? profile;
  const preferences = profile.notification_preferences ?? {}; const recent = settings.recent_changes ?? [];

  return <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="settings">
    <div className="page-head"><div><div className="page-eyebrow"><RelicIcon name="settings" size={12} /> Settings</div><div className="page-title">Trust & control</div><div className="page-sub">Deterministic controls for {saga.name}. The Loom may explain these settings, but only you can change them.</div></div></div>
    {query.lifecycleNotice === "renamed" ? <p className="notice">Saga renamed.</p> : null}
    {query.settingsNotice ? <p className="notice">{query.settingsNotice}</p> : null}
    {query.lifecycleError || query.settingsError ? <p className="danger-note">{query.lifecycleError ?? query.settingsError}</p> : null}
    {query.from === "loom" ? <div className="card settings-content-card" style={{ marginBottom: 12 }}><strong>Your Loom turn is preserved.</strong><p className="setting-desc">Review the Workspace limit below, then return to the same conversation or continue with Search and manual editing. Opening Settings did not retry or spend credits.</p><a className="btn btn-ghost btn-sm" href={`${root}/guide`}>Return to The Loom</a></div> : null}

    <div className="settings-layout">
      <nav className="card settings-nav-card" aria-label="Settings sections">
        <a className="settings-nav-item active" href="#saga">Saga</a><a className="settings-nav-item" href="#profile">GM profile</a><a className="settings-nav-item" href="#retention">Retention</a><div className="settings-nav-sep" />
        <a className="settings-nav-item" href="#usage">Usage</a><a className="settings-nav-item" href="#notifications">Notifications</a><a className="settings-nav-item" href="#export">Export</a><a className="settings-nav-item" href="#account">Account</a><div className="settings-nav-sep" /><a className="settings-nav-item" style={{ color: "var(--rust)" }} href="#danger">Danger zone</a>
      </nav>
      <div>
        <section id="saga" className="card settings-content-card" style={{ marginBottom: 12 }}>
          <div className="sec-label"><RelicIcon name="sessions" size={11} /> Saga · {world.name}</div>
          <form className="setting-row" action={renameSagaAction}><HiddenContextFields params={ids} /><div className="setting-label-col"><div className="setting-label">Name</div><div className="setting-desc">Used throughout Sanctum, Stage, and exports.</div></div><div className="settings-inline-action"><input className="settings-field" name="sagaName" defaultValue={saga.name} required maxLength={120} /><button className="btn btn-secondary btn-sm" type="submit">Rename</button></div></form>
          <form action={updateSagaOperationalSettingsAction}>
            <HiddenContextFields params={ids} /><input type="hidden" name="expectedUpdatedAt" value={settings.saga.updated_at} /><input type="hidden" name="idempotencyKey" value={`settings:saga:${randomUUID()}`} />
            <div className="setting-row"><div className="setting-label-col"><div className="setting-label">Game system</div><div className="setting-desc">Free text used by prep and Loom task context.</div></div><input className="settings-field" name="gameSystem" defaultValue={settings.saga.game_system ?? ""} maxLength={120} /></div>
            <div className="setting-row"><div className="setting-label-col"><div className="setting-label">Saga GM profile</div><div className="setting-desc">Use your default or keep a Saga-only override.</div></div><select className="settings-field" name="profileMode" defaultValue={override ? "override" : "default"}><option value="default">Use my default</option><option value="override">Override for this Saga</option></select></div>
            <ProfileFields profile={effectiveOverride as Record<string, unknown>} />
            <button className="btn btn-secondary btn-sm" type="submit">Save Saga settings</button>
          </form>
        </section>

        <section id="profile" className="card settings-content-card" style={{ marginBottom: 12 }}>
          <div className="sec-label">Default GM profile</div><p className="setting-desc">Used for new Sagas and any Saga without an override.</p>
          <form action={updateGmProfileSettingsAction}><HiddenContextFields params={ids} /><input type="hidden" name="expectedUpdatedAt" value={profile.updated_at} /><input type="hidden" name="idempotencyKey" value={`settings:profile:${randomUUID()}`} /><ProfileFields profile={profile as Record<string, unknown>} /><label className="field"><span>Default game system</span><input className="settings-field" name="defaultGameSystem" defaultValue={profile.default_game_system ?? ""} maxLength={120} /></label><button className="btn btn-secondary btn-sm" type="submit">Save default profile</button></form>
        </section>

        <section id="retention" className="card settings-content-card" style={{ marginBottom: 12 }}>
          <div className="sec-label">Retention · {saga.name}</div><p className="setting-desc">Changes apply to future completed processing. Already-deleted audio or transcript text cannot be restored. Failed transcription audio remains available for recovery.</p>
          <form action={updateSagaRetentionSettingsAction}><HiddenContextFields params={ids} /><input type="hidden" name="expectedUpdatedAt" value={settings.saga.updated_at} /><input type="hidden" name="idempotencyKey" value={`settings:retention:${randomUUID()}`} />
            <div className="setting-row"><div className="setting-label-col"><div className="setting-label">Audio</div><div className="setting-desc">Delete only after successful transcription, or retain until Saga deletion.</div></div><select className="settings-field" name="audioRetention" defaultValue={settings.saga.audio_retention}><option value="delete_after_transcription">Delete after transcription</option><option value="retain">Retain</option></select></div>
            <div className="setting-row"><div className="setting-label-col"><div className="setting-label">Transcript</div><div className="setting-desc">A deleted transcript leaves frozen citation evidence required to explain approved canon, but is removed from current retrieval.</div></div><select className="settings-field" name="transcriptRetention" defaultValue={settings.saga.transcript_retention}><option value="retain">Retain</option><option value="delete_after_synthesis">Delete after review closes</option></select></div>
            <label className="field" style={{ flexDirection: "row", gap: 8 }}><input type="checkbox" name="confirmRetention" value="true" /><span>I understand enabling cleanup cannot restore already-deleted source text.</span></label>
            <p className="setting-desc">Recovery now: {settings.recovery.failed_transcriptions ?? 0} failed transcription job(s), {settings.recovery.retained_audio_chunks ?? 0} retained audio chunk(s).</p><button className="btn btn-secondary btn-sm" type="submit">Save retention</button>
          </form>
        </section>

        <section id="usage" className="card settings-content-card" style={{ marginBottom: 12 }}>
          <div className="sec-label"><RelicIcon name="clock" size={11} /> Workspace usage · {workspace.name}</div><p className="setting-desc">These are the same effective limits used before work starts, including temporary capacity overrides.</p>
          {meters.length ? meters.map((meter) => { const used=Number(meter.used??0),limit=Number(meter.limit??0),percent=meterPercent(meter),blocked=meter.severity==="blocked",warn=meter.severity==="warn_70"||meter.severity==="warn_90"; return <div key={meter.limit_key} className="usage-bar-row"><div className="usage-bar-label">{usageLabel(meter.limit_key)}<span className={`chip ${blocked?"rust":warn?"amber":""}`}>{blocked?"100% · blocked":meter.severity==="warn_90"?"90% warning":meter.severity==="warn_70"?"70% notice":"Available"}</span></div><div className="usage-bar" aria-label={`${usageLabel(meter.limit_key)} ${percent}% used`}><div className={`usage-bar-fill ${blocked?"crit":warn?"warn":""}`} style={{width:`${percent}%`}} /></div><div className="usage-bar-val">{meterValue(meter.limit_key,used)} / {meterValue(meter.limit_key,limit)}</div>{blocked ? <p className="setting-desc">New metered work in this category is blocked. Viewing, editing, Review, existing downloads, and manual workflows remain available.</p> : null}</div>; }) : <p className="setting-desc">No usage data yet.</p>}
          {resetAt ? <p className="setting-desc">Resets {new Date(resetAt).toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}. Private alpha capacity can be requested without changing providers or models.</p> : null}
        </section>

        <section id="notifications" className="card settings-content-card" style={{ marginBottom: 12 }}>
          <div className="sec-label">Email notifications</div><p className="setting-desc">Messages contain a safe status and authorized deep link, never prompts, transcript excerpts, or generated story text.</p>
          <form action={updateNotificationPreferencesAction}><HiddenContextFields params={ids} /><input type="hidden" name="idempotencyKey" value={`settings:notifications:${randomUUID()}`} />
            <label className="field" style={{flexDirection:"row",gap:8}}><input type="checkbox" name="notificationsPaused" value="true" defaultChecked={Boolean(preferences.paused)} /><span>Pause all notifications</span></label>
            {[["emailPipelineReady","pipeline_ready","Review is ready"],["emailPipelineFailed","pipeline_failed","Pipeline failed"],["emailPipelineStale30","pipeline_stale_30d","Review waiting 30 days"],["emailPipelineStale90","pipeline_stale_90d","Review waiting 90 days"],["emailQuotaWarn90","quota_warn_90","Workspace usage reaches 90%"],["emailQuotaBlocked","quota_blocked","Workspace usage reaches its limit"],["emailLoomReady","loom_task_ready","Long-running Loom task is ready"],["emailLoomFailed","loom_task_failed","Long-running Loom task failed"],["emailLoomStale","loom_task_stale","Loom task is still waiting"]].map(([name,kind,label])=><label key={kind} className="field" style={{flexDirection:"row",gap:8}}><input type="checkbox" name={name} value="true" defaultChecked={pref(preferences,"email",kind)} /><span>{label}</span></label>)}
            <button className="btn btn-secondary btn-sm" type="submit">Save notifications</button>
          </form>
          {deliveries.length ? <div><p className="setting-desc">Recent delivery state</p>{deliveries.slice(0,5).map((delivery)=><div className="setting-row" key={delivery.id}><div className="setting-label-col"><div className="setting-label">{delivery.kind.replaceAll("_"," ")}</div><div className="setting-desc">{new Date(delivery.created_at).toLocaleString()}</div></div><div className="kv-v"><span className={delivery.state==="sent"?"chip verdigris":delivery.state==="failed"?"chip rust":"chip amber"}>{delivery.state}</span>{delivery.deep_link?<a href={delivery.deep_link}>Open</a>:null}</div></div>)}</div>:null}
        </section>

        <section id="export" className="card settings-content-card" style={{ marginBottom: 12 }}><div className="sec-label"><RelicIcon name="export" size={11} /> Export</div><p className="setting-desc">Create a private Markdown/JSON archive. The Phase F export contract excludes secrets, private prompts, provider payloads, and embeddings.</p><a className="btn btn-ghost btn-sm" href={`${root}/export`}>Open export</a></section>
        <section id="account" className="card settings-content-card" style={{ marginBottom: 12 }}><div className="sec-label">Account</div><form action={signOutAction}><button className="btn btn-ghost btn-sm" type="submit">Sign out</button></form>{recent.length ? <div><p className="setting-desc">Recent setting changes</p>{recent.map((change)=><div className="kv-v" key={`${change.action}-${change.changed_at}`}>{change.action.replaceAll("_"," ")} · {new Date(change.changed_at).toLocaleString()}</div>)}</div>:null}</section>
        <section id="danger" className="danger-zone"><div className="dz-title">Danger zone</div><p className="setting-desc">Deletion hides this Saga immediately, then permanently removes its database and Storage data. It is blocked while a Session is live or ending.</p><form className="settings-delete-form" action={deleteSagaAction}><HiddenContextFields params={ids} /><label className="field"><span>Type <strong>{saga.name}</strong> to confirm</span><input className="settings-field" name="confirmationName" required autoComplete="off" /></label><button className="btn btn-rust btn-sm" type="submit">Delete saga permanently</button></form></section>
      </div>
    </div>
  </SanctumShell>;
}
