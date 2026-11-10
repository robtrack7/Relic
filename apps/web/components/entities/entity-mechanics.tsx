"use client";

import type { EntitySnapshot } from "@/lib/world/entity-document";
import { legacyMechanicsProfile } from "@/lib/world/mechanics-presentation";
import type { EntitySession } from "./entity-session";
import { MechanicsStatBlock } from "./mechanics-stat-block";
import mechanicsStyles from "./mechanics.module.css";

/** The entity's mechanics as one stat block: read at Focus depth, edited in place at Builder depth. */
export function EntityMechanics({ entity, session, editable = true, onReference }: { entity: EntitySnapshot; session: EntitySession; editable?: boolean; onReference?: (id: string) => void }) {
  const profile = entity.representation?.mechanics ?? legacyMechanicsProfile(entity);
  return <section className={mechanicsStyles.mechanics} aria-label="Mechanical profile" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) void session.flush(); }}>
    <MechanicsStatBlock profile={profile} depth={editable ? "builder" : "focus"} editable={editable} onChange={next => session.setMechanicsDraft(next)} onReference={onReference} objectPicker={{ store: session, subject: entity.objectId }}/>
  </section>;
}
