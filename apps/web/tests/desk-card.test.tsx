import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MARA } from "@/components/world-objects/object-fixtures";
import { DeskCard } from "@/components/desk/desk-card";

afterEach(() => vi.restoreAllMocks());

function renderCard(overrides: Partial<Pick<React.ComponentProps<typeof DeskCard>, "expanded" | "tier">> = {}) {
  const onOpen = vi.fn();
  const onRequestEdit = vi.fn();
  render(<DeskCard card={MARA} tier="far" selected editing={false} onPointerDown={vi.fn()} onOpen={onOpen} onRequestEdit={onRequestEdit} onTitleChange={vi.fn()} onBodyChange={vi.fn()} onEndEdit={vi.fn()} {...overrides}/>);
  return { article: screen.getByRole("article", { name: "character: Mara Veyra" }), onOpen, onRequestEdit };
}

describe("Desk card depth gestures", () => {
  it("opens Focus from double-click and Enter instead of the generic body editor", () => {
    const { article, onOpen, onRequestEdit } = renderCard();
    fireEvent.doubleClick(article);
    fireEvent.keyDown(article, { key: "Enter" });
    expect(onOpen).toHaveBeenCalledTimes(2);
    expect(onRequestEdit).not.toHaveBeenCalled();
  });

  it("keeps F as the Focus shortcut and uses F2 for contextual name editing", () => {
    const { article, onOpen, onRequestEdit } = renderCard();
    fireEvent.keyDown(article, { key: "f" });
    expect(onOpen).toHaveBeenCalledOnce();
    fireEvent.keyDown(article, { key: "F2" });
    expect(screen.getByRole("textbox", { name: "Card title" })).toBeTruthy();
    expect(onRequestEdit).not.toHaveBeenCalled();
  });

  it("preserves explicit Expanded intent at far zoom without a third marker footprint", () => {
    const { article } = renderCard({ expanded: true });
    expect(article.getAttribute("data-disclosure")).toBe("expanded");
    expect(article.style.width).toBe(`${MARA.layout.width}px`);
    expect(article.querySelector('[data-recognition="expanded"]')).toBeTruthy();
    // The Expanded base is sized by its content, not stretched to the placement preference.
    expect(article.style.minHeight).toBe("");
  });

  it("simplifies to the far tier at far zoom and keeps the placement footprint", () => {
    const { article } = renderCard();
    expect(article.getAttribute("data-disclosure")).toBe("marker");
    expect(article.style.minHeight).toBe(`${MARA.layout.height}px`);
    expect(article.querySelector('[data-recognition="far"] [data-card-title]')?.textContent).toBe("Mara Veyra");
  });
});

