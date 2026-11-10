import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, mocked, userEvent, waitFor, within } from "storybook/test";
import * as actions from "@/app/actions";
import * as entityActions from "@/app/entity-actions";
import { DeskSurface } from "@/components/desk/desk-surface";
import { asCardId, asClaimId, asRepresentationId, asWorldObjectId, type DeskCard, type DeskView, type Maturity, type TruthState, type RepresentationKind } from "@/lib/world/model";
import { OBJECT_DESK, OBJECT_WORKSPACE, MARA, THIRD_TOLL } from "./object-fixtures";
import { observeObject, previewObjectProposal, type CanvasObjectProposal, type ObjectProposal } from "@/lib/world/object-proposal";
import { applyCollectionCommand, EMPTY_SPATIAL } from "@/lib/desk/collections";
import { legacyDocument, type EntitySnapshot } from "@/lib/world/entity-document";
import { configureEntityStoryActions } from "@/components/entities/entity-story-harness";

export function mockWorldOperations(initial: DeskView = OBJECT_DESK) {
  let cards: readonly DeskCard[] = structuredClone(initial.cards);
  let spatial = structuredClone(initial.spatial ?? EMPTY_SPATIAL);
  configureEntityStoryActions([...initial.cards, THIRD_TOLL].map(card => ({ ...card, worldId: initial.worldId, lifecycle: "active", document: legacyDocument(card) } as EntitySnapshot)));
  mocked(actions.changeCollectionAction).mockImplementation(async input => {
    spatial = applyCollectionCommand(spatial, input.command, cards);
    return { state: "ok", data: spatial };
  });
  mocked(actions.captureCardAction).mockImplementation(async input => {
    const existing = cards.find(card => card.cardId === input.cardId);
    if (existing) return { state: "ok", data: existing };
    const card: DeskCard = {
      cardId: asCardId(input.cardId), objectId: asWorldObjectId(input.objectId),
      layout: { x: input.x, y: input.y, width: input.width, height: input.height }, z: cards.length + 1,
      body: input.body, maturity: "pencil", settled: null, written: null, cardVersion: 1, bodyVersion: 1,
      representation: input.initialRepresentation ? { id: asRepresentationId(input.initialRepresentation.representationId), objectId: asWorldObjectId(input.objectId), kind: input.initialRepresentation.kind as RepresentationKind, label: input.initialRepresentation.label ?? "", fields: {}, templateId: null, version: 1 } : null,
      claims: [], links: []
    };
    cards = [...cards, card];
    return { state: "ok", data: card };
  });
  mocked(actions.editRepresentationAction).mockImplementation(async input => {
    const card = cards.find(card => card.representation?.id === input.representationId);
    if (!card?.representation) return { state: "missing" };
    const representation = { ...card.representation, label: input.label, fields: input.fields as Record<string, string | number>, version: card.representation.version + 1 };
    cards = cards.map(item => item.objectId === card.objectId ? { ...item, representation } : item);
    return { state: "ok", data: representation };
  });
  mocked(actions.editCardBodyAction).mockImplementation(async input => {
    const card = cards.find(card => card.cardId === input.cardId);
    if (!card) return { state: "missing" };
    const updated = { ...card, body: input.body, bodyVersion: card.bodyVersion + 1 };
    cards = cards.map(item => item.cardId === card.cardId ? updated : item);
    return { state: "ok", data: updated };
  });
  mocked(actions.settleTruthAction).mockImplementation(async input => {
    const card = cards.find(card => card.objectId === input.objectId);
    if (!card) return { state: "missing" };
    const settled = { by: "gm" as const, at: new Date().toISOString() };
    const maturity = (input.maturity ?? card.maturity) as Maturity;
    const claims = (input.claims ?? []).flatMap(wanted => { const known = card.claims.find(claim => claim.id === wanted.claimId); return known ? [{ ...known, truthState: wanted.truth as TruthState, settled, version: known.version + 1 }] : []; });
    cards = cards.map(item => item.objectId === card.objectId ? { ...item, maturity, claims: item.claims.map(claim => claims.find(updated => updated.id === claim.id) ?? claim) } : item);
    return { state: "ok", data: { objectId: card.objectId, maturity, settled, claims } };
  });
  const moveCards = (moves: Parameters<typeof actions.moveCardsAction>[0]['moves']) => {
    const moved = moves.flatMap(move => { const card = cards.find(card => card.cardId === move.cardId); return card ? [{ ...card, layout: { ...card.layout, x: move.x, y: move.y, width: move.width ?? card.layout.width, height: move.height ?? card.layout.height }, presentation: move.tint === undefined ? card.presentation : { tint: move.tint as NonNullable<DeskCard['presentation']>['tint'] }, cardVersion: card.cardVersion + 1 }] : []; });
    cards = cards.map(card => moved.find(item => item.cardId === card.cardId) ?? card);
    return moved;
  };
  mocked(actions.moveCardsAction).mockImplementation(async input => ({ state: "ok", data: moveCards(input.moves) }));
  mocked(actions.restoreCompositionAction).mockImplementation(async input => {
    spatial = { ...input.spatial, version: spatial.version + 1 };
    return { state: 'ok', data: { cards: moveCards(input.moves), spatial } };
  });
  mocked(actions.moveCollectionCardsAction).mockImplementation(async input => {
    if (!input.preserveMembership) spatial = applyCollectionCommand(spatial, { kind: 'transfer', id: input.destinationId, cardIds: input.moves.map(move => asCardId(move.cardId)) }, cards);
    else spatial = { version: spatial.version + 1, collections: spatial.collections.map(group => {
      const first = input.moves.find(move => move.cardId === group.cardIds[0]);
      const previous = cards.find(card => card.cardId === group.cardIds[0]);
      return group.anchor && first && previous && group.cardIds.every(id => input.moves.some(move => move.cardId === id)) ? { ...group, anchor: { x: group.anchor.x + first.x - previous.layout.x, y: group.anchor.y + first.y - previous.layout.y } } : group;
    }) };
    return { state: 'ok', data: { cards: moveCards(input.moves), spatial } };
  });
  mocked(actions.searchWorldAction).mockResolvedValue({ state: "ok", data: [] });
  mocked(actions.readCompositionObjectsAction).mockImplementation(async () => ({ state: "ok", data: cards }));
  mocked(actions.inspectObjectAction).mockImplementation(async input => {
    const found = [...cards, THIRD_TOLL].find(card => card.objectId === input.objectId);
    return found ? { state: "ok", data: { ...initial, cards: [found], spatial: EMPTY_SPATIAL } } : { state: "missing" };
  });
  mocked(actions.referenceObjectsAction).mockImplementation(async input => ({ state: "ok", data: input.placements.flatMap(placement => {
    const found = [...cards, THIRD_TOLL].find(card => card.objectId === placement.objectId);
    return found ? [{ ...found, cardId: placement.cardId as DeskCard["cardId"], layout: { x: placement.x, y: placement.y, width: placement.width, height: placement.height } }] : [];
  }) }));
  mocked(actions.representObjectAction).mockImplementation(async input => ({ state: "ok", data: { id: asRepresentationId(input.representationId), objectId: asWorldObjectId(input.objectId), kind: input.kind as RepresentationKind, label: input.label, fields: {}, templateId: null, version: 1 } }));
}

