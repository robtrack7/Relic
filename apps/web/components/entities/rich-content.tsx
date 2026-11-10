"use client";

import type { CSSProperties, KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Extension, Node as TiptapNode, mergeAttributes, type Editor, type JSONContent } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import type { RichDocument, RichNode } from "@/lib/world/entity-document";
import styles from "./rich-content.module.css";

type ReferenceResult = Readonly<{ objectId: string; label: string; kind?: string }>;

const safeHref = (value: unknown): value is string =>
  typeof value === "string" && /^(?:https?:|mailto:)/i.test(value.trim());

const textFromNode = (node: RichNode): string => {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "entityReference") return String(node.attrs?.label ?? "Referenced entity");
  if (node.type === "hardBreak") return "\n";
  return (node.content ?? []).map(textFromNode).join("");
};

const EntityReference = TiptapNode.create({
  name: "entityReference",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,
  addAttributes() {
    return {
      objectId: {
        default: "",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-object-id") ?? "",
        renderHTML: (attributes: { objectId?: string }) => ({ "data-object-id": attributes.objectId ?? "" }),
      },
      label: {
        default: "Referenced entity",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-label") ?? "Referenced entity",
        renderHTML: (attributes: { label?: string }) => ({ "data-label": attributes.label ?? "Referenced entity" }),
      },
      kind: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-kind"),
        renderHTML: (attributes: { kind?: string | null }) => attributes.kind ? { "data-kind": attributes.kind } : {},
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-entity-reference]" }];
  },
  renderHTML({ HTMLAttributes }) {
    const label = String(HTMLAttributes["data-label"] ?? "Referenced entity");
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-entity-reference": "true",
        contenteditable: "false",
        role: "button",
        tabindex: "0",
        "aria-label": `Open ${label}`,
      }),
      label,
    ];
  },
  renderText({ node }) {
    return String(node.attrs.label ?? "Referenced entity");
  },
});

const RelicRichKit = Extension.create({
  name: "relicRichKit",
  addExtensions() {
    return [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: false,
        linkOnPaste: false,
        validate: safeHref,
      }),
      EntityReference,
    ];
  },
});

function joinClassNames(...values: Array<string | undefined | false>): string | undefined {
  const result = values.filter(Boolean).join(" ");
  return result || undefined;
}

function renderInline(node: RichNode, key: string, onReference?: (objectId: string) => void): ReactNode {
  if (node.type === "hardBreak") return <br key={key} />;
  if (node.type === "entityReference") {
    const objectId = typeof node.attrs?.objectId === "string" ? node.attrs.objectId : "";
    const label = typeof node.attrs?.label === "string" ? node.attrs.label : "Referenced entity";
    return (
      <button
        className={styles.reference}
        data-entity-reference={objectId}
        key={key}
        onClick={() => objectId && onReference?.(objectId)}
        type="button"
      >
        {label}
      </button>
    );
  }
  if (node.type !== "text") {
    return (node.content ?? []).map((child, index) => renderInline(child, `${key}-${index}`, onReference));
  }

  let rendered: ReactNode = node.text ?? "";
  for (const mark of node.marks ?? []) {
    if (mark.type === "bold") rendered = <strong>{rendered}</strong>;
    if (mark.type === "italic") rendered = <em>{rendered}</em>;
    if (mark.type === "link") {
      const href = mark.attrs?.href;
      rendered = safeHref(href) ? (
        <a href={href} rel="noreferrer" target="_blank">{rendered}</a>
      ) : rendered;
    }
  }
  return <span key={key}>{rendered}</span>;
}

