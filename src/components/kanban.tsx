"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { HScroll } from "./h-scroll";

/**
 * Kanban — a horizontally-scrolling board of fixed-width columns (the revenue-os
 * pipeline pattern). `KanbanBoard` handles the scroll + edge-fades; each
 * `KanbanColumn` is a `from-muted` gradient with a dot/label/count/value header
 * and a dashed empty state; `KanbanCard` is the clickable card shell. The card
 * *content* stays app-specific — compose it inside `KanbanCard`.
 *
 * <KanbanBoard bleedClassName="-mx-6" padClassName="px-6 pb-1">
 *   <KanbanColumn label="Quote Sent" count={10} value="$16k" dotClassName="border-chart-3">
 *     <KanbanCard href="/deals/1">…</KanbanCard>
 *   </KanbanColumn>
 * </KanbanBoard>
 */
export interface KanbanBoardProps {
  children: React.ReactNode;
  /** Full-bleed offset to match page padding (e.g. `-mx-6`). */
  bleedClassName?: string;
  /** Inner scroll padding (e.g. `px-6 pb-1`). */
  padClassName?: string;
  /** Gradient origin for the edge-fades (the page surface). */
  fade?: string;
  className?: string;
}

export function KanbanBoard({ children, bleedClassName, padClassName = "pb-1", fade, className }: KanbanBoardProps) {
  return (
    <HScroll containerClassName={bleedClassName} className={padClassName} fade={fade}>
      <div className={cn("flex gap-3", className)}>
        {children}
        {/* trailing gutter — scroll containers eat padding-right */}
        <div aria-hidden className="w-3 shrink-0" />
      </div>
    </HScroll>
  );
}

export interface KanbanColumnProps {
  label: React.ReactNode;
  count?: number;
  /** Formatted value line under the header (e.g. "$34k"). Space is reserved even
   *  when omitted so every column header is the same height. */
  value?: React.ReactNode;
  /** Colour of the status dot. A `border-*` class for the default ring, or a
   *  `bg-*` class with `dotFilled` for a solid dot (e.g. a "Won" column). */
  dotClassName?: string;
  dotFilled?: boolean;
  /** Cards; leave empty to show the dashed empty state. */
  children?: React.ReactNode;
  emptyLabel?: string;
  /** Fixed column width (min). */
  minWidth?: number;
  className?: string;
}

export function KanbanColumn({
  label,
  count,
  value,
  dotClassName = "border-muted-foreground/40",
  dotFilled,
  children,
  emptyLabel = "No items",
  minWidth = 280,
  className,
}: KanbanColumnProps) {
  const isEmpty = React.Children.toArray(children).length === 0;
  return (
    <div
      className={cn("flex flex-1 flex-col rounded-lg bg-gradient-to-b from-muted to-muted/30 p-2", className)}
      style={{ minWidth }}
    >
      <div className="px-1 pb-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "size-2.5 shrink-0 rounded-full",
              dotFilled ? dotClassName : cn("border-[1.5px] bg-transparent", dotClassName),
            )}
          />
          <span className="truncate text-body font-medium text-foreground">{label}</span>
          {count != null && (
            <span className="ml-auto text-caption font-medium tabular-nums text-muted-foreground">{count}</span>
          )}
        </div>
        {/* always rendered (nbsp when blank) so card tops line up across columns */}
        <div className="mt-0.5 pl-4 text-body font-semibold tabular-nums text-foreground">{value || " "}</div>
      </div>
      <div className="flex flex-col gap-2">
        {isEmpty ? (
          <div className="rounded-lg border border-dashed border-border/50 px-3 py-6 text-center text-micro text-muted-foreground/50">
            {emptyLabel}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export interface KanbanCardProps {
  /** Link target — renders an `<a>` (cmd+click, keyboard, copy-link for free). */
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function KanbanCard({ href, onClick, children, className }: KanbanCardProps) {
  const cls = cn(
    "block rounded-md bg-card p-2.5 text-left shadow-card transition-shadow hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20",
    className,
  );
  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(cls, "w-full")}>
        {children}
      </button>
    );
  }
  return <div className={cls}>{children}</div>;
}