const meta = { title: "World Objects/Workspace", component: DeskSurface, excludeStories: ["mockWorldOperations"], parameters: { layout: "fullscreen", a11y: { test: "todo" }, nextjs: { appDirectory: true } }, args: { initial: OBJECT_DESK, workspace: OBJECT_WORKSPACE }, beforeEach: ({ args }) => mockWorldOperations(args.initial) } satisfies Meta<typeof DeskSurface>;
export default meta;
type Story = StoryObj<typeof meta>;
export const LivingWorld: Story = {};
export const ContextualEditing: Story = { args: { initial: { ...OBJECT_DESK, worldId: "story-contextual-writing" as DeskView["worldId"] } }, play: async ({ canvasElement }) => {
  const c = within(canvasElement);
  const card = c.getByRole("article", { name: "character: Mara Veyra" });
  await userEvent.click(within(card).getByRole("button", { name: "Open Focus" }));
  await waitFor(() => expect(c.getByRole("complementary", { name: /Character Focus/i })).toBeVisible());
  const panel = within(c.getByRole("complementary", { name: /Character Focus/i }));
  const reading = panel.getByLabelText(/Narrative; press Enter to write/);
  reading.focus();
  await userEvent.keyboard("{Enter}");
  const editor = await panel.findByRole("textbox", { name: "Narrative" });
  await userEvent.clear(editor);
  await userEvent.type(editor, "Mara returns with an unopened letter from the coast.");
  await userEvent.keyboard("{Escape}");
  await expect(panel.getByText("Mara returns with an unopened letter from the coast.")).toBeVisible();
} };
export const FailedSaveKeepsDraft: Story = { args: { initial: { ...OBJECT_DESK, worldId: "story-failed-writing" as DeskView["worldId"] } }, beforeEach: () => { mocked(entityActions.saveEntityDocumentAction).mockResolvedValue({ state: "failed", message: "The connection was interrupted." }); }, play: async ({ canvasElement }) => {
  const c = within(canvasElement);
  await userEvent.click(within(c.getByRole("article", { name: "character: Mara Veyra" })).getByRole("button", { name: "Open Focus" }));
  const panel = within(c.getByRole("complementary", { name: /Character Focus/i }));
  const reading = panel.getByLabelText(/Narrative; press Enter to write/);
  reading.focus();
  await userEvent.keyboard("{Enter}");
  const editor = await panel.findByRole("textbox", { name: "Narrative" });
  await userEvent.clear(editor);
  await userEvent.type(editor, "An unfinished passage worth keeping.");
  await userEvent.keyboard("{Escape}");
  await expect(within(c.getByRole("complementary", { name: /Character Focus/i })).getByRole("status")).toHaveTextContent("Draft kept");
  await expect(c.getByRole("alert")).toBeVisible();
  await expect(panel.getByText("An unfinished passage worth keeping.")).toBeVisible();
} };
export const ThreadDevelopment: Story = { play: async ({ canvasElement }) => {
  const c = within(canvasElement);
  await userEvent.click(within(c.getByRole("article", { name: "thread: The Bell Below the Tide" })).getByRole("button", { name: "Open Focus" }));
  const panel = within(c.getByRole("complementary", { name: /Thread Focus/i }));
  await userEvent.click(panel.getByRole("tab", { name: "Developments" }));
  await userEvent.click(panel.getByRole("button", { name: "Add development" }));
  await userEvent.type(panel.getByLabelText("What changed?"), "The same bell is heard on the inland road.");
  await userEvent.type(panel.getByLabelText("Story position"), "After leaving the harbour");
  await userEvent.click(panel.getByRole("button", { name: "Add development" }));
  await waitFor(() => expect(panel.getByText("The same bell is heard on the inland road.")).toBeVisible());
  await waitFor(() => expect(panel.getAllByText(/Pending interpretation/).length).toBeGreaterThan(0));
} };

