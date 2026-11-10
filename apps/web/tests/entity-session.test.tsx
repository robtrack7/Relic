import { useSyncExternalStore } from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { richText, type EntityDocument, type EntitySnapshot, type MechanicsProfile } from "@/lib/world/entity-document";
import { ENTITY_FIXTURE_GROUPS, cloneEntityFixture, scopedEntityFixture } from "@/components/entities/entity-fixtures";

const mocks = vi.hoisted(() => ({
  load: vi.fn(),
  saveDocument: vi.fn(),
  saveIdentity: vi.fn(),
  saveMechanics: vi.fn(),
  search: vi.fn(),
  setClaim: vi.fn(),
  removeClaim: vi.fn(),
}));

vi.mock("@/app/entity-actions", () => ({
  loadEntityAction: mocks.load,
  saveEntityDocumentAction: mocks.saveDocument,
  saveEntityIdentityAction: mocks.saveIdentity,
  saveEntityMechanicsAction: mocks.saveMechanics,
}));
vi.mock("@/app/actions", () => ({ searchWorldAction: mocks.search, setClaimAction: mocks.setClaim, removeClaimAction: mocks.removeClaim }));

import { EntitySession } from "@/components/entities/entity-session";
import { EntityBuilder } from "@/components/entities/entity-builder";
import { EntityFocus } from "@/components/entities/entity-focus";

const seed = ENTITY_FIXTURE_GROUPS.character[0]!;

function sessionFor(scope: string) {
  const fixture = scopedEntityFixture(seed, scope);
  const session = new EntitySession(String(fixture.worldId), String(fixture.objectId), fixture);
  const server = cloneEntityFixture(fixture);
  mocks.load.mockResolvedValue({ state: "ok", data: server });
  return { fixture, server, session };
}

function documentWithText(entity: EntitySnapshot, text: string): EntityDocument {
  return { ...entity.document, blocks: entity.document.blocks.map(block => block.kind === "text" && block.role === "narrative" ? { ...block, content: richText(text) } : block) };
}

