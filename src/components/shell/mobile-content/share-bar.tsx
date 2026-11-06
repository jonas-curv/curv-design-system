"use client";

import * as React from "react";
import { cn } from "../../../lib/cn";
import { MobileFigure } from "./rows";

export interface MobileShareSegment {
  /** Plain text: it is also read out as part of the bar. */
  label: string;
  /** The amount, already formatted: "$12,480.00". */
  value: React.ReactNode;
  /** The share printed beside the value, 0 to 100 (a margin, a share of revenue). `null` prints a dash. Each pair carries its own. */
  percent: number | null;
}

export interface MobileShareBarProps {
  /** The readout: "$44,610.00". */
  value: React.ReactNode;
  /** What the readout is: "Revenue". */
  label?: React.ReactNode;
  /** Exactly two label, value and percent pairs. They are figures: the bar does not divide between them. */
  segments: readonly [MobileShareSegment, MobileShareSegment];
  /** How much of the readout the bar fills, 0 to 100: the first value over the readout value (gross profit over revenue). Default: the first pair's
   *  `percent`. Without a number the bar is an empty track, never half full. Clamped to 0 to 100. */
  share?: number | null;
  className?: string;
}

const formatPercent = (percent: number | null) => (percent === null || !Number.isFinite(percent) ? "—" : `${Number.isInteger(percent) ? percent : (Math.round(percent * 10) / 10).toString()}%`);

/**
 * A money card for a record: one readout, a bar that fills one share of it, and two label / value / percent pairs. The two pairs are
 * independent (Total GP contains Product GP, so they are not parts of one whole); only the accent share is drawn, the rest is grey.
 * No balance, no third line.
 */
export function MobileShareBar({ value, label, segments, share, className }: MobileShareBarProps) {
  const raw = share === undefined ? segments[0].percent : share;
  const filled = raw === null || !Number.isFinite(raw) ? null : Math.min(100, Math.max(0, raw));
  return (
    <div className={cn("curv-mobile-share", className)}>
      <MobileFigure value={value} label={label} />
      <div className="curv-mobile-share-bar" role="img" aria-label={filled === null ? `${segments[0].label} unknown` : `${segments[0].label} ${formatPercent(filled)}`}>
        {filled !== null && <><i className="curv-mobile-share-a" style={{ width: `${filled}%` }} /><i className="curv-mobile-share-b" /></>}
      </div>
      <dl className="curv-mobile-share-pairs">
        {segments.map((segment, index) => (
          <div key={index} className="curv-mobile-share-pair" data-segment={index === 0 ? "a" : "b"}>
            <dt>{segment.label}</dt>
            <dd><span className="curv-mobile-share-value">{segment.value}</span><span className="curv-mobile-share-percent">{formatPercent(segment.percent)}</span></dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
