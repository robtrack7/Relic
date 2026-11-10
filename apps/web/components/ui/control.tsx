"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject
} from "react";
import { createPortal } from "react-dom";

import { positionFloatingSurface, TOOLTIP_GAP, TOOLTIP_MARGIN, visualViewportRect, type FloatingSide } from "./floating-position";
import styles from "./control.module.css";

export type ControlVariant = "quiet" | "secondary" | "primary" | "destructive";
export type ControlDensity = "normal" | "compact";

type SharedControlProps = {
  variant?: ControlVariant;
  density?: ControlDensity;
  loading?: boolean;
};

function controlClassName(
  kind: "button" | "iconButton" | "toggleButton",
  variant: ControlVariant,
  density: ControlDensity,
  className?: string
) {
  return [styles[kind], styles[variant], styles[density], className].filter(Boolean).join(" ");
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  SharedControlProps & {
    label?: string;
    children?: ReactNode;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    label,
    children,
    variant = "secondary",
    density = "normal",
    loading = false,
    className,
    disabled,
    type,
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={controlClassName("button", variant, density, className)}
      disabled={disabled || loading}
      {...props}
      aria-busy={loading || undefined}
    >
      {loading ? <span className={styles.loadingMark} aria-hidden="true" /> : null}
      {label ?? children}
    </button>
  );
});

function Tooltip({ id, label, anchorRef, open, placement }: { id: string; label: string; anchorRef: RefObject<HTMLButtonElement | null>; open: boolean; placement: FloatingSide }) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const position = useCallback(() => {
    const anchor = anchorRef.current;
    const tooltip = tooltipRef.current;
    if (!anchor || !tooltip) return;
    const next = positionFloatingSurface({
      trigger: anchor.getBoundingClientRect(),
      panel: tooltip.getBoundingClientRect(),
      placement,
      viewport: visualViewportRect(),
      gap: TOOLTIP_GAP,
      margin: TOOLTIP_MARGIN
    });
    tooltip.style.left = `${next.left}px`;
    tooltip.style.top = `${next.top}px`;
  }, [anchorRef, placement]);
  useLayoutEffect(() => {
    if (!open || typeof window === "undefined") return;
    position();
    const anchor = anchorRef.current;
    const tooltip = tooltipRef.current;
    if (!anchor || !tooltip) return;
    const observer = new ResizeObserver(position);
    observer.observe(anchor);
    observer.observe(tooltip);
    const centralWorkspace = anchor.closest("[data-left-mode]")?.querySelector<HTMLElement>('[data-layer="central-workspace"]');
    if (centralWorkspace) observer.observe(centralWorkspace);
    const visualViewport = window.visualViewport;
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    visualViewport?.addEventListener("resize", position);
    visualViewport?.addEventListener("scroll", position);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
      visualViewport?.removeEventListener("resize", position);
      visualViewport?.removeEventListener("scroll", position);
    };
  }, [anchorRef, open, placement, position]);
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div ref={tooltipRef} id={id} className={styles.tooltip} role="tooltip" style={{ top: 0, left: 0 }}>
      {label}
    </div>,
    document.body
  );
}

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  SharedControlProps & {
    label: string;
    children: ReactNode;
    tooltipPlacement?: FloatingSide;
  };

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    label,
    children,
    variant = "quiet",
    density = "normal",
    loading = false,
    tooltipPlacement = "bottom",
    className,
    disabled,
    type,
    title,
    onFocus,
    onBlur,
    onPointerEnter,
    onPointerLeave,
    onKeyDown,
    onClick,
    "aria-describedby": describedBy,
    ...props
  },
  forwardedRef
) {
  const localRef = useRef<HTMLButtonElement>(null);
  const tooltipId = `relic-tooltip-${useId().replace(/:/g, "")}`;
  const [interaction, setInteraction] = useState(false);
  const ref = useCallback(
    (node: HTMLButtonElement | null) => {
      localRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef]
  );
  const showTooltip = useCallback(() => {
    if (!disabled && !loading) {
      setInteraction(true);
    }
  }, [disabled, loading]);
  const hideTooltip = useCallback(() => {
    setInteraction(false);
  }, []);

  useEffect(() => {
    if (!interaction) return;
    const dismiss = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") hideTooltip();
    };
    window.addEventListener("keydown", dismiss);
    return () => {
      window.removeEventListener("keydown", dismiss);
    };
  }, [hideTooltip, interaction]);

  return (
    <>
      <button
        ref={ref}
        type={type ?? "button"}
        className={controlClassName("iconButton", variant, density, className)}
        disabled={disabled || loading}
        {...props}
        aria-label={label}
        aria-describedby={[describedBy, interaction ? tooltipId : undefined].filter(Boolean).join(" ") || undefined}
        aria-busy={loading || undefined}
        onFocus={(event) => {
          showTooltip();
          onFocus?.(event);
        }}
        onBlur={(event) => {
          hideTooltip();
          onBlur?.(event);
        }}
        onPointerEnter={(event) => {
          showTooltip();
          onPointerEnter?.(event);
        }}
        onPointerLeave={(event) => {
          hideTooltip();
          onPointerLeave?.(event);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") hideTooltip();
          onKeyDown?.(event);
        }}
        onClick={(event) => {
          hideTooltip();
          onClick?.(event);
        }}
      >
        {loading ? <span className={styles.loadingMark} aria-hidden="true" /> : children}
      </button>
      <Tooltip id={tooltipId} label={title ?? label} anchorRef={localRef} open={interaction} placement={tooltipPlacement} />
    </>
  );
});