async function settleFlight() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("EntitySession draft lifecycle", () => {
  beforeEach(() => {
    vi.useRealTimers();
    mocks.load.mockReset();
    mocks.saveDocument.mockReset();
    mocks.saveIdentity.mockReset();
    mocks.saveMechanics.mockReset();
    mocks.search.mockReset();
  });

  it("debounces ordinary document writes and saves the latest document", async () => {
    vi.useFakeTimers();
    const { fixture, server, session } = sessionFor("debounce");
    const saved = cloneEntityFixture(server, { document: { ...server.document, version: 1 } });
    mocks.saveDocument.mockResolvedValue({ state: "ok", data: saved });
    await session.load();
    const draft = documentWithText(fixture, "A revised narrative waiting for the next table.");
    session.setDocument(draft);
    await vi.advanceTimersByTimeAsync(649);
    expect(mocks.saveDocument).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    await settleFlight();
    expect(mocks.saveDocument).toHaveBeenCalledTimes(1);
    expect(mocks.saveDocument.mock.calls[0]?.[0].document).toEqual(draft);
    expect(session.getSnapshot().status).toBe("saved");
  });

  it("keeps an edit made while a save is in flight and marks it for the next write", async () => {
    const { fixture, server, session } = sessionFor("flight");
    let resolveSave: ((result: unknown) => void) | undefined;
    mocks.saveDocument.mockImplementation(() => new Promise(resolve => { resolveSave = resolve; }));
    await session.load();
    const firstDraft = documentWithText(fixture, "The first draft is already on its way.");
    const secondDraft = documentWithText(fixture, "The second draft arrived before the first one returned.");
    session.setDocument(firstDraft);
    const flight = session.flush();
    await settleFlight();
    session.setDocument(secondDraft);
    resolveSave?.({ state: "ok", data: cloneEntityFixture(server, { document: { ...server.document, version: 1 } }) });
    await flight;
    await settleFlight();
    expect(session.getSnapshot().status).toBe("unsaved");
    expect(session.getSnapshot().entity?.document).toEqual(secondDraft);
  });

  it("keeps the local draft after a failed save and allows an explicit retry", async () => {
    const { fixture, server, session } = sessionFor("failure");
    const draft = documentWithText(fixture, "This prose must remain available while the network is down.");
    mocks.saveDocument.mockResolvedValueOnce({ state: "failed", message: "Offline in the test harness." });
    await session.load();
    session.setDocument(draft);
    await session.flush();
    expect(session.getSnapshot().status).toBe("error");
    expect(session.getSnapshot().entity?.document).toEqual(draft);
    mocks.saveDocument.mockResolvedValueOnce({ state: "ok", data: cloneEntityFixture(server, { document: { ...server.document, version: 1 } }) });
    await session.flush();
    expect(session.getSnapshot().status).toBe("saved");
  });

  it("retains a local draft on conflict and exposes both recovery choices", async () => {
    const { fixture, server, session } = sessionFor("conflict");
    const draft = documentWithText(fixture, "My local account of the bell is still in this draft.");
    const remote = cloneEntityFixture(server, { document: documentWithText(server, "A newer saved account from another window."), });
    mocks.load.mockReset();
    mocks.load.mockResolvedValueOnce({ state: "ok", data: server }).mockResolvedValue({ state: "ok", data: remote });
    mocks.saveDocument.mockResolvedValue({ state: "conflict", current: remote });
    await session.load();
    session.setDocument(draft);
    await session.flush();
    expect(session.getSnapshot().status).toBe("conflict");
    expect(session.getSnapshot().entity?.document).toEqual(draft);
    expect(session.getSnapshot().remote?.document).toEqual(remote.document);
    session.useSavedVersion();
    expect(session.getSnapshot().status).toBe("saved");
    expect(session.getSnapshot().entity?.document).toEqual(remote.document);
  });

  it("keeps identity and mechanics drafts together when the first consequential save fails", async () => {
    const { fixture, server, session } = sessionFor("identity-mechanics");
    const profile = fixture.representation?.mechanics as MechanicsProfile;
    const mechanics: MechanicsProfile = {
      ...profile,
      fields: profile.fields.map(field => field.id === "dex" ? { ...field, value: 18 } : field),
    };
    const identitySave = cloneEntityFixture(server, {
      representation: { ...server.representation!, label: "Mara Veyra (revised)", version: server.representation!.version + 1 },
    });
    const mechanicsSave = cloneEntityFixture(identitySave, {
      representation: { ...identitySave.representation!, mechanics, version: identitySave.representation!.version + 1 },
    });
    mocks.saveIdentity.mockResolvedValueOnce({ state: "failed", message: "Identity service unavailable." }).mockResolvedValueOnce({ state: "ok", data: identitySave });
    mocks.saveMechanics.mockResolvedValueOnce({ state: "ok", data: mechanicsSave });
    await session.load();
    session.setIdentityDraft("Mara Veyra (revised)");
    session.setMechanicsDraft(mechanics);
    await session.flush();
    expect(session.getSnapshot().status).toBe("error");
    expect(session.getSnapshot().entity?.representation?.label).toBe("Mara Veyra (revised)");
    expect(session.getSnapshot().entity?.representation?.mechanics).toEqual(mechanics);

    await session.retry();
    expect(mocks.saveIdentity).toHaveBeenCalledTimes(2);
    expect(mocks.saveMechanics).toHaveBeenCalledTimes(1);
    expect(session.getSnapshot().status).toBe("saved");
    expect(session.getSnapshot().entity?.representation?.mechanics).toEqual(mechanics);
  });

  it("does not send previewed mechanics fields through a name-only identity save", async () => {
    const { fixture, server, session } = sessionFor("mechanics-after-identity");
    const profile = fixture.representation?.mechanics as MechanicsProfile;
    const mechanics: MechanicsProfile = { ...profile, fields: profile.fields.map(field => field.id === "dex" ? { ...field, value: 18 } : field) };
    const identityAck = cloneEntityFixture(server, { representation: { ...server.representation!, label: "Mara Veyra (revised)", version: server.representation!.version + 1 } });
    mocks.saveIdentity.mockResolvedValue({ state: "ok", data: identityAck });
    mocks.saveMechanics.mockResolvedValue({ state: "failed", message: "Mechanics service unavailable." });
    await session.load();
    session.setMechanicsDraft(mechanics);
    session.setIdentityDraft("Mara Veyra (revised)");
    await session.flush();
    expect(mocks.saveIdentity.mock.calls[0]?.[0].fields).toEqual({});
    expect(session.getSnapshot().status).toBe("error");
    expect(session.getSnapshot().entity?.representation?.mechanics).toEqual(mechanics);
  });

  it("merges sequential identity field patches before the debounced save", async () => {
    const { server, session } = sessionFor("identity-patches");
    const identityAck = cloneEntityFixture(server, { representation: { ...server.representation!, label: "Mara Veyra", version: server.representation!.version + 1, fields: { ...server.representation!.fields, first: "one", second: "two" } } });
    mocks.saveIdentity.mockResolvedValue({ state: "ok", data: identityAck });
    await session.load();
    session.setIdentityDraft("Mara Veyra", { first: "one" });
    session.setIdentityDraft("Mara Veyra", { second: "two" });
    await session.flush();
    expect(mocks.saveIdentity.mock.calls[0]?.[0].fields).toEqual({ first: "one", second: "two" });
    expect(session.getSnapshot().status).toBe("saved");
  });
});

