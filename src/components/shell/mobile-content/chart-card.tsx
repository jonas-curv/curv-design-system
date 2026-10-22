"use client";

import * as React from "react";
import { cn } from "../../../lib/cn";
import type { MobileGutter } from "./shared";

export interface MobileChartCardProps {
  /** Say the period here: "Sales, last 30 days". */
  title?: React.ReactNode;
  /** A short note at the right of the title: "as of 9:41". */
  trailing?: React.ReactNode;
  /** A light-toned `MobileChart`, with any controls that belong to it. */
  children: React.ReactNode;
  /** Side gutters of the card. `none` for a parent that already pads its content. Default: 16px. */
  gutter?: MobileGutter;
  className?: string;
}

/**
 * The white rounded card a chart sits on in a page of sections: the same ground, ring and corner as the
 * key-value list's card, under the same kind of heading. The chart stays a dumb primitive; this only frames it.
 */
export function MobileChartCard({ title, trailing, children, gutter, className }: MobileChartCardProps) {
  const id = React.useId();
  const hasTitle = title != null && title !== false;
  const hasTrailing = trailing != null && trailing !== false;
  return (
    <section className={cn("curv-mobile-chart-card", className)} aria-labelledby={hasTitle ? id : undefined} data-gutter={gutter}>
      {(hasTitle || hasTrailing) && (
        <div className="curv-mobile-chart-card-head">
          {hasTitle && <h2 id={id}>{title}</h2>}
          {hasTrailing && <span className="curv-mobile-chart-card-trailing">{trailing}</span>}
        </div>
      )}
      <div className="curv-mobile-chart-card-body">{children}</div>
    </section>
  );
}
