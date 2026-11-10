"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode
} from "react";

import styles from "./text-editor.module.css";

type FieldChromeProps = {
  id: string;
  label?: ReactNode;
  helpText?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
};

function FieldChrome({ id, label, helpText, error, children }: FieldChromeProps) {
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  const hasError = Boolean(error);

  return (
    <div className={styles.field}>
      {label ? (
        <label className={styles.label} htmlFor={id}>
          {label}
        </label>
      ) : null}
      {children}
      {helpText ? (
        <p className={styles.help} id={helpId}>
          {helpText}
        </p>
      ) : null}
      {hasError ? (
        <p className={styles.error} id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, helpText?: ReactNode, error?: ReactNode) {
  const ids = [helpText ? `${id}-help` : null, error ? `${id}-error` : null].filter(
    (value): value is string => value !== null
  );
  return ids.length > 0 ? ids.join(" ") : undefined;
}

function stopEditorEvent(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

type ListKind = "bullet" | "numbered";

function applyTextList(text: string, selectionStart: number, selectionEnd: number, kind: ListKind) {
  const blockStart = text.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
  const nextBreak = text.indexOf("\n", selectionEnd);
  const blockEnd = nextBreak === -1 ? text.length : nextBreak;
  const selected = text.slice(blockStart, blockEnd);
  const lines = selected.split("\n");
  const parsed = lines.map((line) => {
    const match = line.match(/^(\s*)(?:•\s+|\d+\.\s+|[-*]\s+)(.*)$/);
    const prefixKind = match?.[0].trimStart().startsWith("•")
      ? "bullet"
      : match?.[0].trimStart().match(/^\d+\./)
        ? "numbered"
        : undefined;
    return { indent: match?.[1] ?? "", content: match?.[2] ?? line, prefixKind };
  });
  const listLines = parsed.filter(({ content }) => content.trim() !== "");
  const alreadyThisKind = listLines.length > 0 && listLines.every(({ prefixKind }) => prefixKind === kind);

  const transformed = parsed.map(({ indent, content }, index) => {
    if (content.trim() === "") return lines[index] ?? "";
    if (alreadyThisKind) return `${indent}${content}`;
    return kind === "bullet" ? `${indent}• ${content}` : `${indent}${index + 1}. ${content}`;
  });
  const replacement = transformed.join("\n");
  const deltas = transformed.map((line, index) => line.length - (lines[index]?.length ?? 0));
  const mapPosition = (position: number, startOfSelection = false) => {
    // A non-collapsed selection beginning at the line start should continue to
    // include the inserted prefix. A collapsed caret at that same position
    // moves after the prefix so typing continues inside the list item.
    if (startOfSelection && selectionStart < selectionEnd && position === blockStart) return position;
    let mapped = position;
    let lineStart = blockStart;
    for (let index = 0; index < lines.length; index += 1) {
      if (lineStart <= position) mapped += deltas[index] ?? 0;
      lineStart += (lines[index]?.length ?? 0) + 1;
    }
    return mapped;
  };

  return {
    value: `${text.slice(0, blockStart)}${replacement}${text.slice(blockEnd)}`,
    selectionStart: mapPosition(selectionStart, true),
    selectionEnd: mapPosition(selectionEnd)
  };
}

function applyInlineMark(text: string, selectionStart: number, selectionEnd: number, mark: "**" | "_") {
  if (selectionStart === selectionEnd) return { value: text, selectionStart, selectionEnd };
  const selected = text.slice(selectionStart, selectionEnd);
  const wrapped = selected.startsWith(mark) && selected.endsWith(mark) && selected.length >= mark.length * 2
    ? selected.slice(mark.length, -mark.length)
    : `${mark}${selected}${mark}`;
  return {
    value: `${text.slice(0, selectionStart)}${wrapped}${text.slice(selectionEnd)}`,
    selectionStart,
    selectionEnd: selectionStart + wrapped.length
  };
}

function applyHeading(text: string, selectionStart: number, selectionEnd: number) {
  const blockStart = text.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
  const nextBreak = text.indexOf("\n", selectionEnd);
  const blockEnd = nextBreak === -1 ? text.length : nextBreak;
  const line = text.slice(blockStart, blockEnd);
  const existing = line.match(/^\s*(#{1,3})\s+/);
  const replacement = existing ? line.replace(/^\s*#{1,3}\s+/, "") : `## ${line}`;
  const value = `${text.slice(0, blockStart)}${replacement}${text.slice(blockEnd)}`;
  return { value, selectionStart: blockStart, selectionEnd: blockStart + replacement.length };
}

function applyTextStyle(text: string, selectionStart: number, selectionEnd: number, style: "body" | "heading" | "subheading") {
  const blockStart = text.lastIndexOf("\n", Math.max(0, selectionStart - 1)) + 1;
  const nextBreak = text.indexOf("\n", selectionEnd);
  const blockEnd = nextBreak === -1 ? text.length : nextBreak;
  const line = text.slice(blockStart, blockEnd).replace(/^\s*#{1,3}\s+/, "");
  const prefix = style === "heading" ? "# " : style === "subheading" ? "## " : "";
  const replacement = `${prefix}${line}`;
  return { value: `${text.slice(0, blockStart)}${replacement}${text.slice(blockEnd)}`, selectionStart: blockStart, selectionEnd: blockStart + replacement.length };
}

export type InlineEditableTextProps = {
  value: string;
  onCommit: (value: string) => void;
  onCancel?: () => void;
  onRequestEdit?: () => void;
  onEditingChange?: (editing: boolean) => void;
  /** Leave undefined for a self-managed editing state. */
  editing?: boolean;
  placeholder?: string;
  label?: ReactNode;
  helpText?: ReactNode;
  error?: ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
  editorClassName?: string;
};

/**
 * A deliberately small, plain-text single-line editor. The display state is
 * useful for forms and board annotations; the editing state owns a draft until
 * the GM explicitly commits it.
 */
export function InlineEditableText({
  value,
  onCommit,
  onCancel,
  onRequestEdit,
  onEditingChange,
  editing,
  placeholder = "Add text",
  label,
  helpText,
  error,
  ariaLabel = "Edit text",
  disabled = false,
  className,
  editorClassName
}: InlineEditableTextProps) {
  const id = useId();
  const controlled = editing !== undefined;
  const [internalEditing, setInternalEditing] = useState(false);
  const active = editing ?? internalEditing;
  const [draft, setDraft] = useState(value);
  const [original, setOriginal] = useState(value);
  const dirty = useRef(false);
  const wasActive = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active && !wasActive.current) {
      setDraft(value);
      setOriginal(value);
      dirty.current = false;
    } else if (!active) {
      setDraft(value);
      setOriginal(value);
      dirty.current = false;
    }
    wasActive.current = active;
  }, [active, value]);

  useEffect(() => {
    if (!active) return;
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, [active]);

  const setActive = (next: boolean) => {
    if (!controlled) setInternalEditing(next);
    onEditingChange?.(next);
  };

  const begin = () => {
    if (disabled || active) return;
    onRequestEdit?.();
    setDraft(value);
    setOriginal(value);
    dirty.current = false;
    setActive(true);
  };

  const commit = () => {
    onCommit(draft);
    dirty.current = false;
    setOriginal(draft);
    setActive(false);
  };

  const cancel = () => {
    setDraft(original);
    dirty.current = false;
    onCancel?.();
    setActive(false);
  };

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (event.relatedTarget instanceof Node && frameRef.current?.contains(event.relatedTarget)) return;
    commit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    stopEditorEvent(event);
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancel();
    }
  };

  if (!active) {
    return (
      <span
        className={[styles.display, disabled && styles.disabled, className].filter(Boolean).join(" ")}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        aria-label={`${ariaLabel}: ${value || placeholder}`}
        onClick={begin}
        onDoubleClick={stopEditorEvent}
        onKeyDown={(event) => {
          stopEditorEvent(event);
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            begin();
          }
        }}
      >
        {value || <span className={styles.placeholder}>{placeholder}</span>}
      </span>
    );
  }

  const described = describedBy(id, helpText, error);
  const shortcutId = `${id}-shortcut`;
  return (
    <FieldChrome id={id} label={label} helpText={helpText} error={error}>
      <div
        ref={frameRef}
        className={[styles.editor, className].filter(Boolean).join(" ")}
        data-editing="true"
        onBlur={onBlur}
        onDoubleClick={stopEditorEvent}
        onKeyDown={onKeyDown}
        onPointerDown={stopEditorEvent}
      >
        <input
          ref={inputRef}
          id={id}
          className={[styles.input, editorClassName].filter(Boolean).join(" ")}
          value={draft}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={label ? undefined : ariaLabel}
          aria-invalid={error ? true : undefined}
          aria-describedby={[described, shortcutId].filter(Boolean).join(" ")}
          onChange={(event) => {
            dirty.current = true;
            setDraft(event.target.value);
          }}
        />
        <span id={shortcutId} className={styles.srOnly}>
          Press Enter to save or Escape to cancel.
        </span>
        <EditorToolbar onCommit={commit} onCancel={cancel} />
      </div>
    </FieldChrome>
  );
}

export type WritingEditorProps = {
  value: string;
  onDraftChange?: (value: string) => void;
  commitOnBlur?: boolean;
  showCommitActions?: boolean;
  onCommit: (value: string) => void;
  onCancel?: () => void;
  placeholder?: string;
  label?: ReactNode;
  helpText?: ReactNode;
  error?: ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
  rows?: number;
  className?: string;
  editorClassName?: string;
};

/** A multiline plain-text writing surface with an explicit commit boundary. */
export function WritingEditor({
  value,
  onDraftChange,
  commitOnBlur = true,
  showCommitActions = true,
  onCommit,
  onCancel,
  placeholder = "Write a note",
  label,
  helpText,
  error,
  ariaLabel = "Write text",
  disabled = false,
  rows = 4,
  className,
  editorClassName
}: WritingEditorProps) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [original, setOriginal] = useState(value);
  const dirty = useRef(false);
  const settling = useRef(false);
  const listSelection = useRef<{ start: number; end: number } | null>(null);
  const markSelection = useRef<{ start: number; end: number } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingSelection = useRef<{ start: number; end: number } | null>(null);

  useEffect(() => {
    if (!dirty.current) {
      setDraft(value);
      setOriginal(value);
    }
  }, [value]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }, []);

  const commit = () => {
    if (settling.current || disabled) return;
    settling.current = true;
    onCommit(draft);
    dirty.current = false;
    setOriginal(draft);
    queueMicrotask(() => {
      settling.current = false;
    });
  };

  const cancel = () => {
    if (settling.current) return;
    settling.current = true;
    setDraft(original);
    dirty.current = false;
    onCancel?.();
    queueMicrotask(() => {
      settling.current = false;
    });
  };

  const applyList = (kind: ListKind) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const selection = listSelection.current ?? {
      start: textarea.selectionStart,
      end: textarea.selectionEnd
    };
    listSelection.current = null;
    const result = applyTextList(draft, selection.start, selection.end, kind);
    dirty.current = true;
    setDraft(result.value);
    onDraftChange?.(result.value);
    pendingSelection.current = { start: result.selectionStart, end: result.selectionEnd };
  };

  const applyMark = (mark: "**" | "_") => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const selection = markSelection.current ?? { start: textarea.selectionStart, end: textarea.selectionEnd };
    markSelection.current = null;
    const result = applyInlineMark(draft, selection.start, selection.end, mark);
    dirty.current = true;
    setDraft(result.value);
    onDraftChange?.(result.value);
    pendingSelection.current = { start: result.selectionStart, end: result.selectionEnd };
  };

  const applyHeadingMark = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const selection = markSelection.current ?? { start: textarea.selectionStart, end: textarea.selectionEnd };
    markSelection.current = null;
    const result = applyHeading(draft, selection.start, selection.end);
    dirty.current = true;
    setDraft(result.value);
    onDraftChange?.(result.value);
    pendingSelection.current = { start: result.selectionStart, end: result.selectionEnd };
  };

  const applyStyle = (style: "body" | "heading" | "subheading") => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const selection = markSelection.current ?? { start: textarea.selectionStart, end: textarea.selectionEnd };
    markSelection.current = null;
    const result = applyTextStyle(draft, selection.start, selection.end, style);
    dirty.current = true;
    setDraft(result.value);
    onDraftChange?.(result.value);
    pendingSelection.current = { start: result.selectionStart, end: result.selectionEnd };
  };

  useLayoutEffect(() => {
    const selection = pendingSelection.current;
    const textarea = textareaRef.current;
    if (!selection || !textarea) return;
    pendingSelection.current = null;
    textarea.focus();
    textarea.setSelectionRange(selection.start, selection.end);
  }, [draft]);

  const commitRef = useRef(commit);
  commitRef.current = commit;

  useEffect(() => {
    if (!commitOnBlur) return;
    const onDocumentPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && frameRef.current?.contains(event.target)) return;
      commitRef.current();
    };
    document.addEventListener("pointerdown", onDocumentPointerDown, true);
    return () => document.removeEventListener("pointerdown", onDocumentPointerDown, true);
  }, [commitOnBlur]);

  const onBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!commitOnBlur) return;
    if (event.relatedTarget instanceof Node && frameRef.current?.contains(event.relatedTarget)) return;
    commit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    stopEditorEvent(event);
    if ((event.metaKey || event.ctrlKey) && ["b", "i"].includes(event.key.toLowerCase())) {
      event.preventDefault();
      applyMark(event.key.toLowerCase() === "b" ? "**" : "_");
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
      return;
    }
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      commit();
    }
  };

  const described = describedBy(id, helpText, error);
  const shortcutId = `${id}-shortcut`;
  const describedWithShortcut = [described, shortcutId].filter(Boolean).join(" ");
  return (
    <FieldChrome id={id} label={label} helpText={helpText} error={error}>
      <div
        ref={frameRef}
        className={[styles.editor, styles.writingEditor, className].filter(Boolean).join(" ")}
        data-editing="true"
        onBlur={onBlur}
        onDoubleClick={stopEditorEvent}
        onKeyDown={onKeyDown}
        onPointerDown={stopEditorEvent}
      >
        <textarea
          ref={textareaRef}
          id={id}
          className={[styles.textarea, editorClassName].filter(Boolean).join(" ")}
          rows={rows}
          value={draft}
          placeholder={placeholder}
          disabled={disabled}
          spellCheck
          aria-label={label ? undefined : ariaLabel}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedWithShortcut}
          onChange={(event) => {
            dirty.current = true;
            setDraft(event.target.value);
            onDraftChange?.(event.target.value);
          }}
        />
        <span id={shortcutId} className={styles.srOnly}>
          Press Cmd or Ctrl plus Enter to save, or Escape to cancel.
        </span>
        <EditorToolbar
          onCommit={commit}
          onCancel={cancel}
          onMark={applyMark}
          onHeading={applyHeadingMark}
          onStyle={applyStyle}
          onList={applyList}
          onListPointerDown={() => {
            const textarea = textareaRef.current;
            if (textarea) listSelection.current = { start: textarea.selectionStart, end: textarea.selectionEnd };
          }}
          onMarkPointerDown={() => {
            const textarea = textareaRef.current;
            if (textarea) markSelection.current = { start: textarea.selectionStart, end: textarea.selectionEnd };
          }}
          multiline
          showCommitActions={showCommitActions}
        />
      </div>
    </FieldChrome>
  );
}