function renderBlock(node: RichNode, key: string, onReference?: (objectId: string) => void): ReactNode {
  const content = node.content ?? [];
  const inline = content.map((child, index) => renderInline(child, `${key}-${index}`, onReference));
  switch (node.type) {
    case "heading": {
      const level = Number(node.attrs?.level) === 3 ? 3 : 2;
      return level === 3 ? <h3 key={key}>{inline}</h3> : <h2 key={key}>{inline}</h2>;
    }
    case "paragraph":
      return <p key={key}>{inline}</p>;
    case "blockquote":
      return <blockquote key={key}>{content.map((child, index) => renderBlock(child, `${key}-${index}`, onReference))}</blockquote>;
    case "bulletList":
      return <ul key={key}>{content.map((child, index) => renderBlock(child, `${key}-${index}`, onReference))}</ul>;
    case "orderedList":
      return <ol key={key}>{content.map((child, index) => renderBlock(child, `${key}-${index}`, onReference))}</ol>;
    case "listItem":
      return <li key={key}>{content.map((child, index) => renderBlock(child, `${key}-${index}`, onReference))}</li>;
    case "doc":
      return <>{content.map((child, index) => renderBlock(child, `${key}-${index}`, onReference))}</>;
    case "text":
    case "hardBreak":
    case "entityReference":
      return <p key={key}>{inline}</p>;
    default:
      return null;
  }
}

export function RichContent({ value, onReference, className }: {
  value: RichDocument;
  onReference?: (objectId: string) => void;
  className?: string;
}) {
  return (
    <div className={joinClassNames(styles.reader, className)} data-rich-content="reader">
      {renderBlock(value, "document", onReference)}
    </div>
  );
}

function FormatButton({ active, label, onClick, children, shortcut }: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
  shortcut?: string;
}) {
  return (
    <button
      aria-pressed={active}
      className={joinClassNames(styles.formatButton, active && styles.formatButtonActive)}
      onMouseDown={(event: ReactMouseEvent<HTMLButtonElement>) => event.preventDefault()}
      onClick={onClick}
      title={shortcut ? `${label} (${shortcut})` : label}
      type="button"
    >
      <span className={styles.formatGlyph} aria-hidden="true">{children}</span>
      <span className={styles.visuallyHidden}>{label}</span>
    </button>
  );
}

const Icon = ({ children }: { children: ReactNode }) => (
  <svg aria-hidden="true" fill="none" height="16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.4" viewBox="0 0 16 16" width="16">{children}</svg>
);
const BulletIcon = () => <Icon><path d="M6.5 4h7M6.5 8h7M6.5 12h7"/><circle cx="3" cy="4" r=".6" fill="currentColor"/><circle cx="3" cy="8" r=".6" fill="currentColor"/><circle cx="3" cy="12" r=".6" fill="currentColor"/></Icon>;
const OrderedIcon = () => <Icon><path d="M7 4h6.5M7 8h6.5M7 12h6.5M2.6 2.8l1-.5v3.4M2.3 9.6c.2-.7 1.9-.8 1.9.2 0 .8-1.9 1.3-1.9 2.4h2"/></Icon>;
const QuoteIcon = () => <Icon><path d="M3 3v10M6.5 5h7M6.5 8h7M6.5 11h5"/></Icon>;
const LinkIcon = () => <Icon><path d="M6.8 9.2a2.8 2.8 0 0 0 4 0l2-2a2.8 2.8 0 0 0-4-4l-.7.7M9.2 6.8a2.8 2.8 0 0 0-4 0l-2 2a2.8 2.8 0 0 0 4 4l.7-.7"/></Icon>;

function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => { ref.current = value; }, [value]);
  return ref;
}

type InsertChoice = Readonly<{ id: string; label: string; disabled?: boolean }>;
/** A position inside the editor shell: above the text it belongs to, or below it near the top of the viewport. */
type Anchor = Readonly<{ top: number; left: number; below: boolean }>;
type Trigger = Readonly<{ from: number; char: string }>;

const TOOLBAR_HALF_WIDTH = 168;

