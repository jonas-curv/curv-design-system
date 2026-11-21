# API cheat-sheet

The anti-"grep the `.d.ts`" reference: *I need **X** → use **Y** with props **Z**.*
Every component imports from the package root:

```tsx
import { Button, DataTable, LineChart /* … */ } from "@curvgroup/design-system";
```

Grouped by the same categories as the showcase. Key props only — read the
component's TSDoc for the full surface. **Style through tokens, never raw hex.**

## Layout and structure

| Use when | Component | Key props |
| --- | --- | --- |
| You need the whole app shell (dark cradle, sticky top bar, sidebar + content) | `AppFrame` | `topBar`, `sidebar`, `children` |
| Wrapping a page's content at the right width (sides 24, top 28) | `PageContainer` | `size` (default 1280 · `narrow` 720 · `wide` 1600), `bleed` (edge-to-edge for wide tables) |
| How an index page opens: no visible title, one 36px control row | `PageToolbar` | `title` (hidden h1), `controls` (views · search · filter), `actions` (Export · primary) |
| A detail page's title block (20px title, status, actions) | `PageHeader` | `title`, `badge`, `actions` (`eyebrow`, `count`, `description`: legacy) |
| A row of cards/chips scrolls sideways with edge-fades | `HScroll` | `children`, `containerClassName`, `fade` |

## Navigation

| Use when | Component | Key props |
| --- | --- | --- |
| The global top bar (wordmark · centered search + Ask · actions) | `TopBar` | `logo`, `center`, `actions`, `mobileTitle` |
| The OS name in the top bar ("sales" + superscript os) | `Wordmark` | `name`, `label` |
| The left nav with sections + items (240, or the 56 rail) | `Sidebar`, `SidebarSection`, `SidebarItem` | Sidebar: `collapsed`, `header`, `footer`, `renderLink` · Section: `label`, `collapsible`, `open`/`onOpenChange` · Item: `icon`, `label`, `active`, `href`, `badge`, child items (nested), `comingSoon` |
| The rail's collapse / expand button (sidebar footer) | `SidebarToggle` | `collapsed`, `onCollapsedChange` |
| The account chip + dropdown | `AccountMenu`, `AccountMenuItem` | `name`, `email`, `role`, `theme`+`onThemeChange` |
| The notification inbox bell | `NotificationBell` | `items`, `unreadCount`, `onMarkAllRead`, `onDismiss` |
| A light/dark switch | `ThemeToggle` | `value`, `onValueChange`, `size` |
| In-page section tabs | `Tabs` | `items`, `value`, `onValueChange`, `bar` |

## Forms & input

| Use when | Component | Key props |
| --- | --- | --- |
| Any button / CTA | `Button` | `variant`, `size`, `loading` (+ native button attrs) |
| A single-line text input | `Input` | native `<input>` attrs (`value`, `onChange`, `placeholder`) |
| A multi-line input | `Textarea` | native `<textarea>` attrs (`rows`, `value`, `onChange`) |
| A single-choice dropdown | `Select` | `items`, `value`, `onValueChange`, `placeholder` |
| A multi-choice dropdown with search | `MultiSelect` | `items`, `value`, `onValueChange`, `searchPlaceholder` |
| A checkbox | `Checkbox` | `checked`, `indeterminate` (mixed), `onCheckedChange`, `aria-label` |
| A radio group | `RadioGroup`, `Radio` | Group: `value`, `onValueChange` · Radio: `value` |
| An on/off switch | `Switch` | `checked`, `onCheckedChange`, `aria-label` |
| A small view-swapper toggle | `SegmentedControl` | `items`, `value`, `onValueChange`, `size` |
| A reporting date control (presets + calendar) | `DateRangePicker` | `value`, `onValueChange`, `presets`, `weekStartsOn`, `today` |
| Wrapping a control with a label / hint / error | `Field` | `label`, `hint`, `error`, `htmlFor` |

## Data display

