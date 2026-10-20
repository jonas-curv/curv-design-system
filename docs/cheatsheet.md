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
| Wrapping a page's content at the right width | `PageContainer` | `size`, `bleed` (edge-to-edge for wide tables) |
| A page's title block (eyebrow, count, badge, actions) | `PageHeader` | `title`, `eyebrow`, `count`, `badge`, `actions` |
| A row of cards/chips scrolls sideways with edge-fades | `HScroll` | `children`, `containerClassName`, `fade` |

## Navigation

| Use when | Component | Key props |
| --- | --- | --- |
| The global top bar (logo · search · actions) | `TopBar` | `logo`, `center`, `actions` |
| The left nav with sections + items | `Sidebar`, `SidebarSection`, `SidebarItem` | Section: `label`, `collapsible` · Item: `icon`, `label`, `active`, `href`, `comingSoon` |
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
| A checkbox | `Checkbox` | `checked`, `onCheckedChange`, `aria-label` |
| A radio group | `RadioGroup`, `Radio` | Group: `value`, `onValueChange` · Radio: `value` |
| An on/off switch | `Switch` | `checked`, `onCheckedChange`, `aria-label` |
| A small view-swapper toggle | `SegmentedControl` | `items`, `value`, `onValueChange`, `size` |
| A reporting date control (presets + calendar) | `DateRangePicker` | `value`, `onValueChange`, `presets`, `weekStartsOn`, `today` |
| Wrapping a control with a label / hint / error | `Field` | `label`, `hint`, `error`, `htmlFor` |

## Data display

| Use when | Component | Key props |
| --- | --- | --- |
| A sortable, searchable, filterable table (virtualized) | `DataTable` (+ `TableLink`, `downloadCsv`/`downloadPdf`) | `columns`, `rows`, `searchable`, `filters`, `tabs`, `getRowHref`, `groupBy` / `renderGroupHeader` (rows under a parent record; also `defaultCollapsedGroups`, `ungroupedLabel`, `searchActive`, `collapsedGroups` / `onCollapsedGroupsChange`), `exportFilename` |
| A P&L / period matrix with drill-down | `ReportTable` | `sections`, `periods`, `summaryColumns`, `view`, `formatValue` |
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

### DataTable column widths (the Linear model)

Columns never wrap and never push each other — content clips with `…`. Width is
decided per column:

- **Leave exactly ONE primary text column with no `width` and no `maxWidth`** — it
  is the **filler**: it stretches to fill the row when there's space, and shrinks
  + truncates (down to `minWidth`, default 120px) when there isn't. This is what
  keeps the table full *and* prevents a runaway column. (Miss this and you get
  dead space on the right, or — if you cap the only text column — nothing fills.)
- **Give every other column a `width`** (fixed) — numbers, dates, badges, status.
  A numeric column auto-aligns right + sizes tight; a column with a custom
  `render` keeps left alignment (set `align` to override).
- **Set `minWidth` on the filler** if 120px is too tight before it truncates.
- **When the table is wider than its container**, the filler sits at its
  `minWidth` and truncates; horizontal scroll is driven by the fixed columns —
  the filler never blows out to its full content.
- **A truncating text cell must render inline/string content** (a Fragment of
  `<span>`s, not a wrapping `<div>`) or the `…` won't show — CSS only ellipsizes
  inline content. Set `value` for search/export.
- **Never hand-roll a table or the export button** — use `DataTable` +
  `exportFilename`/`pdfTitle`; the Export control is the built-in right-aligned
  dropdown and must not be moved or replaced.

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
anywhere you compose conditional Tailwind classes.
