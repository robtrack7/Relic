import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MARA, WATCHERS_SPIRE, TIDE_LEDGER, BELL_THREAD, LOOSE_FRAGMENT, OBJECT_DESK, OBJECT_WORKSPACE, THREAD_AT_SESSION_FOUR, fixtureClaim } from "@/components/world-objects/object-fixtures";
import { WorldObjectCard } from "@/components/world-objects/world-object-card";
import { ObjectProposalPreview } from "@/components/world-objects/object-proposal";
import { observeObject, previewObjectProposal, type ObjectProposal } from "@/lib/world/object-proposal";
import { asClaimId } from "@/lib/world/model";
import { legacyDocument, narrativeBody, type EntityDocument, type EntitySnapshot } from "@/lib/world/entity-document";
import { resolveDisclosure, safeMediaUrl } from "@/lib/world/object-presentation";
import { asTemplateId } from "@/lib/world/model";
import { useState } from "react";

const actions = vi.hoisted(() => ({ editCardBodyAction: vi.fn(), editRepresentationAction: vi.fn(), setClaimAction: vi.fn(), removeClaimAction: vi.fn(), settleTruthAction: vi.fn(), searchWorldAction: vi.fn(), moveCardsAction: vi.fn() }));
const entityActions = vi.hoisted(() => ({ loadEntityAction: vi.fn(), saveEntityDocumentAction: vi.fn(), saveEntityIdentityAction: vi.fn(), saveEntityMechanicsAction: vi.fn() }));
vi.mock("@/app/actions", () => ({ ...actions, captureCardAction: vi.fn(), referenceObjectsAction: vi.fn(), removeCardsAction: vi.fn(), representObjectAction: vi.fn(), createBoardAction: vi.fn(), createSessionAction: vi.fn(), editSessionAction: vi.fn(), setBeatAction: vi.fn(), removeBeatAction: vi.fn(), reorderBeatsAction: vi.fn() }));
vi.mock("@/app/entity-actions", () => entityActions);
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
const { useDesk } = await import("@/components/desk/use-desk");
const { DeskSurface } = await import("@/components/desk/desk-surface");

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, "matchMedia", { writable: true, value: vi.fn().mockImplementation(query => ({ matches: false, media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn() })) });
  actions.searchWorldAction.mockResolvedValue({ state: "ok", data: [] });
  const store = new Map<string, EntitySnapshot>(OBJECT_DESK.cards.map(card => [String(card.objectId), { ...card, worldId: OBJECT_DESK.worldId, lifecycle: "active", document: legacyDocument(card) }]));
  entityActions.loadEntityAction.mockImplementation(async (input: { objectId: string }) => {
    const entity = store.get(String(input.objectId));
    return entity ? { state: "ok", data: structuredClone(entity) } : { state: "missing" };
  });
  entityActions.saveEntityDocumentAction.mockImplementation(async (input: { objectId: string; document: EntityDocument }) => {
    const entity = store.get(String(input.objectId));
    if (!entity) return { state: "missing" };
    const saved = { ...entity, document: { ...input.document, version: entity.document.version + 1 }, body: narrativeBody(input.document) };
    store.set(String(input.objectId), saved);
    return { state: "ok", data: structuredClone(saved) };
  });
  entityActions.saveEntityIdentityAction.mockResolvedValue({ state: "missing" });
  entityActions.saveEntityMechanicsAction.mockResolvedValue({ state: "missing" });
});