| Use when | Component | Key props |
| --- | --- | --- |
| A sortable, searchable, filterable table (virtualized) | `DataTable` (+ `TableLink`, `DataTableBulkAction`) | `columns` (`type`, `width`/`minWidth`, `sticky`, `description`, `sortFirst`, `sortValue`, `exportValue`, `exportHeader`, `exportable`, `exportOnly`), `rows`, `getRowId`, `aria-label`, `searchable`, `filters`, `tabs`, `exportFilename`, `tableId` (Columns picker), `selectable` / `selected` / `onSelectedChange` / `bulkActions`, `totals`, `getRowHref`, `getRowClassName`, `getRowPin`, `rowCap`, `renderExpanded` (+ `canExpand`, `expanded` / `onExpandedChange`), `groupBy` / `renderGroupHeader` (also `defaultCollapsedGroups`, `ungroupedLabel`, `searchActive`, `collapsedGroups` / `onCollapsedGroupsChange`) |
| A DataTable whose view state you keep (URL, saved view, server sort) | `DataTable` | `sort` / `onSortChange` (+ `manualSort`), `query` / `onQueryChange` (`defaultQuery`), `filterValues` / `onFilterValuesChange` (`defaultFilterValues`), `tab` / `onTabChange`, `searchLabel`, `matchSearch` |
| A table whose toolbar sits in the page's control row | `DataTableProvider` + `DataTableViews`, `DataTableSearch`, `DataTableFilterButton`, `DataTableColumnsButton`, `DataTableExportMenu` + `<DataTable toolbar="external" />` | the provider takes the `DataTable` props; the pieces take none |
| Money, numbers, percentages and dates the table way | `formatMoney`, `formatNumber`, `formatPercent`, `formatDate` | `cents`, `decimals`, `ratio`, `today` · `MINUS` is U+2212 |
| A small read-only table, an editable grid, a server-rendered table | `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`, `TableNull` (server components: from `@curvgroup/design-system/table`) | shadcn props + Table: `card`, `maxHeight`, `dense`, `identityColumn` · Header/Footer: `sticky` · Row: `selected` · Head/Cell: `numeric`, `align`, `priority`, `sticky` · Head: `sort`, `onSort`, `sortFirst` |
| Client-side sort for the Table parts | `useTableSort` | `useTableSort(rows, { columns, initialSort })` → `rows`, `getHeadProps(key)` (also `sort` / `onSortChange`) |
| The header and cell classes for a cell the parts can't draw | `tableHeaderRow`, `tableCellPadding` | class strings for the `<tr>` in `<thead>` and each cell |
| A P&L / period matrix with drill-down (same header, rows 36) | `ReportTable` | `sections`, `periods`, `summaryColumns`, `view`, `formatValue` |
| A single KPI (label + value + delta + sparkline) | `StatCard` (+ `StatGroup`, `BreakdownRow`) | `label`, `value`, `delta`, `sparkline`, `href`, `breakdown` |
| A headline total broken into shares with a bar | `SummaryStrip` | `label`, `total`, `caption`, `items`, `hideBar` |
| A ranked list of values as horizontal bars | `BarBreakdown` | `items`, `formatValue`, `showPercent`, `max` |
| A trend line (comparison / projected / gaps) | `LineChart` | `series`, `xLabels`, `area`, `yBaseline`, `tooltipTitle`, `formatY` |
| Stacked / grouped vertical bars | `BarChart` | `series`, `xLabels`, `stacked`, `formatY` |
| A chart wrapped in a titled card with legend + loading | `ChartCard` | `title`, `value`, `delta`, `controls`, `legend`, `children` |
| A tiny inline trend (no axes) | `Sparkline` | `data`, `variant`, `className` |
| A drag-free column board | `KanbanBoard`, `KanbanColumn`, `KanbanCard` | Column: `label`, `count`, `value`, `dotClassName` · Card: `href`, `onClick` |
| An avatar / stacked avatars | `Avatar`, `AvatarGroup` | Avatar: `name`, `src`, `size` |
| A status / category pill | `Badge` | `variant` (+ native span attrs) |
| A loading placeholder | `Skeleton` | `width`, `height`, `circle` |
| A copy-to-clipboard affordance (e.g. in a cell) | `CopyButton` | `value`, `label`, `revealOnHover` |

`ChartSeries` (for the charts): `data: (number \| null)[]` (a `null` is a gap),
`label`, `comparison`, `partialFrom`, `variant`.

### Which table

`DataTable` for a list people query (sort, search, filter, select, export);
the `Table` parts for a few read-only rows, an editable grid or a server
component; `ReportTable` for a financial statement. Never a hand-built `<table>`.

```tsx
<DataTable columns={columns} rows={deals} getRowId={(d) => d.id} aria-label="Deals" searchable unit="deals" />

const { rows, getHeadProps } = useTableSort(stock, { columns: { name: (s) => s.name, qty: (s) => s.qty } });
<Table card aria-label="Warehouses">
  <TableHeader><TableRow><TableHead {...getHeadProps("name")}>Warehouse</TableHead><TableHead {...getHeadProps("qty")} numeric>On hand</TableHead></TableRow></TableHeader>
  <TableBody>{rows.map((s) => <TableRow key={s.id}><TableCell>{s.name}</TableCell><TableCell numeric>{formatNumber(s.qty)}</TableCell></TableRow>)}</TableBody>
</Table>

<ReportTable sections={pnl} periods={months} view="monthly" />
```

