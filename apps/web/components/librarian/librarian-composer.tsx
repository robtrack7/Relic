"use client";

import {
  forwardRef,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  type FormEvent,
  type KeyboardEvent,
  type RefObject
} from "react";

import { IconButton } from "@/components/ui/control";

import styles from "./librarian-composer.module.css";

export type LibrarianComposerStatus = "idle" | "opening" | "submitting" | "unavailable";

export type LibrarianComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  status?: LibrarianComposerStatus;
  inputRef?: RefObject<HTMLTextAreaElement | null>;
  scope?: string;
  placeholder?: string;
  /** Allows a parent carriage to label the request field without changing the visual treatment. */
  ariaLabel?: string;
};

const MAX_LENGTH = 4000;

/**
 * The single Librarian entry point for questions, retrieval, and authorized work.
 * Request lifecycle and draft persistence belong to the owning carriage; this
 * component owns only the input affordance and its keyboard contract.
 */
export const LibrarianComposer = forwardRef<HTMLTextAreaElement, LibrarianComposerProps>(
  function LibrarianComposer(
    {
      value,
      onChange,
      onSubmit,
      status = "idle",
      inputRef,
      scope,
      placeholder = "Ask about this world…",
      ariaLabel = "Ask the Librarian"
    },
    forwardedRef
  ) {
    const localRef = useRef<HTMLTextAreaElement | null>(null);
    const composing = useRef(false);
    const describedById = `librarian-composer-status-${useId().replace(/:/g, "")}`;
    const unavailable = status === "unavailable";
    const canSubmit = status === "idle" && value.trim().length > 0;

    const setInputRef = useCallback(
      (node: HTMLTextAreaElement | null) => {
        localRef.current = node;
        if (typeof forwardedRef === "function") forwardedRef(node);
        else if (forwardedRef) forwardedRef.current = node;
        if (inputRef) inputRef.current = node;
      },
      [forwardedRef, inputRef]
    );

    const resize = useCallback(() => {
      const input = localRef.current;
      if (!input) return;
      input.style.height = "auto";
      const stylesForInput = window.getComputedStyle(input);
      const lineHeight = Number.parseFloat(stylesForInput.lineHeight) || 22;
      const padding = Number.parseFloat(stylesForInput.paddingBlockStart) + Number.parseFloat(stylesForInput.paddingBlockEnd);
      const minHeight = lineHeight * 2 + padding;
      const maxHeight = lineHeight * 6 + padding;
      input.style.height = `${Math.min(maxHeight, Math.max(minHeight, input.scrollHeight))}px`;
      input.style.overflowY = input.scrollHeight > maxHeight ? "auto" : "hidden";
    }, []);

    useLayoutEffect(() => {
      resize();
      const input = localRef.current;
      if (!input || typeof ResizeObserver === "undefined") return;
      const observer = new ResizeObserver(resize);
      observer.observe(input);
      return () => observer.disconnect();
    }, [resize, value]);

    const submit = useCallback(
      (event?: FormEvent<HTMLFormElement>) => {
        event?.preventDefault();
        if (!canSubmit) return;
        onSubmit();
      },
      [canSubmit, onSubmit]
    );

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key !== "Enter" || composing.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
      const modifierSubmit = event.metaKey || event.ctrlKey;
      if (modifierSubmit || !event.shiftKey) {
        event.preventDefault();
        if (canSubmit) onSubmit();
      }
    };

    const stateText =
      status === "opening"
        ? "Opening the Librarian"
        : status === "submitting"
          ? "The Librarian is reading"
          : unavailable
            ? "The Librarian is unavailable"
            : "Ready to send";

    return (
      <form className={styles.composer} onSubmit={submit} aria-label="Librarian composer">
        {scope ? (
          <p className={styles.scope} title={scope}>
            <span className={styles.scopeMark} data-status={status} aria-hidden="true" />
            <span>{scope}</span>
          </p>
        ) : null}
        <div className={styles.inputFrame} data-status={status}>
          <textarea
            ref={setInputRef}
            className={styles.input}
            value={value}
            rows={2}
            maxLength={MAX_LENGTH}
            placeholder={placeholder}
            aria-label={ariaLabel}
            aria-describedby={describedById}
            onChange={(event) => onChange(event.target.value)}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={() => {
              composing.current = false;
            }}
            onKeyDown={handleKeyDown}
          />
          <IconButton
            type="submit"
            className={styles.send}
            label="Send message"
            title={unavailable ? "The Librarian is unavailable" : "Send message"}
            variant="primary"
            disabled={!canSubmit}
            loading={status === "submitting"}
          >
            {status === "submitting" ? null : <ArrowUpIcon />}
          </IconButton>
        </div>
        <div className={styles.meta}>
          <span id={describedById} role="status" aria-live="polite">
            {stateText}
          </span>
          <span className={styles.shortcut}>
            <kbd>Enter</kbd> send · <kbd>Shift&nbsp;Enter</kbd> new line
          </span>
        </div>
      </form>
    );
  }
);

function ArrowUpIcon() {
  return (
    <svg className={styles.arrow} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </svg>
  );
}

LibrarianComposer.displayName = "LibrarianComposer";
