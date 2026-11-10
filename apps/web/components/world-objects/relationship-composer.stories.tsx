import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import type { DeskStore } from "@/components/desk/use-desk";
import { asCardId, asClaimId, asRepresentationId, asWorldObjectId, type DeskCard, type Link } from "@/lib/world/model";
import { RelationshipComposer } from "./relationship-composer";

const subject = asWorldObjectId("story-composer-subject");
const target = asWorldObjectId("story-composer-target");
const claimId = asClaimId("story-composer-claim");
const card: DeskCard = {
  cardId: asCardId("story-composer-card"), objectId: subject,
  layout: { x: 0, y: 0, width: 360, height: 280 }, z: 1, body: "A harbour envoy.",
  maturity: "pencil", settled: null, written: null, cardVersion: 1, bodyVersion: 1,
  representation: { id: asRepresentationId("story-composer-representation"), objectId: subject, kind: "character", label: "Mara Veyra", fields: {}, templateId: null, version: 1 },
  claims: [{ id: claimId, subjectId: subject, claimKind: "knows", value: "Watcher’s Spire", objectValue: target, truthState: "pencil", provenance: { kind: "gm_assertion", authoredBy: "gm", recordedAt: "2026-08-18T12:00:00Z" }, settled: null, story: { order: null, precision: "unknown", label: null }, version: 4 }],
  links: [{ claimId, claimKind: "knows", direction: "out", other: { objectId: target, label: "Watcher’s Spire", kind: "place" }, truthState: "pencil" }]
};

const existing = card.links[0] as Link;

const meta = { title: "Relationships/Composer", component: RelationshipComposer, parameters: { layout: "centered" } } satisfies Meta<typeof RelationshipComposer>;
export default meta;
type Story = StoryObj<typeof meta>;

function Demo() {
  const calls: string[] = [];
  const store = { assert: async (...args: unknown[]) => { calls.push(String(args[1])); return true; } } as unknown as DeskStore;
  return <div style={{ width: 440, padding: 24, background: "var(--chrome-surface)" }}><RelationshipComposer card={card} store={store} existing={existing} onSaved={() => { const node = document.createElement("span"); node.textContent = `Saved ${calls.at(-1) ?? "relationship"}`; node.setAttribute("data-testid", "saved"); document.body.appendChild(node); }} /></div>;
}

export const EditPredicate: Story = { args: { card, store: {} as DeskStore, existing }, render: () => <Demo/>, play: async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  const predicate = canvas.getByRole("combobox", { name: "Relationship" });
  await userEvent.clear(predicate);
  await userEvent.type(predicate, "protects");
  await userEvent.click(canvas.getByRole("button", { name: "Save relationship" }));
  await expect(document.querySelector("[data-testid=saved]")).toHaveTextContent("Saved protects");
} };

export const NewRelationship: Story = { args: { card, store: {} as DeskStore }, render: () => {
  const store = { search: async () => [], findObjects: async () => [], assert: async () => true } as unknown as DeskStore;
  return <div style={{ width: 440, padding: 24, background: "var(--chrome-surface)" }}><RelationshipComposer card={{ ...card, claims: [], links: [] }} store={store}/></div>;
} };

