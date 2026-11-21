// @curvgroup/design-system/table — the Table parts for server components.
//
// The package root also holds client components that create React context when
// the module loads, which a React Server Components build cannot evaluate. This
// entry holds only what needs no hooks and no context: the Table parts, the
// table class tokens and the number formats. Client code may import the same
// names from the package root; `useTableSort` lives there.
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
  TableNull,
  type TableProps,
  type TableHeaderProps,
  type TableFooterProps,
  type TableRowProps,
  type TableHeadProps,
  type TableCellProps,
  type TableColumnPriority,
  type TableSortOrder,
} from "./components/table";
export { tableHeaderRow, tableCellPadding } from "./components/data-table/tokens";
export {
  formatMoney,
  formatNumber,
  formatPercent,
  formatDate,
  MINUS,
  type FormatMoneyOptions,
  type FormatNumberOptions,
  type FormatPercentOptions,
  type FormatDateOptions,
} from "./components/data-table/format";
export { cn } from "./lib/cn";
