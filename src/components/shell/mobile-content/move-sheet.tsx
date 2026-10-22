"use client";

import * as React from "react";
import { MobileSheet } from "../mobile-command";
import { formatCount } from "./shared";

export interface MobileMoveOption {
  id: string;
  /** What the row says: "Move to Review". */
  label: string;
  /** How many records the target already holds. */
  count?: number;
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

const CheckIcon = () => <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>;

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
                : option.count != null && <span className="curv-mobile-board-chip-count">{formatCount(option.count)}</span>}
            </button>
          </li>
        ))}
      </ul>
    </MobileSheet>
  );
}
