import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { asClaimId, asWorldObjectId, type Link } from "@/lib/world/model";
import { SemanticRelationshipEdge } from "./semantic-relationship-edge";

const link: Link = {
  claimId: asClaimId("story-link"),
  claimKind: "protects",
  direction: "out",
  other: { objectId: asWorldObjectId("story-other"), label: "Watcher’s Spire", kind: "place" },
  truthState: "pencil"
};

const meta = { title: "Relationships/Semantic Edge", component: SemanticRelationshipEdge, parameters: { layout: "fullscreen" } } satisfies Meta<typeof SemanticRelationshipEdge>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Pending: Story = {
  render: (args) => <svg viewBox="0 0 640 260" width="100%" height="260" aria-label="Semantic relationship edge"><defs><marker id="relic-semantic-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 7 3.5 0 7Z" fill="currentColor"/></marker></defs><circle cx="120" cy="130" r="34" fill="#efe8e4"/><circle cx="520" cy="130" r="34" fill="#efe8e4"/><SemanticRelationshipEdge {...args}/></svg>, args: { link, x1: 154, y1: 130, x2: 486, y2: 130 } };