const statusProposal: ObjectProposal = {
  id: "goal05-status-proposal", objectId: MARA.objectId,
  scope: { worldId: OBJECT_DESK.worldId, compositionId: OBJECT_DESK.compositionId }, context: { kind: "now" }, observed: observeObject(MARA),
  provenance: { kind: "librarian", authoredBy: "librarian", recordedAt: "2026-08-18T12:00:00Z" },
  reason: "A possible reading of the harbour notes. Review the proposed status where it belongs.", change: { kind: "claim", key: "status", value: "At sea" }
};
function ProposalWorkspace({ arrangement = false }: { arrangement?: boolean }) {
  const original = OBJECT_DESK.cards.find(card => card.objectId === MARA.objectId)!;
  const proposal: ObjectProposal = arrangement ? { ...statusProposal, id: "goal05-arrangement-proposal", reason: "Bring Mara closer to the spire while keeping the rest of the Board in place.", change: { kind: "placement", value: "Place Mara beside Watcher’s Spire.", layout: { ...original.layout, x: -420, y: -240 } } } : statusProposal;
  const [proposals, setProposals] = useState<readonly CanvasObjectProposal[]>([{ card: original, proposal }]);
  return <DeskSurface initial={OBJECT_DESK} workspace={OBJECT_WORKSPACE} proposals={proposals} onDismissProposal={() => setProposals([])} onApplyProposal={async accepted => ({ cards: [previewObjectProposal(original, accepted)] })}/>;
}
export const ContextualProposal: Story = { render: () => <ProposalWorkspace/>, play: async ({ canvasElement }) => {
  const c = within(canvasElement);
  const proposal = within(c.getByRole("region", { name: "Object proposal" }));
  await userEvent.click(proposal.getByRole("button", { name: "Edit proposal" }));
  await userEvent.clear(proposal.getByRole("textbox"));
  await userEvent.type(proposal.getByRole("textbox"), "Sailing for Greyhaven");
  await userEvent.click(proposal.getByRole("button", { name: "Apply" }));
  await expect(c.queryByRole("region", { name: "Object proposal" })).toBeNull();
  const card = within(c.getByRole("article", { name: "character: Mara Veyra" }));
} };
export const BoardArrangementProposal: Story = { render: () => <ProposalWorkspace arrangement/> };

