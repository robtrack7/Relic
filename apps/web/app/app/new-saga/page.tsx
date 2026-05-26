import { createBlankSagaAction } from "@/app/actions";
import { requireUser } from "@/lib/data";

export default async function NewSagaPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  const { supabase } = await requireUser();
  await supabase.rpc("ensure_default_workspace");
  const { data } = await supabase.rpc("list_worlds_for_workspace");
  const worlds = (data ?? []) as Array<{ id: string; name: string }>;

  return (
    <main className="auth-page">
      <section className="auth-card" style={{ width: "min(760px, 100%)" }}>
        <div className="eyebrow">New saga</div>
        <h1 className="display-title">Create a playable start</h1>
        <p className="muted">Start Blank is live in this phase. AI-assisted setup remains review-gated until the runtime phase.</p>
        {params.error ? <p className="danger-note">{params.error}</p> : null}
        <form className="form-stack" action={createBlankSagaAction}>
          <div className="content-grid">
            <label className="field">
              <span>Saga name</span>
              <input className="input" name="sagaName" required maxLength={120} placeholder="The Thornwood Accord" />
            </label>
            <label className="field">
              <span>Game system</span>
              <input className="input" name="gameSystem" placeholder="D&D 5e, Pathfinder, Cairn, homebrew..." />
            </label>
          </div>
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
              <select className="select" name="existingWorldId" defaultValue={worlds?.[0]?.id ?? ""}>
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
              <select className="select" name="experienceLevel" defaultValue="returning">
                <option value="new">New GM</option>
                <option value="returning">Returning GM</option>
                <option value="experienced">Experienced GM</option>
                <option value="veteran">Veteran GM</option>
              </select>
            </label>
            <label className="field">
              <span>Improv comfort</span>
              <select className="select" name="improvComfort" defaultValue="mixed">
                <option value="planner">I like to plan</option>
                <option value="mixed">A bit of both</option>
                <option value="improv_first">I improvise a lot</option>
              </select>
            </label>
            <label className="field">
              <span>Prep style</span>
              <select className="select" name="prepStyle" defaultValue="mixed">
                <option value="heavy">Detailed prep</option>
                <option value="mixed">Practical prep</option>
                <option value="light">Light prep</option>
              </select>
            </label>
          </div>
          <div className="content-grid">
            <div className="card">
              <span className="chip">Build with AI</span>
              <p className="muted">Disabled until the AI runtime implementation phase is accepted.</p>
            </div>
            <div className="card">
              <span className="chip">Bring your notes</span>
              <p className="muted">Disabled for this manual phase. Paste/import work lands later.</p>
            </div>
            <label className="card accent">
              <input type="radio" name="helpLevel" value="start_blank" defaultChecked /> Start blank
              <p className="muted">Create a real empty Saga now. You can manually add canon and prep Session 1.</p>
            </label>
          </div>
          <button className="button" type="submit">Create blank saga</button>
        </form>
      </section>
    </main>
  );
}
