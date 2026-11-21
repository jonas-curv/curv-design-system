import * as React from "react";
import { cn } from "../lib/cn";

export interface SummaryStripItem {
  label: React.ReactNode;
  /** Preformatted headline value for this slice, e.g. "$1.9M". */
  value: React.ReactNode;
  /** 0–100 — drives the proportional bar and the shown share. */
  share?: number;
  /**
   * Dot + bar-segment colour as a token class (`bg-verdict-green`, `bg-chart-1`,
   * …). Omit for neutral. Reserve colour for *meaning*, and order any neutral
   * "none / unclassified" residual **last** — colour first, gray last.
   */
  colorClassName?: string;
}

export interface SummaryStripProps {
  /** Muted label above the total, e.g. "Catalog value by status". */
  label: React.ReactNode;
  /** The headline figure, e.g. "$21.4M". */
  total: React.ReactNode;
  /** Muted sub-line under the total. */
  caption?: React.ReactNode;
  items: SummaryStripItem[];
  /** Hide the proportional bar even when items carry `share`. */
  hideBar?: boolean;
  className?: string;
}

/**
 * SummaryStrip — a full-width breakdown that sits ABOVE a table (the
 * Dub / Plausible pattern): the total anchored left, the breakdown as a
 * horizontal stat row filling the width, and a thin proportional bar. Never a
 * small card marooned in a corner. Reserve colour for meaning and order a neutral
 * "none / unclassified" residual last (colour first, gray last). An *action* on
 * the breakdown (e.g. "1,232 unclassified — triage") is a separate <Banner>, not
 * baked in here. (design-system.md → Summary strip.)
 */
export function SummaryStrip({
  label,
  total,
  caption,
  items,
  hideBar = false,
  className,
}: SummaryStripProps) {
  const showBar = !hideBar && items.some((it) => it.share != null);
  return (
    <div className={cn("w-full rounded-lg border border-border bg-card px-5 py-4 shadow-card", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-8">
        <div className="shrink-0 sm:min-w-[180px]">
          <div className="text-caption text-muted-foreground">{label}</div>
          <div className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">{total}</div>
          {caption && <div className="mt-0.5 text-caption text-muted-foreground">{caption}</div>}
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-[repeat(auto-fit,minmax(88px,1fr))] gap-x-6 gap-y-3">
          {items.map((it, i) => (
            <div key={i} className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={cn("size-1.5 shrink-0 rounded-full", it.colorClassName ?? "bg-muted-foreground/40")} />
                <span className="truncate text-caption text-muted-foreground">{it.label}</span>
              </div>
              <div className="mt-0.5 text-body font-semibold tabular-nums text-foreground">{it.value}</div>
              {it.share != null && (
                <div className="text-caption tabular-nums text-muted-foreground">{it.share}%</div>
              )}
            </div>
          ))}
        </div>
      </div>
      {showBar && (
        <div className="mt-4 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
          {items
            .filter((it) => it.share != null && (it.share as number) > 0)
            .map((it, i) => (
              <div
                key={i}
                className={cn("h-full", it.colorClassName ?? "bg-muted-foreground/40")}
                style={{ width: `${it.share}%` }}
              />
            ))}
        </div>
      )}
    </div>
  );
}
