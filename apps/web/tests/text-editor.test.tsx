import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WritingEditor } from "@/components/ui/text-editor";

afterEach(cleanup);

describe("WritingEditor", () => {
  it("keeps a draft local until Done commits and Escape restores the original", async () => {
    const user = userEvent.setup();
    const commits: string[] = [];
    const cancels = vi.fn();
    render(
      <WritingEditor
        value="The bell is quiet"
        onCommit={(value) => commits.push(value)}
        onCancel={cancels}
        ariaLabel="Observation"
      />
    );

    const editor = screen.getByRole("textbox", { name: "Observation" });
    await user.type(editor, " tonight");
    expect(commits).toEqual([]);

    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(commits).toEqual(["The bell is quiet tonight"]);

    await user.type(editor, " and then");
    await user.keyboard("{Escape}");
    expect(cancels).toHaveBeenCalledTimes(1);
    expect((editor as HTMLTextAreaElement).value).toBe("The bell is quiet tonight");
  });

  it("commits once when a pointer leaves the editor", async () => {
    const user = userEvent.setup();
    const commits: string[] = [];
    render(
      <>
        <WritingEditor value="A kept note" onCommit={(value) => commits.push(value)} ariaLabel="Note" />
        <button type="button">Outside</button>
      </>
    );

    await user.type(screen.getByRole("textbox", { name: "Note" }), " changed");
    await user.click(screen.getByRole("button", { name: "Outside" }));

    expect(commits).toEqual(["A kept note changed"]);
  });

  it("applies bullet and numbered prefixes to selected lines while retaining the selection", async () => {
    const user = userEvent.setup();
    render(
      <WritingEditor value={"First clue\nSecond clue"} onCommit={vi.fn()} ariaLabel="Clues" />
    );

    const editor = screen.getByRole("textbox", { name: "Clues" }) as HTMLTextAreaElement;
    editor.setSelectionRange(0, editor.value.length);
    fireEvent.select(editor);

    await user.click(screen.getByRole("button", { name: "Bulleted list" }));
    await waitFor(() => expect(editor.value).toBe("• First clue\n• Second clue"));
    expect(editor.selectionStart).toBe(0);
    expect(editor.selectionEnd).toBe(editor.value.length);

    await user.click(screen.getByRole("button", { name: "Numbered list" }));
    await waitFor(() => expect(editor.value).toBe("1. First clue\n2. Second clue"));
    expect(editor.selectionStart).toBe(0);
    expect(editor.selectionEnd).toBe(editor.value.length);
  });

  it("keeps shortcut keys inside the editor", async () => {
    const user = userEvent.setup();
    let bubbled = 0;
    render(
      <div onKeyDown={() => { bubbled += 1; }}>
        <WritingEditor value="A note" onCommit={vi.fn()} ariaLabel="Isolated note" />
      </div>
    );

    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(bubbled).toBe(0);
  });

  it("offers restrained emphasis and heading actions as portable text", async () => {
    const user = userEvent.setup();
    const commits: string[] = [];
    render(<WritingEditor value="A clear note" onCommit={(value) => commits.push(value)} ariaLabel="Formatted note" />);
    const editor = screen.getByRole("textbox", { name: "Formatted note" }) as HTMLTextAreaElement;
    editor.setSelectionRange(0, 1);
    fireEvent.select(editor);
    await user.click(screen.getByRole("button", { name: "Bold" }));
    expect(editor.value).toBe("**A** clear note");
    editor.setSelectionRange(0, editor.value.length);
    fireEvent.select(editor);
    await user.click(screen.getByRole("button", { name: "Heading" }));
    expect(editor.value).toBe("## **A** clear note");
    await user.click(screen.getByRole("button", { name: "Done" }));
    expect(commits).toEqual(["## **A** clear note"]);
  });

  it("keeps a Focus draft unsaved across navigation and reports shortcut formatting to its Save control", async () => {
    const user = userEvent.setup();
    const commit = vi.fn();
    const draft = vi.fn();
    render(<><WritingEditor value="An unopened letter" ariaLabel="Focus narrative" commitOnBlur={false} showCommitActions={false} onDraftChange={draft} onCommit={commit}/><button type="button">Relationships page</button></>);
    const input = screen.getByRole("textbox", { name: "Focus narrative" }) as HTMLTextAreaElement;
    input.setSelectionRange(3, 11);
    await user.keyboard("{Control>}b{/Control}");
    expect(input.value).toBe("An **unopened** letter");
    expect(draft).toHaveBeenLastCalledWith("An **unopened** letter");
    await user.click(screen.getByRole("button", { name: "Relationships page" }));
    expect(commit).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Done" })).toBeNull();
    input.focus();
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(commit).toHaveBeenCalledWith("An **unopened** letter");
  });
});
