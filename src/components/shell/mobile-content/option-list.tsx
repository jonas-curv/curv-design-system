"use client";

import * as React from "react";
import { cn } from "../../../lib/cn";
import { CheckIcon, formatCount } from "./shared";

export type MobileOptionMode = "single" | "multiple";
const OptionModeContext = React.createContext<MobileOptionMode>("single");

export interface MobileOptionListProps {
  /** Names the group for assistive technology: "Brand". Required: a heading is for the eyes, this is for the ear. */
  label: string;
  /** single: one choice (a radio group; arrow keys move and choose). multiple: any number (each row is a toggle button). Default "single". */
  mode?: MobileOptionMode;
  /** An optional visible heading above the rows, in the same 14px grey as every section heading. */
  heading?: React.ReactNode;
  /** `MobileOptionRow`s. */
  children: React.ReactNode;
  className?: string;
}

const ARROWS = new Set(["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"]);

type RowElement = React.ReactElement<{ selected?: boolean; disabled?: boolean; tabIndex?: number }>;

/** A radio group is one stop in the tab order: the chosen row, or the first enabled one when nothing is chosen. Worked out here, from
 *  the rows' own props, so server markup already has it and no effect touches the DOM. A row the app gave a `tabIndex` keeps it. */
function withTabStop(children: React.ReactNode): React.ReactNode {
  const rows = React.Children.toArray(children);
  const isRow = (child: React.ReactNode): child is RowElement => React.isValidElement(child);
  const chosen = rows.findIndex(child => isRow(child) && child.props.selected && !child.props.disabled);
  const stop = chosen >= 0 ? chosen : rows.findIndex(child => isRow(child) && !child.props.disabled);
  return rows.map((child, index) => (isRow(child) && child.props.tabIndex === undefined ? React.cloneElement(child, { tabIndex: index === stop ? 0 : -1 }) : child));
}

/**
 * The rows of a filter or picker sheet (docs/mobile.md rule 7): large, with the label on the left, an optional count and
 * a check for what is chosen. Put it in `MobileSheet` and let each tap apply; the sheet's footer holds one `MobileButton`.
 * Several lists can sit in one sheet, one per filter, each with its own `heading`.
 */
export function MobileOptionList({ label, mode = "single", heading, children, className }: MobileOptionListProps) {
  const root = React.useRef<HTMLDivElement>(null);
  const hasHeading = heading != null && heading !== false;
  const single = mode === "single";

  const onKeyDown = single
    ? (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (!ARROWS.has(event.key)) return;
        const radios = Array.from(root.current?.querySelectorAll<HTMLElement>('[role="radio"]:not(:disabled)') ?? []);
        const at = radios.indexOf(event.target as HTMLElement);
        if (at < 0) return;
        event.preventDefault();
        const last = radios.length - 1;
        const next = event.key === "ArrowDown" || event.key === "ArrowRight" ? (at === last ? 0 : at + 1) : (at === 0 ? last : at - 1);
        // In a radio group the arrow chooses as it moves.
        radios[next].focus();
        radios[next].click();
      }
    : undefined;

  return (
    <OptionModeContext.Provider value={mode}>
      <div className={cn("curv-mobile-option-section", className)}>
        {hasHeading && <h3 className="curv-mobile-option-heading">{heading}</h3>}
        <div ref={root} className="curv-mobile-option-list" role={single ? "radiogroup" : "group"} aria-label={label} onKeyDown={onKeyDown}>
          {single ? withTabStop(children) : children}
        </div>
      </div>
    </OptionModeContext.Provider>
  );
}

export interface MobileOptionRowProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "role" | "aria-checked" | "aria-pressed" | "children"> {
  /** What the row says: "Nordic Hub". */
  children: React.ReactNode;
  /** Chosen: the row shows a check and says so (`aria-checked` in a single list, `aria-pressed` in a multiple one). */
  selected?: boolean;
  /** How many records the choice holds, in grey and tabular figures. Numbers get thousands separators; a string is shown as given. */
  count?: number | string;
}

/** One row of a `MobileOptionList`: 56px, 17px label, an optional count and a check. A `disabled` row is dimmed and not tappable. */
export const MobileOptionRow = React.forwardRef<HTMLButtonElement, MobileOptionRowProps>(function MobileOptionRow(
  { selected = false, count, className, type = "button", children, ...props }, ref,
) {
  const mode = React.useContext(OptionModeContext);
  const semantics = mode === "single" ? { role: "radio" as const, "aria-checked": selected } : { "aria-pressed": selected };
  const hasCount = count != null && count !== "";
  return (
    <button {...props} {...semantics} ref={ref} type={type} className={cn("curv-mobile-option", className)} data-selected={selected ? "true" : undefined}>
      <span className="curv-mobile-option-label">{children}</span>
      {hasCount && <><span className="curv-mobile-content-vh">, </span><span className="curv-mobile-option-count">{typeof count === "number" ? formatCount(count) : count}</span></>}
      {/* The check's slot is always there, so counts line up whether or not a row is chosen. */}
      <span className="curv-mobile-option-check" aria-hidden="true">{selected && <CheckIcon />}</span>
    </button>
  );
});