describe("World Object disclosure and temporal presentation", () => {
  it("requires deliberate disclosure at close zoom and restores expansion after far zoom", () => {
    expect(resolveDisclosure("near", false)).toBe("card");
    expect(resolveDisclosure("far", true)).toBe("expanded");
    expect(resolveDisclosure("mid", true)).toBe("expanded");
  });
  it("keeps pending assertions out of settled identity even on an Ink object", () => {
    render(<WorldObjectCard card={{ ...MARA, claims: [...MARA.claims, fixtureClaim(MARA, "status", "Missing", { id: asClaimId("missing-pending"), truthState: "pencil", settled: null })] }}/>);
    expect(screen.getByText("Mara Veyra")).toBeTruthy();
    expect(screen.queryByText("Missing")).toBeNull();
  });
  it("uses a complete historical projection without current connections, concerns or developments", () => {
    render(<WorldObjectCard card={BELL_THREAD} snapshot={THREAD_AT_SESSION_FOUR} disclosure="expanded"/>);
    expect(screen.getByText("Dormant")).toBeTruthy();
    expect(screen.queryByText("Mara Veyra")).toBeNull();
    expect(screen.queryByText("The bell sounds again beneath the spire.")).toBeNull();
    expect(screen.queryByText("Who sealed the door beneath the spire?")).toBeNull();
    expect(screen.getByText(/As of Session 4/)).toBeTruthy();
  });
  it("supports an image capture without classification and collapses failed imagery", () => {
    render(<WorldObjectCard card={{ ...LOOSE_FRAGMENT, body: "![The old spire](/desk/blackwater-harbour.webp)\nThe path appears at low tide." }}/>);
    expect(screen.getByText("The path appears at low tide.")).toBeTruthy();
    expect(screen.queryByText("Fragment")).toBeNull();
    fireEvent.error(screen.getByRole("img"));
    expect(screen.queryByRole("img")).toBeNull();
    expect(safeMediaUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeMediaUrl("//untrusted.example/image.png")).toBeUndefined();
  });
});

describe("family faces", () => {
  const families = [MARA, WATCHERS_SPIRE, BELL_THREAD, TIDE_LEDGER, LOOSE_FRAGMENT,
    { ...MARA, representation: { ...MARA.representation!, kind: "faction" as const, label: "House Seradine", fields: {} } },
    { ...MARA, representation: { ...MARA.representation!, kind: "artifact" as const, label: "The Tide Key", fields: {} } },
    { ...BELL_THREAD, representation: { ...BELL_THREAD.representation!, kind: "event" as const, label: "The Third Toll", fields: {} } }];
  it("shows a maturity cue on every family's card, separate from selection", () => {
    for (const card of families) {
      const { container, unmount } = render(<WorldObjectCard card={card} selected/>);
      const surface = container.querySelector("[data-object-family]")!;
      expect(surface.getAttribute("data-maturity")).toBe(card.maturity);
      expect(container.querySelector("[data-maturity] i")).toBeTruthy();
      expect(container.textContent).toMatch(card.maturity === "ink" ? /Ink/ : /Pencil/);
      unmount();
    }
  });
  it("keeps the Character Card to portrait and name, and composes initials without an image", () => {
    const { container, unmount } = render(<WorldObjectCard card={MARA}/>);
    const small = container.querySelector('[data-recognition="small"]')!;
    expect(small.querySelector("[data-card-title]")?.textContent).toBe("Mara Veyra");
    expect(small.textContent).not.toContain("Crown envoy");
    unmount();
    render(<WorldObjectCard card={{ ...MARA, representation: { ...MARA.representation!, fields: {} } }}/>);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("MV")).toBeTruthy();
  });
  it("renders the far tier as the same object with image or mark and name", () => {
    for (const card of families) {
      const { container, unmount } = render(<WorldObjectCard card={card} disclosure="marker"/>);
      const far = container.querySelector('[data-recognition="far"]')!;
      expect(far.querySelector("[data-card-title]")?.textContent).toBeTruthy();
      expect(far.querySelector("svg")).toBeTruthy();
      unmount();
    }
  });
  it("leads a Thread with its question and involved names, and adds developments only when expanded", () => {
    const { unmount } = render(<WorldObjectCard card={BELL_THREAD}/>);
    expect(screen.getByText("Why does the bell toll when no hand rings it?")).toBeTruthy();
    expect(screen.getByText(/Mara Veyra · Watcher’s Spire/)).toBeTruthy();
    expect(screen.queryByText("The bell sounds again beneath the spire.")).toBeNull();
    unmount();
    render(<WorldObjectCard card={BELL_THREAD} disclosure="expanded"/>);
    expect(screen.getByText("The bell sounds again beneath the spire.")).toBeTruthy();
    expect(screen.queryByText("A fourth vessel may have answered the bell.")).toBeNull();
  });
});

