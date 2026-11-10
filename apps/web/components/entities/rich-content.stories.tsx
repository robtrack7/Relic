import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { fn } from "storybook/test";
import { richText, type RichDocument } from "@/lib/world/entity-document";
import { RichContent, RichContentEditor } from "./rich-content";

const meta = {
  title: "Entities/Rich content",
  parameters: { layout: "padded" },
  decorators: [Story => <main style={{ background: "var(--chrome-surface)", padding: 32, minHeight: "calc(100dvh - 32px)" }}><Story/></main>],
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

const characterNarrative: RichDocument = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Narrative" }] },
    { type: "paragraph", content: [
      { type: "text", text: "Mara Vey is a former guild scout with a debt she cannot outrun. She still watches the road beyond " },
      { type: "entityReference", attrs: { objectId: "place:ember-vale", label: "Ember Vale", kind: "place" } },
      { type: "text", text: ", listening for the bell that means the guild has found her." },
    ] },
    { type: "paragraph", content: [{ type: "text", text: "Pragmatic and sharp-tongued, her loyalty—once earned—is absolute.", marks: [{ type: "italic" }] }] },
    { type: "blockquote", content: [{ type: "paragraph", content: [{ type: "text", text: "She knows the path in, and the price of leaving." }] }] },
  ],
};

export const CharacterReader: Story = {
  render: () => <RichContent value={characterNarrative} onReference={fn()} />,
};

export const ThreadDevelopment: Story = {
  render: () => <RichContent value={richText("## The bells beneath Redfen\n\nThe old signal has returned after three quiet seasons. The party may hear it before anyone in the village admits that the tower is occupied.\n\n- Follow the sound through the reed marsh\n- Ask Mara who taught her the counter-signal\n- Leave the bell unanswered") } />,
};

export const SourceExcerpt: Story = {
  render: () => <RichContent value={{ type: "doc", content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Evidence" }] },
    { type: "paragraph", content: [{ type: "text", text: "The surviving account names the western road as a place of refuge, but its final paragraph was copied from an earlier ledger." }] },
    { type: "paragraph", content: [{ type: "text", text: "Open the field notes", marks: [{ type: "link", attrs: { href: "https://example.com/field-notes" } }] }] },
  ] }} />,
};

export const SparseFragment: Story = {
  render: () => <RichContent value={richText("A bell under the water.")} />,
};

function EditorStory({ initial }: { initial: RichDocument }) {
  const [value, setValue] = useState(initial);
  return <div style={{ maxWidth: "68ch" }}>
    <RichContentEditor
      ariaLabel="Narrative"
      onChange={setValue}
      onExit={fn()}
      onReference={fn()}
      onSearchReferences={async (query) => [
        { objectId: "place:ember-vale", label: "Ember Vale", kind: "Place" },
        { objectId: "character:mara-vey", label: "Mara Vey", kind: "Character" },
      ].filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))}
      placeholder="Begin the story of this entity…"
      value={value}
    />
    <p style={{ color: "var(--workflow-ink)", fontFamily: "var(--font-ui)", fontSize: ".75rem", marginTop: ".8rem" }}>Draft updates are emitted for the parent autosave session.</p>
  </div>;
}

export const BuilderEditing: Story = {
  render: () => <EditorStory initial={characterNarrative} />,
};

function ManuscriptStory({ initial }: { initial: RichDocument }) {
  const [value, setValue] = useState(initial);
  const [inserted, setInserted] = useState<string[]>([]);
  return <div style={{ font: "var(--type-builder-prose)", maxWidth: "68ch", paddingTop: 56, ["--prose-font" as string]: "var(--type-builder-prose)" }}>
    <RichContentEditor
      variant="manuscript"
      ariaLabel="Narrative"
      onChange={setValue}
      onReference={fn()}
      onSearchReferences={async (query) => [
        { objectId: "place:ember-vale", label: "Ember Vale", kind: "Place" },
        { objectId: "character:mara-vey", label: "Mara Vey", kind: "Character" },
      ].filter((item) => item.label.toLowerCase().includes(query.toLowerCase()))}
      insertChoices={[{ id: "roleplay", label: "Roleplay" }, { id: "goals", label: "Goals & motives" }, { id: "mechanics", label: "Mechanics", disabled: true }]}
      onInsert={(id) => setInserted((current) => [...current, id])}
      placeholder="Write narrative… Type / to add a section, @ to mention."
      value={value}
    />
    <p style={{ color: "var(--ink-quiet)", fontFamily: "var(--font-ui)", fontSize: ".75rem", marginTop: "2rem" }}>Select text for formatting (or Alt+F10). “/” on an empty line inserts a section{inserted.length ? ` — inserted: ${inserted.join(", ")}` : ""}.</p>
  </div>;
}

/** Builder writing: always editable, no frame, formatting floats over the selection. */
export const ManuscriptWriting: Story = {
  render: () => <ManuscriptStory initial={characterNarrative} />,
};

export const ManuscriptEmpty: Story = {
  render: () => <ManuscriptStory initial={{ type: "doc", content: [{ type: "paragraph" }] }} />,
};
