"use client";

import * as React from "react";
import { cn } from "../lib/cn";
import { Card } from "./card";
import { SegmentedControl } from "./segmented-control";
import { EMPTY, formatNumber } from "./data-table/format";
import { tableCellPadding, tableHeaderRow } from "./data-table/tokens";

/**
 * ReportTable — the P&L / financial-matrix grid: metric rows grouped into
 * collapsible sections with emphasized subtotals, a sticky label column + header,
 * and a Summary↔Monthly toggle. Monthly shows every period column (value only —
 * comparison lives in the Summary columns); Summary shows the compact
 * right-side columns you define (Trend, Amount, vs forecast, vs last year).
 * Conditional tint is opt-in per summary column and meant for totals past a
 * threshold — never a washed grid (design-system.md → Financial statements).
 */
export interface ReportPeriod {
  key: string;
  label: string;
  /** Current/open period — rendered quietly (italic, muted). */
  partial?: boolean;
}

export interface ReportRow {
  key: string;
  label: React.ReactNode;
  /** periodKey → value (null renders "—"). */
  values?: Record<string, number | null | undefined>;
  /** The Total/Amount value (shown in Monthly's Total column). */
  total?: number | null;
  /** Emphasized row (Gross Profit, Net Income). */
  subtotal?: boolean;
  /** Indent depth for the label (nested line items). */
  indent?: number;
  /** Trend series for a summary column to render as a Sparkline. */
  trend?: number[];
  /** Escape hatch for custom summary-column renderers. */
  data?: Record<string, unknown>;
}

