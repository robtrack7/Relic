import { createBlankSagaAction, createSagaWorkshopAction } from "@/app/actions";
import { requireUser } from "@/lib/data";

export default async function NewSagaPage({ searchParams }: { searchParams: Promise<{ error?: string; workspaceId?: string; worldId?: string; lifecycleNotice?: string }> }) {
  const params = await searchParams;
  const { supabase } = await requireUser();
  const { data: defaultWorkspaceId } = await supabase.rpc("ensure_default_workspace");
  const targetWorkspaceId = params.workspaceId || String(defaultWorkspaceId ?? "");
  const { data, error } = await supabase.rpc("list_worlds_for_workspace", { workspace_id: targetWorkspaceId || null });
  if (error) throw new Error(error.message);
  const { data: bootstrap, error: bootstrapError } = await supabase.rpc("get_bootstrap_context");
  if (bootstrapError) throw new Error(bootstrapError.message);
  const savedProfile = ((bootstrap as { gm_profile?: Record<string, unknown> | null } | null)?.gm_profile ?? null);
  const hasSavedProfile = Boolean(savedProfile);
  const experienceLevel = String(savedProfile?.experience_level ?? "returning");
  const improvComfort = String(savedProfile?.improv_comfort ?? "mixed");
  const prepStyle = String(savedProfile?.prep_style ?? "mixed");
  const defaultGameSystem = String(savedProfile?.default_game_system ?? "");
  const worlds = (data ?? []) as Array<{ id: string; name: string }>;
  const selectedWorldId = worlds.some((world) => world.id === params.worldId) ? params.worldId : worlds[0]?.id ?? "";

  return (
    <main className="auth-page">
      <section className="auth-card" style={{ width: "min(760px, 100%)" }}>
        <div className="eyebrow">New saga</div>
        <h1 className="display-title">Create a playable start</h1>
        <p className="muted">Let the Loom assemble a complete, cited draft in the background, or begin manually. Nothing becomes canon until you review and commit it.</p>
        {params.error ? <p className="danger-note">{params.error}</p> : null}
        {params.lifecycleNotice === "delete_pending" ? <p className="notice">Saga deletion is underway. Create another Saga when you are ready.</p> : null}
        <form className="form-stack">
          <input type="hidden" name="targetWorkspaceId" value={targetWorkspaceId} />
          <input type="hidden" name="workshopId" value={crypto.randomUUID()} />
          <input type="hidden" name="idempotencyKey" value={crypto.randomUUID()} />
          <div className="content-grid">
            <label className="field">
              <span>Saga name</span>
              <input className="input" name="sagaName" required maxLength={120} placeholder="The Thornwood Accord" />
            </label>
            <label className="field">
              <span>Game system</span>
              <input className="input" name="gameSystem" defaultValue={defaultGameSystem} placeholder="D&D 5e, Pathfinder, Cairn, homebrew..." />
            </label>
          </div>
          {hasSavedProfile ? (
            <fieldset className="card form-stack">
              <legend>GM profile for this Saga</legend>
              <label><input type="radio" name="profileMode" value="use_default" defaultChecked /> Use my saved default</label>
              <label><input type="radio" name="profileMode" value="customize_for_saga" /> Customize for this Saga</label>
              <p className="muted">The server uses your saved profile unless you explicitly choose the Saga-specific option. Values below are ignored in default mode.</p>
              <label><input type="checkbox" name="saveProfileAsDefault" value="true" /> Save customized values as my new default</label>
            </fieldset>
          ) : (
            <>
              <input type="hidden" name="profileMode" value="customize_for_saga" />
              <input type="hidden" name="saveProfileAsDefault" value="true" />
              <p className="muted">Your first Saga choices become your reusable GM profile default.</p>
            </>
          )}
          <div className="content-grid">
            <label className="field">
              <span>World choice</span>
              <select className="select" name="worldChoice" defaultValue={worlds?.length ? "existing" : "new"}>
                {worlds?.length ? <option value="existing">Use existing World</option> : null}
                <option value="new">Create a new World</option>
              </select>
            </label>
            <label className="field">
              <span>Existing World</span>
              <select className="select" name="existingWorldId" defaultValue={selectedWorldId}>
                <option value="">Create a new World</option>
                {worlds?.map((world) => <option key={world.id} value={world.id}>{world.name}</option>)}
              </select>
            </label>
            <label className="field">
              <span>New World name</span>
              <input className="input" name="worldName" placeholder="Defaults to [Saga name] World" />
            </label>
          </div>
          <div className="content-grid">
            <label className="field">
              <span>Experience</span>
              <select className="select" name="experienceLevel" defaultValue={experienceLevel}>
                <option value="new">New GM</option>
                <option value="returning">Returning GM</option>
                <option value="experienced">Experienced GM</option>
                <option value="veteran">Veteran GM</option>
              </select>
            </label>
            <label className="field">
              <span>Improv comfort</span>
              <select className="select" name="improvComfort" defaultValue={improvComfort}>
                <option value="planner">I like to plan</option>
                <option value="mixed">A bit of both</option>
                <option value="improv_first">I improvise a lot</option>
              </select>
            </label>
            <label className="field">
              <span>Prep style</span>
              <select className="select" name="prepStyle" defaultValue={prepStyle}>
                <option value="heavy">Detailed prep</option>
                <option value="mixed">Practical prep</option>
                <option value="light">Light prep</option>
              </select>
            </label>
          </div>
          <label className="field">
            <span>Idea or notes for the Loom</span>
            <textarea className="textarea" name="ideaOrNotes" rows={8} maxLength={50000} placeholder="Describe the premise, tone, conflicts, people, places, and any facts the draft must preserve. Retrieved content is treated as evidence, never as instructions." />
          </label>
          <div className="content-grid">
            <label className="card accent">
              <input type="radio" name="helpLevel" value="build_with_ai" defaultChecked /> Build with the Loom
              <p className="muted">Create an editable Saga, lore, relationships, and Session 1 packet with source context.</p>
            </label>
            <label className="card">
              <input type="radio" name="helpLevel" value="bring_your_notes" /> Bring your notes
              <p className="muted">Turn pasted notes into the same reviewable scaffold without publishing automatically.</p>
            </label>
            <label className="card">
              <input type="radio" name="helpLevel" value="start_blank" /> Start blank
              <p className="muted">Create a real empty Saga now. You can manually add canon and prep Session 1.</p>
            </label>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="button" type="submit" formAction={createSagaWorkshopAction}>Draft with the Loom</button>
            <button className="button secondary" type="submit" formAction={createBlankSagaAction}>Create blank saga</button>
          </div>
        </form>
      </section>
    </main>
  );
}
