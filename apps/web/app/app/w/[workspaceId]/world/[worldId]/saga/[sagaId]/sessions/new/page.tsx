import { createSessionAction } from "@/app/actions";
import { HiddenContextFields } from "@/components/HiddenContextFields";
import { SanctumShell } from "@/components/SanctumShell";
import { getSessions, requireSagaContext } from "@/lib/data";
import type { IdParams } from "@/lib/types";

export default async function NewSessionPage({ params }: { params: Promise<IdParams> }) {
  const ids = await params;
  const [{ workspace, world, saga }, sessions] = await Promise.all([requireSagaContext(ids), getSessions(ids)]);
  return (
    <SanctumShell params={ids} workspace={workspace} world={world} saga={saga} active="sessions">
      <section><div className="eyebrow">Prep inside The Sanctum</div><h1 className="page-title">New session</h1></section>
      <form className="form-stack card" action={createSessionAction}>
        <HiddenContextFields params={ids} />
        <label className="field"><span>Name</span><input className="input" name="name" defaultValue={`Session ${sessions.length + 1}`} required /></label>
        <label className="field"><span>Objective</span><input className="input" name="objective" /></label>
        <label className="field"><span>Opening scene</span><textarea className="textarea" name="openingScene" /></label>
        <label className="field"><span>Scene notes</span><textarea className="textarea" name="sceneNotes" /></label>
        <button className="button" type="submit">Create prep workspace</button>
      </form>
    </SanctumShell>
  );
}
