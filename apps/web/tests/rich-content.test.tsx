import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { emptyRichText, richText, type RichDocument } from "@/lib/world/entity-document";
import { RichContent, RichContentEditor } from "@/components/entities/rich-content";

const documentFixture: RichDocument = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Mara Vey" }] },
    { type: "paragraph", content: [
      { type: "text", text: "A former scout in " },
      { type: "entityReference", attrs: { objectId: "place:vale", label: "Ember Vale", kind: "place" } },
      { type: "text", text: "." },
    ] },
    { type: "paragraph", content: [{ type: "text", text: "Bold", marks: [{ type: "bold" }] }] },
    { type: "paragraph", content: [{ type: "text", text: "Unsafe", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] }] },
  ],
};

describe("RichContent", () => {
  it("renders the constrained rich document without unsafe links", () => {
    render(<RichContent value={documentFixture} />);
    expect(screen.getByRole("heading", { name: "Mara Vey" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Ember Vale" })).toBeTruthy();
    expect(screen.getByText("Bold").tagName).toBe("STRONG");
    expect(screen.getByText("Unsafe").closest("a")).toBeNull();
  });

  it("follows entity references only through the explicit callback", () => {
    const onReference = vi.fn();
    render(<RichContent onReference={onReference} value={documentFixture} />);
    fireEvent.click(screen.getByRole("button", { name: "Ember Vale" }));
    expect(onReference).toHaveBeenCalledWith("place:vale");
  });
});

describe("RichContentEditor", () => {
  it("exposes a native contenteditable backed by Tiptap", async () => {
    render(<RichContentEditor ariaLabel="Narrative" onChange={vi.fn()} value={richText("Draft text")} />);
    const editor = await screen.findByRole("textbox", { name: "Narrative" });
    expect(editor.getAttribute("contenteditable")).toBe("true");
    expect(editor.textContent).toContain("Draft text");
  });

  it("does not reset content on Escape and hands exit to the parent", async () => {
    const onExit = vi.fn();
    render(<RichContentEditor ariaLabel="Narrative" onChange={vi.fn()} onExit={onExit} value={richText("Keep this draft")} />);
    const editor = await screen.findByRole("textbox", { name: "Narrative" });
    fireEvent.keyDown(editor, { key: "Escape" });
    expect(onExit).toHaveBeenCalledTimes(1);
    expect(editor.textContent).toContain("Keep this draft");
  });

  it("inserts an entity reference through the picker without creating a relationship", async () => {
    const onChange = vi.fn();
    const onReference = vi.fn();
    render(<RichContentEditor
      ariaLabel="Narrative"
      onChange={onChange}
      onReference={onReference}
      onSearchReferences={async () => [{ objectId: "character:mara", label: "Mara Vey", kind: "Character" }]}
      value={richText("A note")}
    />);
    const editor = await screen.findByRole("textbox", { name: "Narrative" });
    fireEvent.focus(editor);
    fireEvent.click(await screen.findByRole("button", { name: /insert reference/i }));
    fireEvent.click(await screen.findByRole("option", { name: /mara vey/i }));
    expect(onChange).toHaveBeenCalled();
    expect(onReference).not.toHaveBeenCalled();
    const document = onChange.mock.calls.at(-1)![0];
    const reference = document.content.flatMap((node: { content?: readonly { type: string; attrs?: object }[] }) => node.content ?? []).find((node: { type: string }) => node.type === "entityReference");
    expect(Object.getPrototypeOf(reference.attrs)).toBe(Object.prototype);
  });

  describe("manuscript variant", () => {
    const choices = [{ id: "text:roleplay", label: "Roleplay" }, { id: "mechanics:", label: "Mechanics", disabled: true }];

    it("is always editable with no mode hint and no permanent toolbar", async () => {
      render(<RichContentEditor ariaLabel="Narrative" onChange={vi.fn()} value={richText("Draft text")} variant="manuscript" />);
      const editor = await screen.findByRole("textbox", { name: "Narrative" });
      fireEvent.focus(editor);
      expect(editor.getAttribute("contenteditable")).toBe("true");
      expect(screen.queryByText(/Esc to leave editing/)).toBeNull();
      expect(screen.queryByRole("toolbar", { name: "Formatting" })).toBeNull();
    });

    it("summons the format toolbar from the keyboard with Alt+F10", async () => {
      render(<RichContentEditor ariaLabel="Narrative" onChange={vi.fn()} value={richText("Draft text")} variant="manuscript" />);
      const editor = await screen.findByRole("textbox", { name: "Narrative" });
      fireEvent.focus(editor);
      fireEvent.keyDown(editor, { key: "F10", altKey: true });
      const toolbar = await screen.findByRole("toolbar", { name: "Formatting" });
      for (const name of ["Heading 2", "Heading 3", "Bold", "Italic", "Bulleted list", "Numbered list", "Quote", "Link", "Insert reference"]) {
        expect(toolbar.querySelector(`button[title^="${name}"]`)).toBeTruthy();
      }
    });

    it("opens the insert menu with / on an empty line and hands the choice to the host", async () => {
      const onInsert = vi.fn();
      render(<RichContentEditor ariaLabel="Narrative" insertChoices={choices} onChange={vi.fn()} onInsert={onInsert} value={emptyRichText()} variant="manuscript" />);
      const editor = await screen.findByRole("textbox", { name: "Narrative" });
      fireEvent.keyDown(editor, { key: "/" });
      const menu = await screen.findByRole("listbox", { name: "Insert a block" });
      expect(menu.querySelectorAll("[role=option]")).toHaveLength(2);
      expect(editor.getAttribute("aria-activedescendant")).toBeTruthy();
      fireEvent.keyDown(editor, { key: "ArrowDown" });
      fireEvent.keyDown(editor, { key: "Enter" });
      expect(onInsert).not.toHaveBeenCalled(); // a disabled choice is never inserted
      fireEvent.keyDown(editor, { key: "ArrowUp" });
      fireEvent.keyDown(editor, { key: "Enter" });
      expect(onInsert).toHaveBeenCalledWith("text:roleplay");
      await waitFor(() => expect(screen.queryByRole("listbox", { name: "Insert a block" })).toBeNull());
    });

    it("opens the reference picker with @ and inserts by keyboard", async () => {
      const onChange = vi.fn();
      render(<RichContentEditor
        ariaLabel="Narrative"
        onChange={onChange}
        onSearchReferences={async () => [{ objectId: "character:mara", label: "Mara Vey", kind: "Character" }]}
        value={emptyRichText()}
        variant="manuscript"
      />);
      const editor = await screen.findByRole("textbox", { name: "Narrative" });
      fireEvent.keyDown(editor, { key: "@" });
      const search = await screen.findByRole("combobox", { name: "Find an entity" });
      await screen.findByRole("option", { name: /mara vey/i });
      fireEvent.keyDown(search, { key: "Enter" });
      await waitFor(() => expect(onChange).toHaveBeenCalled());
      const document = onChange.mock.calls.at(-1)![0] as RichDocument;
      expect(JSON.stringify(document)).toContain("character:mara");
    });
  });
});