export const CharacterFocus: Story = { play: async ({ canvasElement }) => {
  const c = within(canvasElement);
  await userEvent.click(within(c.getByRole("article", { name: "character: Mara Veyra" })).getByRole("button", { name: "Open Focus" }));
  await waitFor(() => expect(c.getByRole("complementary", { name: /Character Focus/i })).toBeVisible());
  await Promise.all(canvasElement.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {})));
} };
export const FocusWithLibrarian: Story = { play: async context => {
  await CharacterFocus.play!(context);
  await userEvent.click(within(context.canvasElement).getByRole("button", { name: "Open Librarian carriage" }));
} };
export const FocusMechanics: Story = { play: async context => {
  await CharacterFocus.play!(context);
  await userEvent.click(within(context.canvasElement).getByRole("tab", { name: "Mechanics" }));
} };
export const FocusNavigation: Story = { play: async context => {
  await CharacterFocus.play!(context);
  const c = within(context.canvasElement);
  let panel = within(c.getByRole("complementary", { name: /Character Focus/i }));
  await userEvent.click(panel.getByRole("tab", { name: "Relationships" }));
  await userEvent.click(within(panel.getByRole("region", { name: "Connections" })).getByRole("button", { name: /Watcher’s Spire/ }));
  await waitFor(() => expect(c.getByRole("complementary", { name: /Place Focus/i })).toBeVisible());
  await userEvent.click(c.getByRole("button", { name: "Back in Focus" }));
  panel = within(c.getByRole("complementary", { name: /Character Focus/i }));
  await expect(panel.getByRole("button", { name: "Forward in Focus" })).toBeEnabled();
} };

export const FollowAnEventReference: Story = { play: async ({ canvasElement }) => {
  const c = within(canvasElement);
  await userEvent.click(within(c.getByRole("article", { name: "thread: The Bell Below the Tide" })).getByRole("button", { name: "Open Focus" }));
  await userEvent.click(c.getByRole("tab", { name: "Relationships" }));
  await userEvent.click(within(c.getByRole("region", { name: "Connections" })).getByRole("button", { name: /^Follow .*The Third Toll/ }));
  await waitFor(() => expect(c.getByRole("complementary", { name: /Event Focus/i })).toBeVisible());
  await userEvent.click(within(c.getByRole("complementary", { name: /Event Focus/i })).getByRole("button", { name: "Back in Focus" }));
  await waitFor(() => expect(c.getByRole("complementary", { name: /Thread Focus/i })).toBeVisible());
} };
