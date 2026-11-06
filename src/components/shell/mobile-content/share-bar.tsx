"use client";

import * as React from "react";
import { cn } from "../../../lib/cn";
import { MobileFigure } from "./rows";

export interface MobileShareSegment {
  /** Plain text: it is also read out as part of the bar. */
  label: string;
  /** The amount, already formatted: "$12,480.00". */
  value: React.ReactNode;
  /** The share beside the value, 0 to 100 (a margin, a share of revenue). `null` prints a dash. */
  percent: number | null;
  /** Width of this segment relative to the other. Default: `percent`. Pass amounts when the percents are not shares of one whole. */
  weight?: number;
}

export interface MobileShareBarProps {
  /** The readout: "$44,610.00". */
  value: React.ReactNode;
  /** What the readout is: "Revenue". */
  label?: React.ReactNode;
  /** Exactly two. The first is drawn in the accent, the second in grey, and the pair fills the bar. */
  segments: readonly [MobileShareSegment, MobileShareSegment];
  className?: string;
}

const formatPercent = (percent: number | null) => (percent === null || !Number.isFinite(percent) ? "—" : `${Number.isInteger(percent) ? percent : (Math.round(percent * 10) / 10).toString()}%`);
const weightOf = (segment: MobileShareSegment) => {
  const raw = segment.weight ?? segment.percent;
  return typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : 0;
};

/**
 * A money card for a record: one readout, a two-segment bar, and the two parts each as a label, a value and the percent beside it.
 * It draws what it is given: no balance, no third line. When neither segment has a weight the bar stays an empty track.
 */
export function MobileShareBar({ value, label, segments, className }: MobileShareBarProps) {
  const weights = segments.map(weightOf);
  const sum = weights[0] + weights[1];
  const widths = sum > 0 ? weights.map(weight => `${((weight / sum) * 100).toFixed(2)}%`) : null;
  const spoken = segments.map(segment => `${segment.label} ${formatPercent(segment.percent)}`).join(", ");
  return (
    <div className={cn("curv-mobile-share", className)}>
      <MobileFigure value={value} label={label} />
      <div className="curv-mobile-share-bar" role="img" aria-label={spoken}>
        {widths && <><i className="curv-mobile-share-a" style={{ width: widths[0] }} /><i className="curv-mobile-share-b" style={{ width: widths[1] }} /></>}
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
