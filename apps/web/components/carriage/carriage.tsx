"use client";

import {
  useCallback,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject
} from "react";

import { IconButton } from "@/components/ui/control";

import styles from "./carriage.module.css";

export type CarriageSide = "left" | "right";
export type CarriageMode = "docked" | "overlay" | "study";
export type CarriageVariant = "prepare" | "stage" | "librarian" | "neutral";

export type CarriageShellProps = {
  side: CarriageSide;
  mode?: CarriageMode;
  width?: number;
  minWidth?: number;
  maxWidth?: number;
  resizable?: boolean;
  ariaLabel: string;
  id?: string;
  variant?: CarriageVariant;
  header: ReactNode;
  context?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  scrollRef?: RefObject<HTMLDivElement | null>;
  onWidthChange?: (width: number) => void;
};

type ResizeGesture = {
  pointerId: number;
  startX: number;
  startWidth: number;
};

export function clampCarriageWidth(width: number, minWidth: number, maxWidth: number) {
  return Math.min(maxWidth, Math.max(minWidth, Math.round(width)));
}

export function resizedCarriageWidth(
  startWidth: number,
  deltaX: number,
  side: CarriageSide,
  minWidth: number,
  maxWidth: number
) {
  const directionalDelta = side === "left" ? deltaX : -deltaX;
  return clampCarriageWidth(startWidth + directionalDelta, minWidth, maxWidth);
}

export function CarriageShell({
  side,
  mode = "docked",
  width = 320,
  minWidth = 264,
  maxWidth = 440,
  resizable = false,
  ariaLabel,
  id,
  variant = "neutral",
  header,
  context,
  actions,
  children,
  footer,
  scrollRef,
  onWidthChange
}: CarriageShellProps) {
  const resizeGesture = useRef<ResizeGesture | null>(null);

  const beginResize = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (!resizable || !onWidthChange) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      resizeGesture.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startWidth: width
      };
    },
    [onWidthChange, resizable, width]
  );

  const continueResize = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const gesture = resizeGesture.current;
      if (!gesture || gesture.pointerId !== event.pointerId || !onWidthChange) return;
      onWidthChange(
        resizedCarriageWidth(
          gesture.startWidth,
          event.clientX - gesture.startX,
          side,
          minWidth,
          maxWidth
        )
      );
    },
    [maxWidth, minWidth, onWidthChange, side]
  );

  const endResize = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    if (resizeGesture.current?.pointerId !== event.pointerId) return;
    resizeGesture.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  return (
    <aside
      className={styles.shell}
      id={id}
      data-carriage-side={side}
      data-carriage-mode={mode}
      data-carriage-variant={variant}
      aria-label={ariaLabel}
      style={{ "--carriage-width": `${width}px` } as CSSProperties}
    >
      {header}
      {context ? <div className={styles.context}>{context}</div> : null}
      <div ref={scrollRef} className={styles.scrollRegion} data-testid={`${ariaLabel}-scroll-region`}>
        {children ?? <CarriageEmpty />}
      </div>
      {actions ? <div className={styles.actions} role="group" aria-label={`${ariaLabel} actions`}>{actions}</div> : null}
      {footer}
      {resizable && onWidthChange ? (
        <button
          type="button"
          className={styles.resizeHandle}
          aria-label={`Resize ${ariaLabel}`}
          title={`Resize ${ariaLabel}`}
          onPointerDown={beginResize}
          onPointerMove={continueResize}
          onPointerUp={endResize}
          onPointerCancel={endResize}
          onLostPointerCapture={() => {
            resizeGesture.current = null;
          }}
          onKeyDown={(event) => {
            if (event.key === "Home") onWidthChange(minWidth);
            else if (event.key === "End") onWidthChange(maxWidth);
            else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              onWidthChange(resizedCarriageWidth(width, event.key === "ArrowRight" ? 16 : -16, side, minWidth, maxWidth));
            } else return;
            event.preventDefault();
          }}
        />
      ) : null}
    </aside>
  );
}