function EditorToolbar({
  onCommit,
  onCancel,
  onMark,
  onHeading,
  onStyle,
  onList,
  onListPointerDown,
  onMarkPointerDown,
  showCommitActions = true,
  multiline = false
}: {
  onCommit: () => void;
  onCancel: () => void;
  onMark?: (mark: "**" | "_") => void;
  onHeading?: () => void;
  onStyle?: (style: "body" | "heading" | "subheading") => void;
  onList?: (kind: ListKind) => void;
  onListPointerDown?: () => void;
  onMarkPointerDown?: () => void;
  showCommitActions?: boolean;
  multiline?: boolean;
}) {
  const onButtonClick = (event: MouseEvent<HTMLButtonElement>, action: () => void) => {
    stopEditorEvent(event);
    action();
  };

  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Writing actions">
      {multiline && onMark && onHeading ? <div className={styles.formatActions} aria-label="Text formatting">
        <button type="button" className={styles.formatButton} aria-label="Bold" title="Bold" onPointerDown={event => { onMarkPointerDown?.(); event.preventDefault(); stopEditorEvent(event); }} onClick={event => onButtonClick(event, () => onMark("**"))}><strong>B</strong></button>
        <button type="button" className={styles.formatButton} aria-label="Italic" title="Italic" onPointerDown={event => { onMarkPointerDown?.(); event.preventDefault(); stopEditorEvent(event); }} onClick={event => onButtonClick(event, () => onMark("_"))}><em>I</em></button>
        <button type="button" className={styles.formatButton} aria-label="Heading" title="Heading" onPointerDown={event => { onMarkPointerDown?.(); event.preventDefault(); stopEditorEvent(event); }} onClick={event => onButtonClick(event, onHeading)}>H</button>
        {onStyle ? <select className={styles.styleSelect} aria-label="Text style" title="Text style" defaultValue="body" onPointerDown={event => { onMarkPointerDown?.(); stopEditorEvent(event); }} onChange={event => onStyle(event.target.value as "body" | "heading" | "subheading")}><option value="body">Body</option><option value="heading">Heading</option><option value="subheading">Subheading</option></select> : null}
      </div> : null}
      {multiline && onList ? (
        <div className={styles.listActions} aria-label="Text list actions">
          <button
            type="button"
            className={styles.listButton}
            aria-label="Bulleted list"
            title="Bulleted list"
            onPointerDown={(event) => {
              onListPointerDown?.();
              event.preventDefault();
              stopEditorEvent(event);
            }}
            onMouseDown={(event) => {
              onListPointerDown?.();
              event.preventDefault();
              stopEditorEvent(event);
            }}
            onClick={(event) => onButtonClick(event, () => onList("bullet"))}
          >
            <ListGlyph numbered={false} />
          </button>
          <button
            type="button"
            className={styles.listButton}
            aria-label="Numbered list"
            title="Numbered list"
            onPointerDown={(event) => {
              onListPointerDown?.();
              event.preventDefault();
              stopEditorEvent(event);
            }}
            onMouseDown={(event) => {
              onListPointerDown?.();
              event.preventDefault();
              stopEditorEvent(event);
            }}
            onClick={(event) => onButtonClick(event, () => onList("numbered"))}
          >
            <ListGlyph numbered />
          </button>
        </div>
      ) : null}
      {showCommitActions ? <><button type="button" className={styles.done} title={multiline ? "Done (Cmd/Ctrl+Enter)" : "Done (Enter)"} onClick={(event) => onButtonClick(event, onCommit)}>
        Done
      </button>
      <button type="button" className={styles.cancel} title="Cancel (Escape)" onClick={(event) => onButtonClick(event, onCancel)}>
        Cancel
      </button></> : null}
    </div>
  );
}

function ListGlyph({ numbered }: { numbered: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" aria-hidden="true" focusable="false">
      {numbered ? (
        <>
          <path d="M1.75 3.1h1.1v2.8M1.75 5.9h1.1" />
          <path d="M6 3.5h7M6 5.5h7M6 9.5h7M6 11.5h7" />
          <path d="M2 9.1c.5-.6 1.8-.4 1.8.4 0 .8-1.7 1.2-1.9 2h2" />
        </>
      ) : (
        <>
          <circle cx="2.2" cy="4" r=".8" />
          <circle cx="2.2" cy="10" r=".8" />
          <path d="M6 3.5h7M6 5.5h7M6 9.5h7M6 11.5h7" />
        </>
      )}
    </svg>
  );
}