const proposal: ObjectProposal = { id: "proposal-1", objectId: MARA.objectId, scope: { worldId: OBJECT_DESK.worldId, compositionId: OBJECT_DESK.compositionId }, context: { kind: "now" }, observed: observeObject(MARA), reason: "A possible connection from the harbour notes.", provenance: { kind: "librarian", authoredBy: "librarian", recordedAt: "2026-08-18T12:00:00Z" }, change: { kind: "claim", key: "status", value: "Missing" } };
describe("contextual proposals", () => {
  it("previews the same identity without mutating committed material and rejects a different identity", () => {
    const preview = previewObjectProposal(MARA, proposal);
    expect(preview.objectId).toBe(MARA.objectId);
    expect(preview.claims.at(-1)?.truthState).toBe("pencil");
    expect(preview.claims.at(-1)?.provenance.authoredBy).toBe("librarian");
    expect(MARA.claims.some(claim => claim.value === "Missing")).toBe(false);
    expect(() => previewObjectProposal(BELL_THREAD, proposal)).toThrow(/different object/);
  });
  it("waits for Apply, retains an unsuccessful proposal, and lets the GM edit and dismiss it", async () => {
    const apply = vi.fn().mockResolvedValue(false);
    const dismiss = vi.fn();
    render(<ObjectProposalPreview card={MARA} proposal={proposal} onApply={apply} onDismiss={dismiss}/>);
    expect(apply).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Edit proposal" }));
    await userEvent.clear(screen.getByRole("textbox"));
    await userEvent.type(screen.getByRole("textbox"), "At sea");
    await userEvent.click(screen.getByRole("button", { name: /^Apply$/ }));
    expect(apply).toHaveBeenCalledWith(expect.objectContaining({ change: expect.objectContaining({ value: "At sea" }) }));
    expect(await screen.findByRole("alert")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(dismiss).toHaveBeenCalledOnce();
  });
});

describe("acknowledged manual writes", () => {
  it("acknowledges a failed save without losing the body or reporting success", async () => {
    actions.editCardBodyAction.mockResolvedValue({ state: "failed", message: "Offline" });
    const { result } = renderHook(() => useDesk({ ...OBJECT_DESK, cards: [MARA] }));
    let saved;
    await act(async () => { saved = await result.current.saveBody(MARA.cardId, "A changed passage"); });
    expect(saved).toBe(false);
    expect(result.current.cards[0]!.body).toBe(MARA.body);
    expect(result.current.sync).toEqual({ kind: "problem", message: "Offline" });
  });
  it("saves a story development through the existing claim action without establishing it", async () => {
    const story = { order: 900, label: "After Session 8", precision: "relative" as const };
    actions.setClaimAction.mockImplementation(async input => ({ state: "ok", data: fixtureClaim(BELL_THREAD, input.claimKind, input.value, { id: asClaimId(input.claimId), truthState: "pencil", settled: null, story: input.story }) }));
    const { result } = renderHook(() => useDesk({ ...OBJECT_DESK, cards: [BELL_THREAD] }));
    let saved;
    await act(async () => { saved = await result.current.assert(BELL_THREAD.objectId, "development:new", "The bell sounds inland.", null, story); });
    expect(saved).toBe(true);
    expect(actions.setClaimAction).toHaveBeenCalledWith(expect.objectContaining({ story, claimKind: "development:new" }));
    expect(result.current.cards[0]!.claims.at(-1)?.truthState).toBe("pencil");
    expect(actions.settleTruthAction).not.toHaveBeenCalled();
  });
  it("keeps the version observed by a draft when external content arrives before Save", async () => {
    actions.editRepresentationAction.mockResolvedValue({ state: "conflict", current: [] });
    actions.editCardBodyAction.mockResolvedValue({ state: "conflict", current: [] });
    const { result } = renderHook(() => useDesk({ ...OBJECT_DESK, cards: [MARA] }));
    const incoming = { ...MARA, body: "An external revision", bodyVersion: 2, representation: { ...MARA.representation!, version: 2 } };
    act(() => result.current.absorbExternal({ kind: "cards", cards: [incoming] }));
    await act(async () => {
      expect(await result.current.editSheet(MARA.objectId, "Old draft", MARA.representation!.fields, 1)).toBe(false);
      expect(await result.current.saveBody(MARA.cardId, "Old prose draft", 1)).toBe(false);
    });
    expect(actions.editRepresentationAction).toHaveBeenCalledWith(expect.objectContaining({ observedVersion: 1 }));
    expect(actions.editCardBodyAction).toHaveBeenCalledWith(expect.objectContaining({ observedBodyVersion: 1 }));
    expect(result.current.cards[0]!.body).toBe("An external revision");
  });
  it("never drops a missing previewed assertion or establishes only part of the intent", async () => {
    const { result } = renderHook(() => useDesk({ ...OBJECT_DESK, cards: [MARA] }));
    let saved;
    await act(async () => { saved = await result.current.settle(MARA.objectId, { maturity: "ink", claims: [{ claimId: MARA.claims[0]!.id, truth: "ink" }, { claimId: asClaimId("removed-since-preview"), truth: "ink" }] }); });
    expect(saved).toBe(false);
    expect(actions.settleTruthAction).not.toHaveBeenCalled();
  });
  it("freezes settlement versions before earlier queued writes finish", async () => {
    let release!: (result: { state: "failed"; message: string }) => void;
    actions.editRepresentationAction.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
    actions.settleTruthAction.mockResolvedValue({ state: "conflict", current: [] });
    const original = { ...MARA, claims: [fixtureClaim(MARA, "status", "Alive", { truthState: "pencil" })] };
    const { result } = renderHook(() => useDesk({ ...OBJECT_DESK, cards: [original] }));
    let first!: Promise<boolean>;
    act(() => { first = result.current.editSheet(MARA.objectId, "Mara", MARA.representation!.fields); });
    await waitFor(() => expect(release).toBeTypeOf("function"));
    let settlement!: Promise<boolean>;
    act(() => { settlement = result.current.settle(MARA.objectId, { claims: [{ claimId: original.claims[0]!.id, truth: "ink" }] }); });
    act(() => result.current.absorbExternal({ kind: "cards", cards: [{ ...original, claims: [{ ...original.claims[0]!, value: "Missing", version: 2 }] }] }));
    await act(async () => { release({ state: "failed", message: "Earlier write refused" }); await first; await settlement; });
    expect(actions.settleTruthAction).toHaveBeenCalledWith(expect.objectContaining({ claims: [expect.objectContaining({ observedVersion: 1 })] }));
  });
});

describe("Canvas integration", () => {
  it("expands a placement without a domain write, preserves selection, and closes Focus to its origin", async () => {
    const { container } = render(<DeskSurface workspace={OBJECT_WORKSPACE} initial={OBJECT_DESK}/>);
    const mara = screen.getByRole("article", { name: "character: Mara Veyra" });
    const plane = mara.parentElement!;
    const transform = plane.style.transform;
    await userEvent.click(within(mara).getByRole("button", { name: "Expand card" }));
    expect(mara.getAttribute("data-disclosure")).toBe("expanded");
    expect(mara.getAttribute("data-selected")).toBe("true");
    expect(plane.style.transform).toBe(transform);
    expect(actions.moveCardsAction).not.toHaveBeenCalled();
    await userEvent.click(within(mara).getByRole("button", { name: "Open Focus" }));
    const focus = screen.getByRole("complementary", { name: "Character Focus" });
    expect(focus.getAttribute("data-entity-focus")).toBe("true");
    await userEvent.click(screen.getByRole("button", { name: "Close Focus" }));
    await waitFor(() => expect(screen.queryByRole("complementary", { name: "Character Focus" })).toBeNull());
    expect(plane.style.transform).toBe(transform);
    expect(mara.getAttribute("data-selected")).toBe("true");
    await waitFor(() => expect(document.activeElement).toBe(mara));
  });
});

describe("Focus inspection and recovery", () => {
  it("restores a failed notes draft and section through Back/Forward and truncates a branched trail", async () => {
    entityActions.saveEntityDocumentAction.mockResolvedValue({ state: "failed", message: "Offline" });
    render(<DeskSurface workspace={OBJECT_WORKSPACE} initial={OBJECT_DESK}/>);
    await userEvent.click(within(screen.getByRole("article", { name: "character: Mara Veyra" })).getByRole("button", { name: "Open Focus" }));
    let panel = within(screen.getByRole("complementary", { name: "Character Focus" }));
    expect(panel.queryByRole("button", { name: "Back in Focus" })).toBeNull();
    await userEvent.click(panel.getByRole("tab", { name: "Notes" }));
    await userEvent.click(panel.getByRole("button", { name: "Edit gm notes" }));
    const input = panel.getByRole("textbox", { name: "GM notes" });
    input.innerHTML = "<p>Keep the unopened letter secret.</p>";
    fireEvent.input(input);
    await waitFor(() => expect(entityActions.saveEntityDocumentAction).toHaveBeenCalled());
    expect(panel.getByRole("alert").textContent).toMatch(/draft|offline/i);
    await userEvent.click(within(screen.getByRole("article", { name: "place: Watcher’s Spire" })).getByRole("button", { name: "Open Focus" }));
    await userEvent.click(screen.getByRole("button", { name: "Back in Focus" }));
    panel = within(screen.getByRole("complementary", { name: "Character Focus" }));
    expect(panel.getByRole("textbox", { name: "GM notes" }).textContent).toContain("Keep the unopened letter secret.");
    expect(panel.getByRole("button", { name: "Forward in Focus" }).hasAttribute("disabled")).toBe(false);
    await userEvent.click(panel.getByRole("button", { name: "Forward in Focus" }));
    expect(screen.getByRole("complementary", { name: "Place Focus" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Back in Focus" }));
    await userEvent.click(within(screen.getByRole("article", { name: "source: Tide ledger, folio 9" })).getByRole("button", { name: "Open Focus" }));
    const forward = screen.queryByRole("button", { name: "Forward in Focus" });
    expect(!forward || forward.hasAttribute("disabled")).toBe(true);
  }, 15000);

  it("keeps an earlier failure visible through an unrelated success and clears it after its own successful save", async () => {
    actions.editCardBodyAction.mockResolvedValueOnce({ state: "failed", message: "Offline passage" }).mockResolvedValueOnce({ state: "ok", data: { ...MARA, body: "Recovered", bodyVersion: 2 } });
    actions.moveCardsAction.mockResolvedValue({ state: "ok", data: [{ ...WATCHERS_SPIRE, cardVersion: 2 }] });
    const { result } = renderHook(() => useDesk(OBJECT_DESK));
    await act(async () => { await result.current.saveBody(MARA.cardId, "Recovered"); });
    await act(async () => { result.current.commitMove([WATCHERS_SPIRE.cardId]); });
    expect(result.current.sync).toEqual({ kind: "problem", message: "Offline passage" });
    await act(async () => { expect(await result.current.saveBody(MARA.cardId, "Recovered")).toBe(true); });
    expect(result.current.sync).toEqual({ kind: "settled" });
  });

  it("retries an unsuccessful optimistic move without losing its local position", async () => {
    actions.moveCardsAction.mockResolvedValueOnce({ state: "failed", message: "Move interrupted" }).mockResolvedValueOnce({ state: "ok", data: [{ ...MARA, cardVersion: 2 }] });
    const { result } = renderHook(() => useDesk({ ...OBJECT_DESK, cards: [MARA] }));
    act(() => result.current.nudge([MARA.cardId], 50, 30));
    await act(async () => { result.current.commitMove([MARA.cardId]); });
    expect(result.current.sync.kind).toBe("problem");
    expect(result.current.canRetry).toBe(true);
    await act(async () => { result.current.retryFailed(); });
    expect(actions.moveCardsAction).toHaveBeenLastCalledWith(expect.objectContaining({ moves: [expect.objectContaining({ x: 50, y: 30 })] }));
    expect(result.current.cards[0]!.layout).toMatchObject({ x: 50, y: 30 });
    expect(result.current.sync.kind).toBe("settled");
  });
});