export interface ReportSection {
  key: string;
  label?: React.ReactNode;
  rows: ReportRow[];
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export interface ReportSummaryColumn {
  key: string;
  label: string;
  render: (row: ReportRow) => React.ReactNode;
  /** Conditional colour for this cell (restrained — totals past a threshold). */
  tint?: (row: ReportRow) => "positive" | "negative" | null | undefined;
  width?: number;
}

export interface ReportTableProps {
  sections: ReportSection[];
  periods: ReportPeriod[];
  /** Right-side columns shown in Summary view (Trend, Amount, vs forecast…). */
  summaryColumns?: ReportSummaryColumn[];
  /** Drill down: click a value to open its underlying (period key, "total", or
   *  a summary column key). Interactive cells get a hover affordance + are
   *  keyboard-focusable. Pairs with a Drawer/Dialog at page level. */
  onCellClick?: (row: ReportRow, columnKey: string) => void;
  /** Click a row's label (its metric detail). */
  onRowClick?: (row: ReportRow) => void;
  view?: "summary" | "monthly";
  defaultView?: "summary" | "monthly";
  onViewChange?: (v: "summary" | "monthly") => void;
  showViewToggle?: boolean;
  formatValue?: (n: number) => string;
  /** Header for the sticky label column (e.g. "Metric", "Line"). */
  metricLabel?: React.ReactNode;
  totalLabel?: string;
  labelWidth?: number;
  maxHeight?: number | string;
  className?: string;
}

const TINT: Record<"positive" | "negative", string> = {
  positive: "text-verdict-green",
  negative: "text-verdict-red",
};

function Chevron({ open }: { open: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cn("transition-transform", open ? "rotate-90" : "rotate-0")}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function ReportTable({
  sections,
  periods,
  summaryColumns = [],
  onCellClick,
  onRowClick,
  view: viewProp,
  defaultView = "monthly",
  onViewChange,
  showViewToggle = true,
  formatValue = (n) => formatNumber(n),
  metricLabel,
  totalLabel = "Total",
  labelWidth = 240,
  maxHeight = "70vh",
  className,
}: ReportTableProps) {
  const [viewState, setViewState] = React.useState<"summary" | "monthly">(defaultView);
  const view = viewProp ?? viewState;
  const setView = (v: "summary" | "monthly") => {
    setViewState(v);
    onViewChange?.(v);
  };

  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const toggle = (k: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  const monthly = view === "monthly";
  const dataCols = monthly ? periods.length + 1 : summaryColumns.length;
  const colCount = 1 + dataCols;

  const fmt = (v: number | null | undefined) =>
    v == null ? <span className="text-muted-foreground/60">{EMPTY}</span> : <span className="tabular-nums">{formatValue(v)}</span>;

  // Sticky label column: opaque bg + a right divider so the frozen block reads
  // as separate. Table cells stretch to row height, so no masking-height bug.
  const stickyHead = "sticky left-0 z-10 border-r border-border bg-muted";
  const stickyBody = "sticky left-0 z-[1] border-r border-border bg-card";

  return (
    <Card className={cn("flex flex-col overflow-hidden", className)}>
      {showViewToggle && periods.length > 0 && (
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <span className="text-body font-medium text-foreground">{metricLabel}</span>
          <SegmentedControl
            value={view}
            onValueChange={(v) => setView(v as "summary" | "monthly")}
            items={[
              { value: "summary", label: "Summary" },
              { value: "monthly", label: "Monthly" },
            ]}
          />
        </div>
      )}

      <div className="overflow-auto" style={{ maxHeight }}>
        <table className="w-full border-collapse text-body">
          {/* The same header as DataTable: 36, solid muted, a hairline below,
              12 / 500 muted; 12 per side, 16 on the outer edges. A collapsed
              border stays behind when the header sticks, so the hairline is an
              inset shadow on each cell, which travels with it. */}
          <thead className="sticky top-0 z-20">
            <tr className={cn(tableHeaderRow, "border-b-0 [&>th]:shadow-[inset_0_-1px_0_var(--border)]")}>
              <th scope="col" className={cn(stickyHead, tableCellPadding, "text-left font-medium")} style={{ minWidth: labelWidth, width: labelWidth }}>
                {!showViewToggle || periods.length === 0 ? metricLabel : null}
              </th>
              {monthly ? (
                <>
                  {periods.map((p) => (
                    <th key={p.key} scope="col" className={cn(tableCellPadding, "text-right font-medium", p.partial && "italic")}>
                      {p.label}
                    </th>
                  ))}
                  <th scope="col" className={cn(tableCellPadding, "border-l border-border text-right font-medium text-foreground")}>
                    {totalLabel}
                  </th>
                </>
              ) : (
                summaryColumns.map((c) => (
                  <th key={c.key} scope="col" className={cn(tableCellPadding, "text-right font-medium")} style={c.width ? { width: c.width } : undefined}>
                    {c.label}
                  </th>
                ))
              )}
            </tr>
          </thead>

          <tbody>
            {sections.map((section) => {
              const open = section.collapsible ? !collapsed.has(section.key) : true;
              return (
                <React.Fragment key={section.key}>
                  {section.label != null && (
                    <tr className="h-9">
                      <td colSpan={colCount} className="sticky left-0 z-[1] border-b border-border bg-muted/40 p-0">
                        {section.collapsible ? (
                          <button
                            type="button"
                            onClick={() => toggle(section.key)}
                            aria-expanded={open}
                            className="flex h-9 w-full items-center gap-1.5 px-4 text-left text-caption font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-foreground/25"
                          >
                            <Chevron open={open} />
                            {section.label}
                          </button>
                        ) : (
                          <div className="flex h-9 items-center px-4 text-caption font-medium text-muted-foreground">{section.label}</div>
                        )}
                      </td>
                    </tr>
                  )}

                  {open &&
                    section.rows.map((row) => {
                      // 16 on the outer edge, then 16 per indent level.
                      const labelPad = 16 + (row.indent ?? 0) * 16;
                      // Interactive value cell: full-cell button (keyboard-safe)
                      // with a hover affordance; the td drops its padding, so the
                      // button carries it (16 on the table's right edge).
                      const valueCell = (colKey: string, node: React.ReactNode, extra?: string, last?: boolean) =>
                        onCellClick ? (
                          <td className={cn("p-0 text-right", extra)}>
                            <button
                              type="button"
                              onClick={() => onCellClick(row, colKey)}
                              className={cn(
                                "h-9 w-full whitespace-nowrap text-right transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-foreground/25",
                                last ? "pl-3 pr-4" : "px-3",
                              )}
                            >
                              {node}
                            </button>
                          </td>
                        ) : (
                          <td className={cn("whitespace-nowrap py-0 text-right", tableCellPadding, extra)}>{node}</td>
                        );
                      return (
                        <tr key={row.key} className={cn("h-9 border-b border-border", row.subtotal ? "font-medium text-foreground" : "text-foreground")}>
                          <td className={cn(stickyBody, row.subtotal && "font-medium", onRowClick ? "p-0" : "truncate py-0 pr-3")} style={onRowClick ? undefined : { paddingLeft: labelPad }}>
                            {onRowClick ? (
                              <button
                                type="button"
                                onClick={() => onRowClick(row)}
                                style={{ paddingLeft: labelPad }}
                                className="flex h-9 w-full items-center truncate pr-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-foreground/25"
                              >
                                {row.label}
                              </button>
                            ) : (
                              row.label
                            )}
                          </td>
                          {monthly ? (
                            <>
                              {periods.map((p) =>
                                <React.Fragment key={p.key}>
                                  {valueCell(p.key, fmt(row.values?.[p.key]), p.partial ? "italic text-muted-foreground" : undefined)}
                                </React.Fragment>,
                              )}
                              {valueCell("total", fmt(row.total), "border-l border-border font-medium", true)}
                            </>
                          ) : (
                            summaryColumns.map((c, i) => {
                              const t = c.tint?.(row);
                              return (
                                <React.Fragment key={c.key}>
                                  {valueCell(c.key, c.render(row), t ? TINT[t] : undefined, i === summaryColumns.length - 1)}
                                </React.Fragment>
                              );
                            })
                          )}
                        </tr>
                      );
                    })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
