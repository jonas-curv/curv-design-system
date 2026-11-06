"use client";

import * as React from "react";
import { cn } from "../../../lib/cn";
import { ChevronIcon, ContentLink, formatCountValue, hasCount, hasNode, type MobileContentRenderLink } from "./shared";

/** Tone words of the phone's rows: good (green), warn (amber), info (blue), bad (red). */
export type MobileRowTone = "good" | "warn" | "info" | "bad";

export interface MobileGroupRowProps {
  /** What the rows under it have in common ("Due this week"). */
  label: React.ReactNode;
  /** How many rows are in the group. A number gets thousands separators; a string ("12+") is shown as given. */
  count?: number | string | null;
  /** What they add up to, already formatted: "$41,200.00". */
  total?: React.ReactNode;
  className?: string;
}

/**
 * A separator row inside a list: the group's label on the left, its count and total on the right. It is not a target and not
 * a heading of the page (a page carries one title); it only says where one kind of row ends and the next begins.
 */
export function MobileGroupRow({ label, count, total, className }: MobileGroupRowProps) {
  const showCount = hasCount(count);
  const showTotal = hasNode(total);
  return (
    <div className={cn("curv-mobile-group-row", className)}>
      <span className="curv-mobile-group-label">{label}</span>
      {(showCount || showTotal) && (
        <span className="curv-mobile-group-figures">
          {showCount && <span className="curv-mobile-group-count">{formatCountValue(count)}</span>}
          {showTotal && <span className="curv-mobile-group-total">{total}</span>}
        </span>
      )}
    </div>
  );
}

export interface MobileCountRowProps {
  /** The number of things waiting. Zero renders dim, never hidden, so the list does not jump. */
  count: number | string;
  /** What they are ("Bills to approve"). */
  title: React.ReactNode;
  /** One line of why or how much ("$41,200 due this week"). */
  meta?: React.ReactNode;
  /** Colours the number tile: bad (red), warn (amber), good (green), info (blue). Default neutral. A zero is dim whatever the tone. */
  tone?: MobileRowTone;
  /** A row with an href or onClick is the target and shows a chevron; it opens the filtered list. */
  href?: string;
  onClick?: () => void;
  renderLink?: MobileContentRenderLink;
  className?: string;
}

const isZero = (count: number | string) => (typeof count === "number" ? count === 0 : /^\s*0+\s*$/.test(count));

/** A count that opens a list: a 34px number tile with tone, a title, one line of meta, a chevron. For Home's "needs you" rows. */
export function MobileCountRow({ count, title, meta, tone, href, onClick, renderLink, className }: MobileCountRowProps) {
  const zero = isZero(count);
  const interactive = Boolean(href || onClick);
  const content = (
    <>
      <span className="curv-mobile-count-tile" data-tone={zero ? undefined : tone} data-zero={zero || undefined}>{formatCountValue(count)}</span>
      <span className="curv-mobile-count-text">
        <span className="curv-mobile-count-title">{title}</span>
        {hasNode(meta) && <span className="curv-mobile-count-meta">{meta}</span>}
      </span>
      {interactive && <span className="curv-mobile-count-chevron" aria-hidden="true"><ChevronIcon /></span>}
    </>
  );
  const rowClass = cn("curv-mobile-count-row", className);
  if (href) return <ContentLink href={href} className={rowClass} renderLink={renderLink}>{content}</ContentLink>;
  if (onClick) return <button type="button" className={rowClass} onClick={onClick}>{content}</button>;
  return <div className={rowClass}>{content}</div>;
}

export interface MobileFigureProps {
  /** The number, 24px, tabular: "$829.34". */
  value: React.ReactNode;
  /** What it is, muted: "Total, 14 bills" or a chart's period. */
  label?: React.ReactNode;
  /** `inline`: value then label on one baseline, the label pushed right (a chart readout, a list total). `stacked`: label above the value. */
  layout?: "inline" | "stacked";
  /** Announce changes politely: for a chart readout that follows the finger. */
  live?: boolean;
  className?: string;
}

/** One figure: a 24px tabular value with a muted label. A list's total sits at the top of the list as one; a chart's readout is one. */
export function MobileFigure({ value, label, layout = "inline", live = false, className }: MobileFigureProps) {
  const hasLabel = hasNode(label);
  const valueNode = <span className="curv-mobile-figure-value">{value}</span>;
  const labelNode = hasLabel ? <span className="curv-mobile-figure-label">{label}</span> : null;
  return (
    <div className={cn("curv-mobile-figure", className)} data-layout={layout} aria-live={live ? "polite" : undefined} aria-atomic={live ? true : undefined}>
      {layout === "stacked" ? <>{labelNode}{valueNode}</> : <>{valueNode}{labelNode}</>}
    </div>
  );
}
