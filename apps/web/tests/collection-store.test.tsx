import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OBJECT_DESK } from "@/components/world-objects/object-fixtures";
import type { SpatialState } from "@/lib/world/model";

const actions = vi.hoisted(() => Object.fromEntries(["captureCardAction", "changeCollectionAction", "editCardBodyAction", "editRepresentationAction", "moveCardsAction", "moveCollectionCardsAction", "referenceObjectsAction", "removeCardsAction", "removeCollectionCardsAction", "removeClaimAction", "representObjectAction", "searchWorldAction", "setClaimAction", "settleTruthAction"].map(name => [name, vi.fn()])));
vi.mock("@/app/actions", () => actions);
const { useDesk } = await import("@/components/desk/use-desk");

const spatial: SpatialState = { version: 1, collections: [
  { id: "first-collection", title: "People", cardIds: [OBJECT_DESK.cards[0]!.cardId], collapsed: false },
  { id: "second-collection", title: "Coast", cardIds: [OBJECT_DESK.cards[1]!.cardId], collapsed: false }
] };

describe("collection write queue", () => {
  it("rebases later optimistic commands after a failed earlier write and installs the saved state", async () => {
    let refuse!: (value: unknown) => void;
    actions.changeCollectionAction!.mockReset().mockImplementationOnce(() => new Promise(resolve => { refuse = resolve; })).mockResolvedValueOnce({ state: "ok", data: { version: 2, collections: [spatial.collections[0], { ...spatial.collections[1], collapsed: true }] } });
    const { result } = renderHook(() => useDesk({ ...OBJECT_DESK, spatial }));
    let first!: Promise<boolean>, second!: Promise<boolean>;
    act(() => {
      first = result.current.changeCollection({ kind: "rename", id: "first-collection", title: "Failed name" });
      second = result.current.changeCollection({ kind: "collapse", id: "second-collection", collapsed: true });
    });
    await waitFor(() => expect(actions.changeCollectionAction).toHaveBeenCalledTimes(1));
    await act(async () => { refuse({ state: "failed", message: "Could not save the collection." }); await Promise.all([first, second]); });
    expect(await first).toBe(false);
    expect(await second).toBe(true);
    expect(result.current.spatial.collections[0]?.title).toBe("People");
    expect(result.current.spatial.collections[1]?.collapsed).toBe(true);
    expect(result.current.spatial.version).toBe(2);
    expect(actions.changeCollectionAction!.mock.calls.map(call => call[0].observedVersion)).toEqual([1, 1]);
  });

  it("resolves a thrown collection write and rolls its optimistic state back", async () => {
    actions.changeCollectionAction!.mockReset().mockRejectedValueOnce(new Error("offline"));
    const { result } = renderHook(() => useDesk({ ...OBJECT_DESK, spatial }));
    let saved = true;
    await act(async () => { saved = await result.current.changeCollection({ kind: "collapse", id: "first-collection", collapsed: true }); });
    expect(saved).toBe(false);
    expect(result.current.spatial).toEqual(spatial);
    expect(result.current.sync.kind).toBe("problem");
  });

  it("rolls back a refused coupled drag without changing collection membership", async () => {
    actions.moveCollectionCardsAction!.mockReset().mockResolvedValueOnce({ state: "refused", reason: "The collection changed elsewhere." });
    const { result } = renderHook(() => useDesk({ ...OBJECT_DESK, spatial }));
    const card = OBJECT_DESK.cards[0]!;
    act(() => result.current.nudge([card.cardId], 800, 100));
    await act(async () => { expect(await result.current.commitCollectionMove([card.cardId], null, [card])).toBe(false); });
    expect(result.current.byId.get(card.cardId)?.layout).toEqual(card.layout);
    expect(result.current.spatial).toEqual(spatial);
  });
});
