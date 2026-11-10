import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, mocked, userEvent, within } from "storybook/test";
import { DeskSurface } from "@/components/desk/desk-surface";
import { OBJECT_DESK, OBJECT_WORKSPACE } from "@/components/world-objects/object-fixtures";
import { mockWorldOperations } from "@/components/world-objects/object-workspace.stories";
import { applyCollectionCommand } from "@/lib/desk/collections";
import * as actions from "@/app/actions";
import "../../app/globals.css";

const initial = { ...OBJECT_DESK, spatial: { version: 1, collections: [{ id: "ironshore-research", title: "Ironshore Coast", collapsed: false, cardIds: OBJECT_DESK.cards.map(card => card.cardId) }] } };
const meta = {
  title: "Desk/Spatial Collections", component: DeskSurface,
  parameters: { layout: "fullscreen", a11y: { test: "error" }, nextjs: { appDirectory: true } },
  args: { initial, workspace: OBJECT_WORKSPACE },
  beforeEach: () => {
    mockWorldOperations();
    let state = structuredClone(initial.spatial);
    let cards = structuredClone(OBJECT_DESK.cards);
    mocked(actions.changeCollectionAction).mockImplementation(async input => {
      state = applyCollectionCommand(state, input.command, OBJECT_DESK.cards) as typeof state;
      return { state: "ok", data: state };
    });
    mocked(actions.moveCollectionCardsAction).mockImplementation(async input => {
      if (!input.preserveMembership) state = applyCollectionCommand(state, { kind: "transfer", id: input.destinationId, cardIds: input.moves.map(move => move.cardId as typeof cards[number]["cardId"]) }, cards) as typeof state;
      const moved = input.moves.flatMap(move => { const card = cards.find(card => card.cardId === move.cardId); return card ? [{ ...card, layout: { ...card.layout, x: move.x, y: move.y }, cardVersion: card.cardVersion + 1 }] : []; });
      cards = cards.map(card => moved.find(updated => updated.cardId === card.cardId) ?? card);
      return { state: "ok", data: { cards: moved, spatial: state } };
    });
    mocked(actions.removeCollectionCardsAction).mockImplementation(async input => {
      const removed = input.cardIds as typeof cards[number]["cardId"][];
      cards = cards.filter(card => !removed.includes(card.cardId));
      state = { version: state.version + 1, collections: state.collections.map(group => ({ ...group, cardIds: group.cardIds.filter(id => !removed.includes(id)) })).filter(group => group.cardIds.length) };
      return { state: "ok", data: { removed, spatial: state } };
    });
  }
} satisfies Meta<typeof DeskSurface>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ResearchCluster: Story = {};
export const LayeredStack: Story = { args: { initial: { ...initial, spatial: { version: 1, collections: [{ ...initial.spatial.collections[0]!, collapsed: true, cardIds: [...OBJECT_DESK.cards.filter(card => card.representation?.kind !== "place").map(card => card.cardId), OBJECT_DESK.cards.find(card => card.representation?.kind === "place")!.cardId] }] } } } };
export const StackAndReturn: Story = { play: async ({ canvasElement }) => {
  const c = within(canvasElement);
  const page = within(document.body);
  await userEvent.click(c.getByRole("button", { name: "Stack Ironshore Coast" }));
  await expect(c.getByRole("button", { name: "Expand Ironshore Coast" })).toHaveAttribute("aria-expanded", "false");
  await userEvent.click(c.getByRole("button", { name: "Browse Ironshore Coast" }));
  await userEvent.click(page.getByRole("menuitem", { name: /Mara Veyra character/ }));
  await expect(c.getByRole("article", { name: "character: Mara Veyra" })).toHaveAttribute("data-selected", "true");
  await userEvent.click(c.getByRole("button", { name: "Expand Ironshore Coast" }));
  await expect(c.getByRole("button", { name: "Stack Ironshore Coast" })).toHaveAttribute("aria-expanded", "true");
} };
