"use client";

import * as React from "react";
import { MobileSheet } from "../mobile-command";
import { CheckIcon, formatCountValue, hasCount } from "./shared";

export interface MobileMoveOption {
  id: string;
  /** What the row says: "Move to Review". */
  label: string;
  /** How many records the target already holds. A number gets thousands separators; a string ("12+") is shown as given. */
  count?: number | string;
  /** Shown, dimmed and not tappable. */
  disabled?: boolean;
  /** Where the record is now: shown with a check, not tappable. A list that leaves the current stage out needs no such row. */
  current?: boolean;
}
export interface MobileMoveSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Names what is being moved. May be a node: a heading plus the record's title. */
  title: React.ReactNode;
  options: MobileMoveOption[];
  /** The one primary path: tapping a row chooses it. The sheet closes itself afterwards (`onOpenChange(false)`). */
  onChoose: (id: string) => void;
  /** Accessible name of the close control, which (with Escape) dismisses the sheet without choosing. Default "Close". */
  cancelLabel?: string;
}

/** The "Move to…" sheet: a column of large rows over the page. Tap a row to choose it; the close control and Escape dismiss. */
export function MobileMoveSheet({ open, onOpenChange, title, options, onChoose, cancelLabel }: MobileMoveSheetProps) {
  return (
    <MobileSheet open={open} onOpenChange={onOpenChange} title={title} closeLabel={cancelLabel}>
      <ul className="curv-mobile-board-move-list" role="list">
        {options.map(option => (
          <li key={option.id}>
            <button
              type="button"
              className="curv-mobile-board-move-option"
              disabled={option.disabled || option.current}
              aria-current={option.current ? "true" : undefined}
              onClick={() => { onChoose(option.id); onOpenChange(false); }}
            >
              <span>{option.label}</span>
              {option.current
                ? <span className="curv-mobile-board-move-check"><CheckIcon /></span>
                : hasCount(option.count) && <span className="curv-mobile-board-chip-count">{formatCountValue(option.count)}</span>}
            </button>
          </li>
        ))}
      </ul>
    </MobileSheet>
  );
}
