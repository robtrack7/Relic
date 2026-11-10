import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { afterAll, expect, it } from "vitest";
import { OBJECT_DESK, THIRD_TOLL } from "@/components/world-objects/object-fixtures";
import { asCardId, asClaimId, asRepresentationId, asWorldId, asWorldObjectId } from "@/lib/world/model";
import { db, closeDb } from "@/lib/world/db";
import { PostgresDeskRepository } from "@/lib/world/postgres-store";
import { must } from "./support";

afterAll(closeDb);

it("persists the Focus dossier and mechanics independently of maturity, claims and placement", async () => {
  const repo = PostgresDeskRepository.open(db());
  const worldId = asWorldId(randomUUID());
  const desk = await repo.openDesk(worldId);
  const fixtures = [...OBJECT_DESK.cards, THIRD_TOLL];
  const identities = new Map(fixtures.map(card => [card.objectId, asWorldObjectId(randomUUID())]));
  const placements = new Map(fixtures.map(card => [card.objectId, asCardId(randomUUID())]));
  for (const fixture of fixtures) {
    const objectId = identities.get(fixture.objectId)!;
    const cardId = placements.get(fixture.objectId)!;
    const representationId = asRepresentationId(randomUUID());
    must(await repo.captureCard({ compositionId: desk.compositionId, cardId, objectId, body: fixture.body, layout: fixture.layout, author: "gm",
      initialRepresentation: fixture.representation ? { representationId, kind: fixture.representation.kind, label: fixture.representation.label } : undefined }), "capture Focus fixture");
    if (fixture.representation) must(await repo.editRepresentation({ representationId, label: fixture.representation.label, fields: fixture.representation.fields, observedVersion: 1 }), "save authored mechanics");
  }
  for (const fixture of fixtures) {
    const objectId = identities.get(fixture.objectId)!;
    const assertions = [...fixture.claims.map(claim => ({ key: claim.claimKind, value: claim.value, target: claim.objectValue, story: claim.story, truth: claim.truthState })),
      ...fixture.links.filter(link => link.direction === "out" && !fixture.claims.some(claim => claim.claimKind === link.claimKind)).map(link => ({ key: link.claimKind, value: link.other.label, target: link.other.objectId, story: undefined, truth: link.truthState }))];
    const claims = [];
    for (const assertion of assertions) {
      const claim = must(await repo.setClaim({ subjectId: objectId, claimId: asClaimId(randomUUID()), claimKind: assertion.key, value: assertion.value,
        objectValue: assertion.target ? identities.get(assertion.target) ?? null : null, story: assertion.story, author: "gm" }), "write Focus assertion");
      if (assertion.truth === "ink") claims.push({ claimId: claim.id, truth: "ink" as const, observedVersion: claim.version });
    }
    must(await repo.settleTruth({ objectId, maturity: fixture.maturity, claims, author: "gm" }), "settle fixture state");
  }
  const view = (await repo.openComposition(desk.compositionId))!;
  const mara = view.cards.find(card => card.objectId === identities.get(fixtures[0]!.objectId))!;
  expect(mara.representation?.fields.actions).toContain("Read the room");
  expect(mara.claims.find(claim => claim.claimKind === "status")?.truthState).toBe("ink");
  const originalLayout = mara.layout;
  const changed = await repo.editRepresentation({ representationId: mara.representation!.id, observedVersion: mara.representation!.version, label: mara.representation!.label,
    fields: { ...mara.representation!.fields, hp: 0, gmNotes: "The envoy keeps the unopened letter." } });
  expect(changed.state).toBe("ok");
  const reloaded = (await repo.openComposition(desk.compositionId))!.cards.find(card => card.cardId === mara.cardId)!;
  expect(reloaded.representation!.fields.hp).toBe(0);
  expect(reloaded.representation!.fields.gmNotes).toContain("unopened letter");
  expect(reloaded.maturity).toBe("ink");
  expect(reloaded.claims).toEqual(mara.claims);
  expect(reloaded.layout).toEqual(originalLayout);
  expect((await repo.editRepresentation({ representationId: mara.representation!.id, observedVersion: mara.representation!.version, label: "Stale edit", fields: {} })).state).toBe("conflict");
  // Optional bridge for the manual integrated-app verification. Uses an isolated
  // world, never the GM's working Desk or a production fixture route.
  if (process.env.RELIC_FOCUS_FIXTURE_PATH) await writeFile(process.env.RELIC_FOCUS_FIXTURE_PATH, JSON.stringify({ worldId, compositionId: desk.compositionId, maraCardId: mara.cardId }));
}, 20000);