export type ButtonGroupProps = HTMLAttributes<HTMLDivElement> & {
  label?: string;
};

export function ButtonGroup({ label, className, ...props }: ButtonGroupProps) {
  return (
    <div
      {...props}
      className={[styles.buttonGroup, className].filter(Boolean).join(" ")}
      role={props.role ?? "group"}
      aria-label={label ?? props["aria-label"]}
    />
  );
}

export type ToggleButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-pressed"> &
  SharedControlProps & {
    pressed?: boolean;
    defaultPressed?: boolean;
    onPressedChange?: (pressed: boolean) => void;
    label?: string;
    children?: ReactNode;
  };

export const ToggleButton = forwardRef<HTMLButtonElement, ToggleButtonProps>(function ToggleButton(
  {
    pressed,
    defaultPressed = false,
    onPressedChange,
    label,
    children,
    variant = "quiet",
    density = "normal",
    loading = false,
    disabled,
    className,
    type,
    onClick,
    ...props
  },
  ref
) {
  const [uncontrolledPressed, setUncontrolledPressed] = useState(defaultPressed);
  const isPressed = pressed ?? uncontrolledPressed;
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || disabled || loading) return;
    const next = !isPressed;
    if (pressed === undefined) setUncontrolledPressed(next);
    onPressedChange?.(next);
  };
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={controlClassName("toggleButton", variant, density, className)}
      disabled={disabled || loading}
      {...props}
      aria-pressed={isPressed}
      aria-busy={loading || undefined}
      onClick={handleClick}
    >
      {loading ? <span className={styles.loadingMark} aria-hidden="true" /> : null}
      {label ?? children}
    </button>
  );
});

export type SegmentedOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SegmentedControlProps = Omit<HTMLAttributes<HTMLDivElement>, "onChange"> &
  SharedControlProps & {
    options: readonly SegmentedOption[];
    value?: string;
    defaultValue?: string;
    onValueChange?: (value: string) => void;
    disabled?: boolean;
  };

export function SegmentedControl({
  options,
  value,
  defaultValue,
  onValueChange,
  variant = "secondary",
  density = "normal",
  disabled = false,
  className,
  ...props
}: SegmentedControlProps) {
  const firstEnabled = options.find((option) => !option.disabled)?.value;
  const [internalValue, setInternalValue] = useState(defaultValue ?? firstEnabled ?? "");
  const selectedValue = value ?? internalValue;
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const select = useCallback(
    (nextValue: string) => {
      if (value === undefined) setInternalValue(nextValue);
      onValueChange?.(nextValue);
    },
    [onValueChange, value]
  );
  const enabledIndices = options.reduce<number[]>((indices, option, index) => {
    if (!option.disabled) indices.push(index);
    return indices;
  }, []);
  const selectedIndex = options.findIndex((option) => option.value === selectedValue);
  const focusOption = (index: number) => {
    const option = options[index];
    if (!option || option.disabled || disabled) return;
    select(option.value);
    optionRefs.current[index]?.focus();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (enabledIndices.length === 0) return;
    const enabledPosition = Math.max(0, enabledIndices.indexOf(index));
    const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
    const nextPosition = event.key === "Home" ? 0 : event.key === "End" ? enabledIndices.length - 1 : (enabledPosition + direction + enabledIndices.length) % enabledIndices.length;
    const nextIndex = enabledIndices[nextPosition] ?? index;
    focusOption(nextIndex);
  };
  return (
    <div
      {...props}
      className={[styles.segmentedControl, styles[density], className].filter(Boolean).join(" ")}
      role="radiogroup"
    >
      {options.map((option, index) => (
        <button
          key={option.value}
          ref={(node) => {
            optionRefs.current[index] = node;
          }}
          type="button"
          className={[styles.segment, styles[variant], option.value === selectedValue ? styles.selected : ""].filter(Boolean).join(" ")}
          role="radio"
          aria-checked={option.value === selectedValue}
          disabled={disabled || option.disabled}
          tabIndex={option.value === selectedValue || (selectedIndex < 0 && index === enabledIndices[0]) ? 0 : -1}
          onClick={() => select(option.value)}
          onKeyDown={(event) => handleKeyDown(event, index)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