### DataTable column widths (the Linear model)

Header, rows, group rows and totals share ONE column template (`--dt-cols`):
px or `minmax(px, fr)` tracks only, so columns never drift, wrap or push each
other — content clips with `…`. Per column:

- **Set `type`** (`text`, `number`, `money`, `percent`, `date`, `status`). It
  aligns the column (numbers right + tabular, the rest left) even with a
  `render`, formats the value when there is no `render` (`−$1,240`, `12.5%`,
  `Nov 21`, `—` for nothing), and sets the first sort direction (numbers and
  dates high to low, text A to Z; the third click clears). `align` still wins.
- **Numbers, dates and statuses size themselves** to their longest formatted
  value. Numbers never truncate.
- **Leave exactly ONE primary text column with no `width` and no `maxWidth`** —
  the filler: it stretches to fill the row and truncates down to `minWidth`
  (default 120px; set ~240–320). Give other text columns a `width`.
- **A column is never narrower than its header label**; a smaller `width` is
  raised to fit it. Header labels never wrap or truncate.
- **A truncating text cell must render inline/string content** (a Fragment of
  `<span>`s, not a wrapping `<div>`) or the `…` won't show. Set `value` for
  search, sort and export.
- **A `render` that shows more than the formatted value** (a badge plus a
  number) should set `width`.
- **Never hand-roll a table, a toolbar or the Export menu** — `DataTable` owns
  them; to place them in the page's control row, use `DataTableProvider` and the
  `DataTable…` pieces with `<DataTable toolbar="external" />`.

## Surfaces

| Use when | Component | Key props |
| --- | --- | --- |
| The canonical raised surface (12px radius, card bg, shadow) | `Card` | native `<div>` attrs + `className` |

## Overlays & feedback

| Use when | Component | Key props |
| --- | --- | --- |
| A modal (title, body, footer actions) | `Dialog`, `DialogClose` | `title`, `description`, `trigger`, `footer`, `open`/`onOpenChange` |
| A confirm-before-acting modal (destructive default) | `ConfirmDialog` | `title`, `onConfirm`, `variant`, `confirmLabel` |
| A side panel (details, forms) | `Drawer`, `DrawerClose` | `trigger`, `side`, `title`, `footer`, `open`/`onOpenChange` |
| A small anchored floating panel | `Popover`, `PopoverClose` | `trigger` (or `anchor`), `side`, `align`, `open`/`onOpenChange` |
| A right-click / actions dropdown menu | `Menu`, `MenuItem`, `MenuSeparator`, `MenuLabel` | Menu: `trigger`, `align` · Item: `onClick`, `destructive`, `icon`, `shortcut` |
| A hover hint on an element | `Tooltip`, `TooltipProvider` | `content`, `children`, `side`, `delay` |
| A transient success/error notice | `ToastProvider` + `toast()` | `toast(message, opts)`; mount `ToastProvider` once |
| A ⌘K command palette | `CommandPalette` | `open`, `onOpenChange`, `items`, `recents`, `shortcut` |
| An inline informational / warning strip | `Banner` | `variant`, `title`, `children`, `actions`, `onDismiss` |
| A "nothing here yet" placeholder | `EmptyState` | `icon`, `title`, `description`, `actions` |
| A keyboard-key hint | `Kbd` | `children` (+ native attrs) |

**Utility:** `cn(...)` — the class-name merger (clsx + tailwind-merge). Use it
anywhere you compose conditional Tailwind classes. An app with its own `cn()`
extends tailwind-merge with `curvTailwindMergeConfig`, so `text-body` is kept as
a size next to a text colour.

## Type and heights

| Use when | Class |
| --- | --- |
| The one hero number | `text-display` (32 / 40) |
| A KPI value | `text-figure` (24 / 32) |
| A detail-page title | `text-title` or `text-xl` (20 / 28) |
| A section or card heading | `text-section` (16 / 24) |
| Default UI text | `text-body` (13 / 20) |
| Labels, meta, column headers | `text-caption` (12 / 16) |
| Axes, count chips | `text-micro` (11 / 16) |
| A control: button, input, select, segmented, search | `h-9` (36) |
| A small control, a sidebar row | `h-8` (32) |
| An in-table control | `h-7` (28) |
| A table row, a tab, a touch target | `h-11` (44) |