function anchorFor(editor: Editor, shell: HTMLElement | null, from: number, to = from, prefer: "above" | "below" = "above"): Anchor | null {
  if (!shell) return null;
  try {
    const start = editor.view.coordsAtPos(from);
    const end = editor.view.coordsAtPos(to);
    const box = shell.getBoundingClientRect();
    const sameLine = Math.abs(start.top - end.top) < 4;
    const below = prefer === "below" || start.top < 84;
    const raw = (sameLine ? (start.left + end.left) / 2 : start.left) - box.left;
    return { top: (below ? end.bottom + 8 : start.top - 8) - box.top, left: raw, below };
  } catch {
    // Layout is unavailable (tests, detached nodes): keep the control at the start of the text.
    return { top: 0, left: 0, below: true };
  }
}

/** Keeps a floating control inside the shell horizontally. */
function clampLeft(anchor: Anchor, shell: HTMLElement | null, half: number) {
  const width = shell?.clientWidth ?? 0;
  if (width <= half * 2) return width / 2 || anchor.left;
  return Math.max(half, Math.min(width - half, anchor.left));
}

export function RichContentEditor({
  value,
  onChange,
  onBlur,
  onExit,
  ariaLabel,
  placeholder,
  onSearchReferences,
  onReference,
  variant = "panel",
  insertChoices,
  onInsert,
}: {
  value: RichDocument;
  onChange: (value: RichDocument) => void;
  onBlur?: () => void;
  onExit?: () => void;
  ariaLabel: string;
  placeholder?: string;
  onSearchReferences?: (query: string) => Promise<readonly ReferenceResult[]>;
  onReference?: (objectId: string) => void;
  /**
   * `panel` is the bordered editor used where reading and writing are separate modes.
   * `manuscript` is always-editable writing on the page: no frame, a floating format
   * toolbar on selection, "/" or "+" on an empty line for the insert menu, "@" for references.
   */
  variant?: "panel" | "manuscript";
  insertChoices?: readonly InsertChoice[];
  onInsert?: (id: string) => void;
}) {
  const manuscript = variant === "manuscript";
  const onChangeRef = useLatest(onChange);
  const onBlurRef = useLatest(onBlur);
  const onExitRef = useLatest(onExit);
  const onReferenceRef = useLatest(onReference);
  const onInsertRef = useLatest(onInsert);
  const insertChoicesRef = useLatest(insertChoices);
  const shellRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const [within, setWithin] = useState(false);
  const [selectionAnchor, setSelectionAnchor] = useState<Anchor | null>(null);
  const [toolbarPinned, setToolbarPinned] = useState(false);
  const [insertMenu, setInsertMenu] = useState<(Trigger & { anchor: Anchor | null; active: number }) | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<Anchor | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [referenceQuery, setReferenceQuery] = useState("");
  const [referenceResults, setReferenceResults] = useState<readonly ReferenceResult[]>([]);
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [referenceActive, setReferenceActive] = useState(0);
  const referenceTrigger = useRef<Trigger | null>(null);
  const linkOpenRef = useLatest(linkOpen);
  const referenceOpenRef = useLatest(referenceOpen);
  const insertMenuRef = useLatest(insertMenu);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const valueSignature = useMemo(() => JSON.stringify(value), [value]);
  const listId = useId();
  const editorRef = useRef<Editor | null>(null);

  const openReference = useCallback((trigger: Trigger | null) => {
    const current = editorRef.current;
    referenceTrigger.current = trigger;
    setLinkOpen(false);
    setInsertMenu(null);
    setReferenceQuery("");
    setReferenceActive(0);
    if (current) setPopoverAnchor(anchorFor(current, shellRef.current, current.state.selection.from, current.state.selection.from, "below"));
    setReferenceOpen(true);
  }, []);
  const openReferenceRef = useLatest(openReference);

  const openLink = useCallback(() => {
    const current = editorRef.current;
    if (!current) return;
    setReferenceOpen(false);
    setInsertMenu(null);
    setLinkValue(String(current.getAttributes("link").href ?? ""));
    setPopoverAnchor(anchorFor(current, shellRef.current, current.state.selection.from, current.state.selection.to, "below"));
    setLinkOpen(true);
  }, []);
  const openLinkRef = useLatest(openLink);

  const chooseInsert = useCallback((index: number) => {
    const current = editorRef.current;
    const menu = insertMenuRef.current;
    const choice = insertChoicesRef.current?.[index];
    if (!current || !menu || !choice || choice.disabled) return;
    if (current.state.doc.textBetween(menu.from, Math.min(menu.from + 1, current.state.doc.content.size)) === menu.char) {
      current.chain().deleteRange({ from: menu.from, to: menu.from + 1 }).run();
      // The trigger line held nothing else: the new block takes its place.
      const line = current.state.doc.resolve(menu.from);
      if (line.parent.type.name === "paragraph" && line.parent.content.size === 0 && line.depth === 1 && current.state.doc.childCount > 1) {
        current.chain().deleteRange({ from: line.before(), to: line.after() }).run();
      }
    }
    setInsertMenu(null);
    onInsertRef.current?.(choice.id);
  }, [insertChoicesRef, insertMenuRef, onInsertRef]);
  const chooseInsertRef = useLatest(chooseInsert);

  const focusToolbar = useCallback(() => {
    setToolbarPinned(true);
    window.setTimeout(() => toolbarRef.current?.querySelector<HTMLButtonElement>("button")?.focus(), 0);
  }, []);
  const focusToolbarRef = useLatest(focusToolbar);

  const editor = useEditor({
    extensions: [RelicRichKit],
    content: value as unknown as JSONContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        "aria-label": ariaLabel,
        "aria-multiline": "true",
        "data-placeholder": placeholder ?? "",
        role: "textbox",
        spellcheck: "true",
      },
      handleKeyDown: (view, event) => {
        const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>("[data-entity-reference]") : null;
        if ((event.key === "Enter" || event.key === " ") && target) {
          const objectId = target.getAttribute("data-object-id") ?? "";
          if (objectId) onReferenceRef.current?.(objectId);
          event.preventDefault();
          return true;
        }
        const menu = insertMenuRef.current;
        if (menu) {
          const count = insertChoicesRef.current?.length ?? 0;
          if ((event.key === "ArrowDown" || event.key === "ArrowUp") && count) {
            const step = event.key === "ArrowDown" ? 1 : -1;
            setInsertMenu(current => current && { ...current, active: (current.active + step + count) % count });
            return true;
          }
          if (event.key === "Enter" || event.key === "Tab") { chooseInsertRef.current(menu.active); return true; }
          if (event.key === "Escape") { setInsertMenu(null); return true; }
          setInsertMenu(null);
        }
        if (event.key === "F10" && event.altKey) { focusToolbarRef.current(); return true; }
        if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) { openLinkRef.current(); return true; }
        const { selection } = view.state;
        const parent = selection.$from.parent;
        if ((event.key === "/" || event.key === "+") && selection.empty && insertChoicesRef.current?.length && parent.type.name === "paragraph" && parent.content.size === 0) {
          const from = selection.from;
          // Let the character land, then offer the menu; choosing removes it again.
          window.setTimeout(() => {
            const current = editorRef.current;
            setInsertMenu({ from, char: event.key, active: 0, anchor: current ? anchorFor(current, shellRef.current, from, from, "below") : null });
          }, 0);
          return false;
        }
        if (event.key === "@" && selection.empty) {
          const before = selection.$from.parent.textBetween(Math.max(0, selection.$from.parentOffset - 1), selection.$from.parentOffset, undefined, "￼");
          if (!before || /\s/.test(before)) {
            const from = selection.from;
            window.setTimeout(() => openReferenceRef.current({ from, char: "@" }), 0);
            return false;
          }
        }
        if (event.key === "Escape") {
          if (linkOpenRef.current || referenceOpenRef.current) {
            setLinkOpen(false);
            setReferenceOpen(false);
            return true;
          }
          onExitRef.current?.();
          return true;
        }
        return false;
      },
      handleDOMEvents: {
        blur: () => {
          onBlurRef.current?.();
          window.setTimeout(() => setFocused(false), 0);
          return false;
        },
        click: (_view, event) => {
          const target = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>("[data-entity-reference]") : null;
          const objectId = target?.getAttribute("data-object-id") ?? "";
          if (objectId) onReferenceRef.current?.(objectId);
          return false;
        },
      },
    },
    onFocus: () => setFocused(true),
    onSelectionUpdate: ({ editor: current }) => setFocused(current.isFocused),
    // ProseMirror attributes can use a null prototype. The action boundary
    // requires ordinary JSON objects rather than temporary client references.
    onUpdate: ({ editor: current }) => onChangeRef.current(JSON.parse(JSON.stringify(current.getJSON())) as RichDocument),
  });
  editorRef.current = editor;

  // The floating toolbar follows a non-empty selection (or the caret, once summoned by keyboard).
  useEffect(() => {
    if (!editor || !manuscript) return;
    const place = () => {
      const { from, to, empty } = editor.state.selection;
      setSelectionAnchor(!empty ? anchorFor(editor, shellRef.current, from, to) : null);
    };
    editor.on("transaction", place);
    return () => { editor.off("transaction", place); };
  }, [editor, manuscript]);

  useEffect(() => {
    if (!editor || JSON.stringify(editor.getJSON()) === valueSignature) return;
    editor.commands.setContent(value as unknown as JSONContent, { emitUpdate: false });
  }, [editor, value, valueSignature]);

  // While the insert menu is open, focus stays in the text; expose the active option to assistive tech.
  useEffect(() => {
    const dom = editor?.view.dom;
    if (!dom) return;
    if (insertMenu) {
      dom.setAttribute("aria-controls", `${listId}-insert`);
      dom.setAttribute("aria-activedescendant", `${listId}-insert-${insertMenu.active}`);
    } else {
      dom.removeAttribute("aria-controls");
      dom.removeAttribute("aria-activedescendant");
    }
  }, [editor, insertMenu, listId]);

  useEffect(() => {
    if (!referenceOpen) return;
    let cancelled = false;
    setReferenceLoading(true);
    void (onSearchReferences ? onSearchReferences(referenceQuery) : Promise.resolve([])).then((results) => {
      if (!cancelled) { setReferenceResults(results); setReferenceActive(0); }
    }).finally(() => {
      if (!cancelled) setReferenceLoading(false);
    });
    return () => { cancelled = true; };
  }, [onSearchReferences, referenceOpen, referenceQuery]);

  useEffect(() => {
    if (referenceOpen) window.setTimeout(() => referenceInputRef.current?.focus(), 0);
  }, [referenceOpen]);

  const closePopovers = useCallback(() => {
    setLinkOpen(false);
    setReferenceOpen(false);
    referenceTrigger.current = null;
    editor?.commands.focus();
  }, [editor]);

  const insertReference = useCallback((reference: ReferenceResult) => {
    if (!editor || !reference.objectId) return;
    const trigger = referenceTrigger.current;
    let chain = editor.chain().focus();
    if (trigger && editor.state.doc.textBetween(trigger.from, Math.min(trigger.from + 1, editor.state.doc.content.size)) === trigger.char) {
      chain = chain.deleteRange({ from: trigger.from, to: trigger.from + 1 });
    }
    chain.insertContent([{ type: "entityReference", attrs: {
      objectId: reference.objectId,
      label: reference.label,
      kind: reference.kind ?? null,
    } }, { type: "text", text: " " }]).run();
    referenceTrigger.current = null;
    setReferenceOpen(false);
    setReferenceQuery("");
  }, [editor]);

  const applyLink = useCallback(() => {
    if (!editor) return;
    const href = linkValue.trim();
    if (!href) editor.chain().focus().unsetLink().run();
    else if (safeHref(href)) editor.chain().focus().setLink({ href }).run();
    setLinkOpen(false);
  }, [editor, linkValue]);

  if (!editor) return <div className={joinClassNames(styles.editorShell, manuscript && styles.manuscript, styles.editorLoading)} aria-busy="true" />;

  const shellStyle = manuscript && placeholder ? { "--editor-placeholder": JSON.stringify(placeholder) } as CSSProperties : undefined;
  const floating = (anchor: Anchor | null, half: number): CSSProperties | undefined => manuscript && anchor ? {
    left: clampLeft(anchor, shellRef.current, half),
    top: anchor.top,
    transform: `translate(-50%, ${anchor.below ? "0" : "-100%"})`,
  } : undefined;
  const caretAnchor = toolbarPinned && !selectionAnchor ? anchorFor(editor, shellRef.current, editor.state.selection.from) : null;
  const toolbarAnchor = selectionAnchor ?? caretAnchor;
  const showToolbar = manuscript ? within && !!toolbarAnchor && !linkOpen && !referenceOpen : focused;
  const referenceSearch = () => {
    if (manuscript) { openReference(null); return; }
    referenceTrigger.current = null;
    setLinkOpen(false);
    setReferenceOpen(open => !open);
  };

  const toolbar = (
    <div
      aria-label="Formatting"
      className={joinClassNames(styles.formatBar, manuscript && styles.floatingBar)}
      onKeyDown={manuscript ? (event: ReactKeyboardEvent<HTMLDivElement>) => {
        const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>("button")];
        const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
        if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
          event.preventDefault();
          buttons[(index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length]?.focus();
        }
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); setToolbarPinned(false); editor.commands.focus(); }
      } : undefined}
      ref={toolbarRef}
      role="toolbar"
      style={floating(toolbarAnchor, TOOLBAR_HALF_WIDTH)}
    >
      <FormatButton active={editor.isActive("heading", { level: 2 })} label="Heading 2" shortcut="Ctrl+Alt+2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</FormatButton>
      <FormatButton active={editor.isActive("heading", { level: 3 })} label="Heading 3" shortcut="Ctrl+Alt+3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</FormatButton>
      <span className={styles.formatRule} />
      <FormatButton active={editor.isActive("bold")} label="Bold" shortcut="Ctrl+B" onClick={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></FormatButton>
      <FormatButton active={editor.isActive("italic")} label="Italic" shortcut="Ctrl+I" onClick={() => editor.chain().focus().toggleItalic().run()}><em>I</em></FormatButton>
      <span className={styles.formatRule} />
      <FormatButton active={editor.isActive("bulletList")} label="Bulleted list" shortcut="Ctrl+Shift+8" onClick={() => editor.chain().focus().toggleBulletList().run()}>{manuscript ? <BulletIcon/> : "•"}</FormatButton>
      <FormatButton active={editor.isActive("orderedList")} label="Numbered list" shortcut="Ctrl+Shift+7" onClick={() => editor.chain().focus().toggleOrderedList().run()}>{manuscript ? <OrderedIcon/> : "1."}</FormatButton>
      <FormatButton active={editor.isActive("blockquote")} label="Quote" shortcut="Ctrl+Shift+B" onClick={() => editor.chain().focus().toggleBlockquote().run()}>{manuscript ? <QuoteIcon/> : "“"}</FormatButton>
      <FormatButton active={editor.isActive("link") || linkOpen} label="Link" shortcut="Ctrl+K" onClick={openLink}>{manuscript ? <LinkIcon/> : "↗"}</FormatButton>
      {manuscript
        ? <FormatButton label="Insert reference" shortcut="@" onClick={referenceSearch}><span className={styles.mentionGlyph}>@</span></FormatButton>
        : <><span className={styles.formatSpacer} /><button className={styles.referenceTrigger} onMouseDown={(event) => event.preventDefault()} onClick={referenceSearch} type="button">+ Insert reference</button></>}
    </div>
  );

  return (
    <div
      className={joinClassNames(styles.editorShell, manuscript && styles.manuscript, !manuscript && focused && styles.editorFocused)}
      data-rich-content="editor"
      onBlur={(event) => {
        if (shellRef.current?.contains(event.relatedTarget as Node | null)) return;
        setWithin(false);
        setToolbarPinned(false);
        setInsertMenu(null);
        if (manuscript) { setLinkOpen(false); setReferenceOpen(false); }
      }}
      onFocus={() => setWithin(true)}
      ref={shellRef}
      style={shellStyle}
    >
      {showToolbar && toolbar}
      {linkOpen && (
        <form className={joinClassNames(styles.inlinePopover, manuscript && styles.floatingPopover)} style={floating(popoverAnchor, 150)} onSubmit={(event) => { event.preventDefault(); applyLink(); }}>
          <label htmlFor={`${listId}-link`}>Link address</label>
          <input autoFocus id={`${listId}-link`} onChange={(event) => setLinkValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closePopovers(); } }} placeholder="https://…" value={linkValue} />
          <button type="submit">Apply</button>
          <button onClick={closePopovers} type="button">Cancel</button>
        </form>
      )}
      {referenceOpen && (
        <div aria-label="Insert entity reference" className={joinClassNames(styles.inlinePopover, manuscript && styles.floatingPopover)} role="dialog" style={floating(popoverAnchor, 150)}>
          <label htmlFor={`${listId}-reference`}>Find an entity</label>
          <input
            aria-activedescendant={referenceResults[referenceActive] ? `${listId}-reference-${referenceActive}` : undefined}
            aria-autocomplete="list"
            aria-controls={`${listId}-references`}
            aria-expanded={referenceResults.length > 0}
            id={`${listId}-reference`}
            onChange={(event) => setReferenceQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                const count = referenceResults.length;
                if (count) setReferenceActive(current => (current + (event.key === "ArrowDown" ? 1 : -1) + count) % count);
              }
              if (event.key === "Enter") { event.preventDefault(); const choice = referenceResults[referenceActive]; if (choice) insertReference(choice); }
              if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); closePopovers(); }
            }}
            placeholder="Search by name"
            ref={referenceInputRef}
            role="combobox"
            value={referenceQuery}
          />
          <div className={styles.referenceResults} id={`${listId}-references`} role="listbox" aria-label="Matching entities">
            {referenceLoading && <span className={styles.popoverHint}>Searching…</span>}
            {!referenceLoading && !onSearchReferences && <span className={styles.popoverHint}>Reference search is unavailable here.</span>}
            {!referenceLoading && onSearchReferences && referenceResults.length === 0 && <span className={styles.popoverHint}>No matching entities.</span>}
            {!referenceLoading && referenceResults.map((reference, index) => (
              <button aria-selected={index === referenceActive} className={styles.referenceResult} id={`${listId}-reference-${index}`} key={reference.objectId} onClick={() => insertReference(reference)} onMouseDown={(event) => event.preventDefault()} role="option" tabIndex={-1} type="button">
                <span>{reference.label}</span><small>{reference.kind ?? "Entity"}</small>
              </button>
            ))}
          </div>
        </div>
      )}
      {insertMenu && insertChoices?.length ? (
        <div aria-label="Insert a block" className={styles.insertMenu} id={`${listId}-insert`} role="listbox" style={floating(insertMenu.anchor, 110)}>
          {insertChoices.map((choice, index) => (
            <div
              aria-disabled={choice.disabled || undefined}
              aria-selected={index === insertMenu.active}
              className={styles.insertOption}
              id={`${listId}-insert-${index}`}
              key={choice.id}
              onClick={() => chooseInsertRef.current(index)}
              onMouseDown={(event) => event.preventDefault()}
              role="option"
            >{choice.label}</div>
          ))}
        </div>
      ) : null}
      <EditorContent editor={editor} />
      {!manuscript && focused && <span className={styles.editorHint}>Esc to leave editing</span>}
    </div>
  );
}

export type { InsertChoice, ReferenceResult };
