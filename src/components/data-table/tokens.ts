// The table look DataTable and ReportTable share, and any plain read-only
// <table> can borrow (design-system.md → Tables).

/** The header row: 36 tall, solid muted, a hairline below, 12 / 500 muted, sentence case, never wraps. */
export const tableHeaderRow =
  "h-9 whitespace-nowrap border-b border-border bg-muted text-[12px] font-medium text-muted-foreground";

/** Cell padding in a real <table>: 12 per side, 16 on the table's outer edges. */
export const tableCellPadding = "px-3 first:pl-4 last:pr-4";