export function CarriageHeader({
  side,
  title,
  eyebrow,
  status,
  icon,
  actions,
  variant = "neutral",
  statusTone,
  onCollapse
}: {
  side: CarriageSide;
  title: string;
  eyebrow?: string;
  status?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  variant?: CarriageVariant;
  statusTone?: "draft" | "ready" | "quiet";
  onCollapse?: () => void;
}) {
  const identity = (
    <div className={styles.identity}>
      {side === "left" ? <span className={styles.icon}>{icon ?? <CarriageIcon kind={variant} />}</span> : null}
      <div className={styles.titles}>
        <div className={styles.titleLine}><h2>{title}</h2></div>
        <div className={styles.subtitle}>
          {status ? <span className={styles.status} role="status" data-tone={statusTone ?? (variant === "prepare" ? "draft" : variant === "stage" || variant === "librarian" ? "ready" : "quiet")}>{status}</span> : null}
          {eyebrow ? <span className={styles.eyebrow}>{eyebrow}</span> : null}
        </div>
      </div>
      {side === "right" ? <span className={styles.icon}>{icon ?? <CarriageIcon kind={variant} />}</span> : null}
    </div>
  );
  const controls = (
    <div className={styles.headerActions}>
      {side === "left" ? actions : null}
      {onCollapse ? <IconButton label={`Collapse ${title} carriage`} onClick={onCollapse}>
        <CarriageIcon kind={side === "left" ? "collapse-left" : "collapse-right"} />
      </IconButton> : null}
      {side === "right" ? actions : null}
    </div>
  );
  return (
    <header className={styles.header} data-variant={variant} data-side={side}>
      {side === "right" ? controls : identity}
      {side === "right" ? identity : controls}
    </header>
  );
}

export function CarriageSection({
  title,
  meta,
  actions,
  children,
  emptyMessage = "Nothing is pinned here yet.",
  density = "normal",
  collapsible = false,
  defaultOpen = true
}: {
  title?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  emptyMessage?: string;
  density?: "normal" | "compact";
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();
  return (
    <section className={styles.section} data-density={density}>
      {title || meta || actions ? (
        <div className={styles.sectionHeader}>
          <div className={styles.sectionLabel}>
            {title ? <h3>{collapsible ? <button type="button" className={styles.sectionToggle} aria-expanded={open} aria-controls={contentId} onClick={() => setOpen(!open)}><CarriageIcon kind="chevron" /><span>{title}</span></button> : title}</h3> : null}
            {meta ? <span>{meta}</span> : null}
          </div>
          {actions ? <div className={styles.sectionActions}>{actions}</div> : null}
        </div>
      ) : null}
      <div id={contentId} hidden={collapsible && !open} className={styles.sectionContent}>
        {children ?? <p className={styles.empty}>{emptyMessage}</p>}
      </div>
    </section>
  );
}

export function CarriageIcon({ kind }: { kind: CarriageVariant | "collapse-left" | "collapse-right" | "chevron" | "chevron-up" | "close" | "pin" }) {
  const paths = {
    prepare: <><path d="M12 5c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1Z" /><path d="M12 5v14" /></>,
    stage: <path d="M2 12h4l3-8 4 16 3-10 2 2h4" />,
    librarian: <><circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="2" /><path d="m12 1 2 9 9 2-9 2-2 9-2-9-9-2 9-2 2-9Z" /></>,
    neutral: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 4v16M9 10h11" /></>,
    "collapse-left": <path d="m13 7-5 5 5 5m5-10-5 5 5 5" />,
    "collapse-right": <path d="m6 7 5 5-5 5m5-10 5 5-5 5" />,
    chevron: <path d="m8 10 4 4 4-4" />,
    "chevron-up": <path d="m8 14 4-4 4 4" />,
    close: <path d="m7 7 10 10M17 7 7 17" />,
    pin: <><path d="m8 3 8 0-1 6 3 4H6l3-4-1-6ZM12 13v8" /></>
  };
  return <svg className={styles.glyph} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[kind]}</svg>;
}

export function CarriageFooter({ children }: { children: ReactNode }) {
  return <footer className={styles.footer}>{children}</footer>;
}

/** The same recognizable dock handle is used by every collapsed carriage. */
export function CarriageLauncher({ label, side, variant, controls, onOpen }: {
  label: string; side: CarriageSide; variant: CarriageVariant; controls: string; onOpen: () => void;
}) {
  return <button type="button" className={styles.launcher} data-side={side} data-variant={variant}
    data-carriage-toggle={side} aria-label={`Open ${label} carriage`} aria-expanded={false}
    aria-controls={controls} onClick={onOpen}>
    {side === "right" ? <CarriageIcon kind="collapse-left" /> : null}
    {side === "left" ? <span className={styles.launcherMark}><CarriageIcon kind={variant} /></span> : null}
    <span>{label}</span>
    {side === "right" ? <span className={styles.launcherMark}><CarriageIcon kind={variant} /></span> : <CarriageIcon kind="collapse-right" />}
  </button>;
}

export function CarriageEmpty({
  title = "This carriage is clear",
  detail = "Useful context will gather here as the work takes shape."
}: {
  title?: string;
  detail?: string;
}) {
  return (
    <div className={styles.shellEmpty}>
      <span>{title}</span>
      <p>{detail}</p>
    </div>
  );
}
