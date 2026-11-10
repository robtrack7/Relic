import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RelationshipComposer } from "@/components/world-objects/relationship-composer";
import { MARA, WATCHERS_SPIRE, fixtureClaim } from "@/components/world-objects/object-fixtures";
import { asClaimId, cardRef } from "@/lib/world/model";
import type { DeskStore } from "@/components/desk/use-desk";

afterEach(cleanup);

describe("RelationshipComposer", () => {
  it("renames a predicate using the claim version and story observed at open", async () => {
    const claimId = asClaimId("composer-observed-claim");
    const story = { order: 600, precision: "relative" as const, label: "After the harbour fire" };
    const targetLabel = WATCHERS_SPIRE.representation!.label ?? "Watcher’s Spire";
    const claim = fixtureClaim(MARA, "knows", targetLabel, {
      id: claimId,
      objectValue: WATCHERS_SPIRE.objectId,
      version: 7,
      story
    });
    const card = {
      ...MARA,
      claims: [...MARA.claims, claim],
      links: [...MARA.links, { claimId, claimKind: "knows", direction: "out" as const, other: cardRef(WATCHERS_SPIRE), truthState: "ink" as const }]
    };
    const assert = vi.fn().mockResolvedValue(true);
    const store = { assert } as unknown as DeskStore;
    render(<RelationshipComposer card={card} store={store} existing={card.links.at(-1)}/>);

    const user = userEvent.setup();
    const predicate = screen.getByLabelText("Relationship");
    await user.clear(predicate);
    await user.type(predicate, "protects");
    await user.click(screen.getByRole("button", { name: "Save relationship" }));

    expect(assert).toHaveBeenCalledWith(
      MARA.objectId,
      "protects",
      targetLabel,
      cardRef(WATCHERS_SPIRE),
      story,
      { claimId, version: 7, relationshipId: null }
    );
  });

  it("accepts contextual endpoint and predicate defaults from Canvas Connect", async () => {
    const target = cardRef(WATCHERS_SPIRE);
    const assert = vi.fn().mockResolvedValue(true);
    const store = { assert, findObjects: vi.fn(), search: vi.fn() } as unknown as DeskStore;
    render(<RelationshipComposer card={{ ...MARA, claims: [], links: [] }} store={store} initialTarget={target} initialRelation="protects"/>);
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "Add relationship" }));
    expect(assert).toHaveBeenCalledWith(MARA.objectId, "protects", target.label, target, undefined, undefined);
  });

  it("does not ask to replace many-valued relationships", () => {
    const target = cardRef(WATCHERS_SPIRE);
    const store = { assert: vi.fn(), findObjects: vi.fn(), search: vi.fn() } as unknown as DeskStore;
    render(<RelationshipComposer card={{ ...MARA, claims: [], links: [] }} store={store} initialTarget={target} initialRelation="knows"/>);
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("keeps the draft and exits saving state when the write rejects", async () => {
    const target = cardRef(WATCHERS_SPIRE);
    const assert = vi.fn().mockRejectedValue(new Error("offline"));
    const store = { assert, findObjects: vi.fn(), search: vi.fn() } as unknown as DeskStore;
    render(<RelationshipComposer card={{ ...MARA, claims: [], links: [] }} store={store} initialTarget={target} initialRelation="protects"/>);
    const user = userEvent.setup();
    const predicate = screen.getByRole("combobox", { name: "Relationship" });
    await user.click(screen.getByRole("button", { name: "Add relationship" }));
    expect((await screen.findByRole("alert")).textContent).toContain("draft is still here");
    expect((predicate as HTMLInputElement).value).toBe("protects");
  });
});
