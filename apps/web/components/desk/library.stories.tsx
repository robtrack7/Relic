import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { KNOWLEDGE_FIXTURES } from "@/components/world-objects/knowledge.fixtures";
import { OBJECT_DESK } from "@/components/world-objects/object-fixtures";
import { ENTITY_FIXTURES, ENTITY_STORY_WORLD } from "@/components/entities/entity-fixtures";
import { configureEntityStoryActions } from "@/components/entities/entity-story-harness";
import { cardRef, cardTitle } from "@/lib/world/model";

import type { DeskStore } from "./use-desk";
import type { SurfaceControlsRef } from "./surface-controls";
import { Library } from "./library";
import type { ObjectRef, WorldEntry, WorldObjectId } from "@/lib/world/model";

const makeEntry = (label: string, objectId: string, cardHere: WorldEntry["cardHere"] = null): WorldEntry => ({
  ref: { objectId: objectId as WorldEntry["ref"]["objectId"], label, kind: "character" },
  maturity: "pencil",
  lifecycle: "active",
  kinds: ["character"],
  snippet: `${label} keeps a careful record of the old harbor.`,
  updatedAt: "2026-11-05T00:00:00.000Z",
  cardHere
});

const entries = [
  makeEntry("Mara Veyra", "11111111-1111-4111-8111-111111111111"),
  makeEntry("Watcher’s Spire", "22222222-2222-4222-8222-222222222222", "card-watcher" as WorldEntry["cardHere"]),
  { ...makeEntry("The Ironshore Incident", "33333333-3333-4333-8333-333333333333"), lifecycle: "archived" as const }
];

const controls: SurfaceControlsRef = {
  current: { landing: () => ({ x: 120, y: 120 }), reveal: () => undefined }
};
const onCreateEntity = fn();

const makeStore = (search: DeskStore["search"]): DeskStore => ({
  search,
  inspectObject: async (objectId: WorldObjectId) => ({ ...OBJECT_DESK, cards: [KNOWLEDGE_FIXTURES.find(card => card.objectId === objectId) ?? KNOWLEDGE_FIXTURES[0]!] }),
  absorbObjects: () => undefined,
  pullIn: async (refs: readonly ObjectRef[]) => refs.map((ref) => `${ref.objectId}-card` as never)
} as unknown as DeskStore);

const meta = {
  title: "Desk/Library",
  component: Library,
  parameters: { layout: "fullscreen", a11y: { test: "todo" } },
  beforeEach: () => { configureEntityStoryActions(ENTITY_FIXTURES); },
  args: {
    store: makeStore(async ({ query }) => query ? entries.filter((entry) => entry.ref.label.toLowerCase().includes(query.toLowerCase())) : entries),
    worldId: String(ENTITY_STORY_WORLD),
    controls,
    compositionName: "Ironshore Coast",
    onCreateEntity,
    onArrive: () => undefined,
    onClose: () => undefined
  }
} satisfies Meta<typeof Library>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Populated: Story = {};

const knowledgeEntries: readonly WorldEntry[] = KNOWLEDGE_FIXTURES.map(card => ({
  ref: cardRef(card), kinds: card.representation ? [card.representation.kind] : [],
  maturity: card.maturity, lifecycle: "active", snippet: card.body, updatedAt: "2026-11-06T12:00:00Z", cardHere: null
}));

export const LivingKnowledge: Story = {
  args: { store: makeStore(async ({ query }) => knowledgeEntries.filter(entry => !query || `${entry.ref.label} ${entry.snippet}`.toLowerCase().includes(query.toLowerCase()))) }
};

export const CompactDossier: Story = {
  ...LivingKnowledge,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const row = (await canvas.findAllByRole("listitem")).find(row => row.textContent?.includes(cardTitle(KNOWLEDGE_FIXTURES[0]!)))!;
    await userEvent.click(within(row).getByRole("button", { name: "Inspect" }));
    await expect(canvas.findByRole("complementary", { name: "Character Focus" })).resolves.toBeTruthy();
  }
};

export const FullFocusReturn: Story = {
  ...LivingKnowledge,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const row = (await canvas.findAllByRole("listitem")).find(row => row.textContent?.includes(cardTitle(KNOWLEDGE_FIXTURES[0]!)))!;
    await userEvent.click(within(row).getByRole("button", { name: "Inspect" }));
    await expect(canvas.findByRole("complementary", { name: "Character Focus" })).resolves.toBeTruthy();
    await userEvent.click(within(row).getByRole("button", { name: "Open in Builder" }));
    await expect(canvas.findByRole("region", { name: /Character Entity Builder/i })).resolves.toBeTruthy();
  }
};

export const CreateEntity: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Create entity" }));
    await expect(onCreateEntity).toHaveBeenCalled();
  }
};

export const SearchFailure: Story = {
  args: {
    store: makeStore(async () => { throw new Error("offline"); })
  }
};