function LiveBuilder({ session, onClose = () => {} }: { session: EntitySession; onClose?: () => void }) {
  const { entity } = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  return entity ? <EntityBuilder entity={entity} session={session} onClose={onClose} onFollow={() => {}}/> : null;
}

function LiveFocus({ session }: { session: EntitySession }) {
  const { entity } = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
  return entity ? <EntityFocus entity={entity} session={session} onPageChange={() => {}} onBuilder={() => {}} onClose={() => {}} onFollow={() => {}}/> : null;
}

describe("Focus Overview", () => {
  afterEach(cleanup);

  it("puts what is true now and the table's numbers before the writing", async () => {
    const { session } = sessionFor("focus-overview");
    await session.load();
    const { container } = render(<LiveFocus session={session}/>);
    const facts = container.querySelector("[data-key-facts]")!;
    const firstWriting = container.querySelector("[data-block-id]")!;
    expect(facts).toBeTruthy();
    expect(facts.compareDocumentPosition(firstWriting) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(facts as HTMLElement).getAllByRole("term").length).toBeGreaterThan(0);
    expect(within(facts as HTMLElement).getByLabelText("Vitals")).toBeTruthy();
  });

  it("does not repeat a Source's excerpt or full record on Overview", async () => {
    const source = ENTITY_FIXTURE_GROUPS.source[0]!;
    const fixture = scopedEntityFixture(source, "focus-source");
    const session = new EntitySession(String(fixture.worldId), String(fixture.objectId), fixture);
    mocks.load.mockResolvedValue({ state: "ok", data: cloneEntityFixture(fixture) });
    await session.load();
    const { container } = render(<LiveFocus session={session}/>);
    const facts = container.querySelector("[data-key-facts]") as HTMLElement;
    expect(within(facts).queryByLabelText("Excerpt")).toBeNull();
    expect(within(facts).getByText(/not automatically established truth/)).toBeTruthy();
    expect(screen.queryAllByText(/not automatically established truth/)).toHaveLength(1);
  });
});

describe("Entity Builder manuscript", () => {
  afterEach(cleanup);

  it("writes in place: prose is editable without a mode switch and details sit under the title", async () => {
    const { session } = sessionFor("builder-manuscript");
    await session.load();
    render(<LiveBuilder session={session}/>);
    const builder = screen.getByRole("region", { name: /Entity Builder/ });
    expect(await within(builder).findByRole("textbox", { name: "Narrative" })).toBeTruthy();
    expect(within(builder).queryByText("Entity Builder")).toBeNull();
    expect(within(builder).queryByText(/Esc to leave editing/)).toBeNull();
    expect(within(builder).getByRole("textbox", { name: "Pronouns" })).toBeTruthy();
    expect(within(builder).queryByRole("textbox", { name: /Section title: Details/ })).toBeNull();
  });

  it("reorders sections from the grip by keyboard through the shared document operation", async () => {
    const { session } = sessionFor("builder-reorder");
    await session.load();
    render(<LiveBuilder session={session}/>);
    const headings = () => screen.getAllByRole("textbox", { name: /^Section title:/ }).map(input => (input as HTMLInputElement).value);
    const [first, second] = headings();
    fireEvent.keyDown(document.querySelectorAll("[data-block-grip]")[1]!, { key: "ArrowUp" });
    expect(headings().slice(0, 2)).toEqual([second, first]);
    expect(session.getSnapshot().status).toBe("unsaved");
    expect(screen.getByText(`${second} moved to position 1 of ${headings().length}`)).toBeTruthy();
  });

  it("adds a section after the current one and moves focus to its heading", async () => {
    const { session } = sessionFor("builder-add");
    await session.load();
    render(<LiveBuilder session={session}/>);
    fireEvent.click(screen.getByRole("button", { name: "Add a section" }));
    fireEvent.click(within(screen.getByRole("group", { name: "Sections" })).getByRole("button", { name: "Goals & motives" }));
    const heading = await screen.findByRole("textbox", { name: "Section title: Goals & motives" });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    const blocks = session.getSnapshot().entity!.document.blocks;
    expect(blocks.at(-1)).toMatchObject({ kind: "text", role: "goals", title: "Goals & motives" });
  });

  it("leaves the text on the first Escape and closes on the second", async () => {
    const { session } = sessionFor("builder-escape");
    await session.load();
    const onClose = vi.fn();
    render(<LiveBuilder session={session} onClose={onClose}/>);
    const editor = await screen.findByRole("textbox", { name: "Narrative" });
    fireEvent.keyDown(editor, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    await waitFor(() => expect((document.activeElement as HTMLElement).getAttribute("aria-label")).toBe("Move Narrative"));
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
