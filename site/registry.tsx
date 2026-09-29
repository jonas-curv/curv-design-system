import * as React from "react";
import {
  Bell,
  BookOpen,
  ChevronDown,
  Copy,
  Gauge,
  House,
  Inbox,
  LayoutGrid,
  ListChecks,
  MessageSquarePlus,
  Pencil,
  Radar,
  Search,
  Sparkles,
  Trash2,
  Users,
} from "lucide-react";
import { MorphStack, MorphStackButton, MorphStackInput, type MorphStackItem } from "../src/morph";
import {
  AppFrame,
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  Card,
  Checkbox,
  DataTable,
  type DataTableColumn,
  Dialog,
  DialogClose,
  Field,
  type FilterDef,
  Input,
  Menu,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  PageContainer,
  Radio,
  RadioGroup,
  Banner,
  KanbanBoard,
  KanbanColumn,
  KanbanCard,
  LineChart,
  BarChart,
  BarBreakdown,
  ChartCard,
  ReportTable,
  type ReportSection as ReportSectionT,
  TableLink,
  CopyButton,
  BreakdownRow,
  Kbd,
  Skeleton,
  ConfirmDialog,
  DateRangePicker,
  type DateRangeValue as DateRangeValueT,
  CommandPalette,
  type CommandItem,
  Drawer,
  DrawerClose,
  EmptyState,
  PageHeader,
  Popover,
  PopoverClose,
  SegmentedControl,
  Select,
  MultiSelect,
  Sparkline,
  StatCard,
  StatGroup,
  SummaryStrip,
  Sidebar,
  SidebarItem,
  SidebarSection,
  Tabs,
  Switch,
  Textarea,
  ToastProvider,
  Tooltip,
  TooltipProvider,
  TopBar,
  ThemeToggle,
  AccountMenu,
  AccountMenuItem,
  NotificationBell,
  type NotificationItem,
  cn,
  toast,
} from "../src";

/**
 * The showcase registry. Each entry is one component: its metadata, a usage
 * snippet, and one-or-more live demos rendered on the canvas. Add a component
 * here when you add it to src/ — this is the site's source of truth.
 */

export type CanvasKind = "center" | "fill" | "frame" | "surface";

export interface Demo {
  title?: string;
  description?: string;
  canvas: CanvasKind;
  render: () => React.ReactNode;
}

export interface Entry {
  slug: string;
  name: string;
  /** Category — one of GROUP_ORDER. Plain language, not jargon. */
  group: string;
  /** Show a monotone "New" badge in the nav + header. */
  isNew?: boolean;
  summary: string;
  usage: string;
  demos: Demo[];
}

/* ---------- shared demo furniture ---------- */

function IconBtn({ children }: { children: React.ReactNode }) {
  return (
    <button className="grid h-9 w-9 place-items-center rounded-md text-white/70 transition hover:bg-white/10 hover:text-white">
      {children}
    </button>
  );
}

const demoLogo = (
  <span className="pl-1 text-[15px] font-semibold lowercase text-white">
    customs
    <span className="align-super text-[8px] font-normal text-white/60">os</span>
  </span>
);

const demoSearch = (
  <div className="flex w-full max-w-xl items-center gap-2 rounded-md bg-white/10 px-3 py-1.5 text-[13px] text-white/55">
    <Search size={15} />
    <span>Search</span>
    <span className="ml-auto rounded bg-white/10 px-1.5 py-0.5 text-[11px]">⌘K</span>
  </div>
);

const demoActions = (
  <>
    <IconBtn>
      <BookOpen size={17} />
    </IconBtn>
    <IconBtn>
      <MessageSquarePlus size={17} />
    </IconBtn>
    <IconBtn>
      <Bell size={17} />
    </IconBtn>
    <div className="ml-1 flex items-center gap-2 rounded-md px-2 py-1 transition hover:bg-white/10">
      <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-[12px] font-semibold text-accent-foreground">
        J
      </span>
      <span className="text-[13px] text-white">Jordan</span>
    </div>
  </>
);

type NavItem = { icon: typeof House; label: string; active?: boolean; comingSoon?: boolean };
type NavGroup = { section: string | null; items: NavItem[] };

const DEMO_NAV: NavGroup[] = [
  { section: null, items: [{ icon: House, label: "Home", active: true }] },
  {
    section: "Leads",
    items: [
      { icon: Gauge, label: "Lead Allocation" },
      { icon: Sparkles, label: "Leads Intelligence" },
      { icon: Inbox, label: "Raw Leads" },
      { icon: ListChecks, label: "Manual Review" },
    ],
  },
  {
    section: "Pipeline",
    items: [
      { icon: Users, label: "Customers" },
      { icon: LayoutGrid, label: "Deals" },
    ],
  },
  { section: "Analytics", items: [{ icon: Radar, label: "Analytics" }, { icon: LayoutGrid, label: "Attribution", comingSoon: true }] },
];

function DemoSidebar() {
  return (
    <Sidebar>
      {DEMO_NAV.map((group, i) => (
        <SidebarSection
          key={i}
          label={group.section ?? undefined}
          collapsible={!!group.section}
          defaultOpen
        >
          {group.items.map((it) => (
            <SidebarItem key={it.label} icon={it.icon} label={it.label} active={it.active} comingSoon={it.comingSoon} />
          ))}
        </SidebarSection>
      ))}
    </Sidebar>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="flex flex-col px-5 py-4">
      <span className="text-[12px] font-medium text-muted-foreground">{label}</span>
      <span className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
        {value}
      </span>
      <span className="mt-1 text-[11.5px] text-muted-foreground">{sub}</span>
    </Card>
  );
}

function DealsPage() {
  return (
    <PageContainer bleed>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Deals</h1>
        <div className="flex items-center gap-2 text-[13px]">
          <span className="inline-flex h-9 items-center rounded-md border border-border bg-card px-3 text-muted-foreground">
            All brands
          </span>
          <span className="inline-flex h-9 items-center rounded-md border border-border bg-card px-3 text-muted-foreground">
            Jul 1 – 18, 2026
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi label="Collected GP" value="$327,449" sub="month to date" />
        <Kpi label="Deals" value="261" sub="of 261" />
        <Kpi label="Confirmed" value="211" sub="80.8%" />
        <Kpi label="To collect" value="50" sub="pending" />
      </div>
      <Card className="mt-4 grid h-[560px] place-items-center text-sm text-muted-foreground">
        DataTable — the next component we extract &amp; fine-tune.
        <span className="mt-1 text-[12px]">(scroll — the sidebar corner stays pinned under the bar)</span>
      </Card>
    </PageContainer>
  );
}

function DashedBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

/* ---------- DataTable demo ---------- */

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

type DealRow = {
  id: string;
  status: "Confirmed" | "To collect";
  customer: string;
  order: string;
  brand: string;
  ae: string;
  cs: string;
  engineer: string | null;
  revenue: number;
  gp: number;
  balance: number;
};

const DEAL_ROWS: DealRow[] = [
  { id: "1", status: "Confirmed", customer: "Adventure Works", order: "SO-1042", brand: "CT", ae: "Alex Morgan", cs: "Casey Kim", engineer: "Quinn Patel", revenue: 48200, gp: 15100, balance: 0 },
  { id: "2", status: "To collect", customer: "Wingtip Toys", order: "SO-1043", brand: "CT", ae: "Sam Rivera", cs: "Taylor Brooks", engineer: null, revenue: 31900, gp: 9700, balance: 12400 },
  { id: "3", status: "Confirmed", customer: "Wide World Importers", order: "SO-1044", brand: "NW", ae: "Jordan Lee", cs: "Jamie Cruz", engineer: null, revenue: 27650, gp: 8100, balance: 0 },
  { id: "4", status: "Confirmed", customer: "Proseware", order: "SO-1045", brand: "CT", ae: "Alex Morgan", cs: "Riley Chen", engineer: "Avery Stone", revenue: 22400, gp: 6600, balance: 0 },
  { id: "5", status: "To collect", customer: "Litware", order: "SO-1046", brand: "NW", ae: "Sam Rivera", cs: "Morgan Diaz", engineer: null, revenue: 19800, gp: 5200, balance: 8300 },
  { id: "6", status: "Confirmed", customer: "Fourth Coffee", order: "SO-1047", brand: "CT", ae: "Jordan Lee", cs: "Casey Kim", engineer: "Quinn Patel", revenue: 17250, gp: 4900, balance: 0 },
  { id: "7", status: "To collect", customer: "Trey Research", order: "SO-1048", brand: "NW", ae: "Alex Morgan", cs: "Taylor Brooks", engineer: null, revenue: 14100, gp: 3100, balance: 6100 },
  { id: "8", status: "Confirmed", customer: "Lucerne Publishing", order: "SO-1049", brand: "CT", ae: "Sam Rivera", cs: "Jamie Cruz", engineer: "Avery Stone", revenue: 12750, gp: 3800, balance: 0 },
  { id: "9", status: "Confirmed", customer: "Woodgrove", order: "SO-1050", brand: "NW", ae: "Jordan Lee", cs: "Riley Chen", engineer: null, revenue: 9600, gp: -400, balance: 0 },
  { id: "10", status: "To collect", customer: "Margie's Travel", order: "SO-1051", brand: "CT", ae: "Alex Morgan", cs: "Morgan Diaz", engineer: null, revenue: 8200, gp: 2300, balance: 4100 },
];

/** People render identically everywhere — Avatar + name. */
function PersonCell({ name }: { name: string | null }) {
  if (!name) return <span className="text-muted-foreground/50">—</span>;
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar name={name} size="sm" />
      <span className="truncate">{name}</span>
    </span>
  );
}

const DEAL_COLUMNS: DataTableColumn<DealRow>[] = [
  { key: "customer", header: "Customer", width: 220, sticky: true, render: (r) => <TableLink href={`#/customer-${r.id}`}>{r.customer}</TableLink>, value: (r) => r.customer },
  { key: "status", header: "Status", width: 132, render: (r) => <Badge variant={r.status === "Confirmed" ? "green" : "neutral"}>{r.status}</Badge>, value: (r) => r.status },
  {
    key: "order",
    header: "Order #",
    width: 128,
    render: (r) => (
      <span className="group/copy flex items-center gap-0.5">
        <TableLink subtle href={`#/order-${r.order}`}>{r.order}</TableLink>
        <CopyButton value={r.order} label="Copy order #" revealOnHover />
      </span>
    ),
    value: (r) => r.order,
  },
  { key: "brand", header: "Brand", width: 84, className: "text-muted-foreground" },
  { key: "ae", header: "AE", width: 168, render: (r) => <PersonCell name={r.ae} />, value: (r) => r.ae },
  { key: "cs", header: "CS", width: 176, render: (r) => <PersonCell name={r.cs} />, value: (r) => r.cs },
  { key: "engineer", header: "Engineer", width: 176, render: (r) => <PersonCell name={r.engineer} />, value: (r) => r.engineer },
  { key: "revenue", header: "Revenue", width: 120, align: "right", render: (r) => usd.format(r.revenue), value: (r) => r.revenue },
  {
    key: "gp",
    header: "GP",
    width: 110,
    align: "right",
    render: (r) => <span className={cn("font-medium", r.gp < 0 && "text-verdict-red")}>{usd.format(r.gp)}</span>,
    value: (r) => r.gp,
  },
  {
    key: "balance",
    header: "Balance",
    width: 120,
    align: "right",
    render: (r) => (r.balance === 0 ? <span className="text-muted-foreground/50">—</span> : usd.format(r.balance)),
    value: (r) => r.balance,
  },
];

const DEAL_FILTERS: FilterDef<DealRow>[] = [
  {
    key: "status",
    label: "Status",
    options: [
      { value: "Confirmed", label: "Confirmed" },
      { value: "To collect", label: "To collect" },
    ],
    get: (r) => r.status,
  },
  {
    key: "brand",
    label: "Brand",
    options: [
      { value: "CT", label: "CT" },
      { value: "NW", label: "NW" },
    ],
    get: (r) => r.brand,
  },
  {
    key: "ae",
    label: "AE",
    options: [
      { value: "Alex Morgan", label: "Alex Morgan" },
      { value: "Sam Rivera", label: "Sam Rivera" },
      { value: "Jordan Lee", label: "Jordan Lee" },
    ],
    get: (r) => r.ae,
  },
  {
    key: "revenue",
    label: "Revenue",
    kind: "range",
    format: (n) => usd.format(n),
    presets: [
      { label: "≥ $20k", min: 20000, max: null },
      { label: "$10k–20k", min: 10000, max: 20000 },
    ],
    get: (r) => r.revenue,
  },
  {
    key: "balance",
    label: "Balance",
    kind: "range",
    format: (n) => usd.format(n),
    presets: [{ label: "Outstanding", min: 1, max: null }],
    get: (r) => r.balance,
  },
];

const SPARK_UP = [12, 14, 13, 16, 15, 19, 18, 22, 24, 23, 27, 31];
const SPARK_DOWN = [31, 29, 30, 26, 27, 22, 24, 20, 18, 19, 15, 13];

const GP_2026 = [494839, 469444, 827076, 970958, 1002973, 782572, 309429];
const GP_2025 = [402000, 511000, 690000, 742000, 861000, 705000, 640000];
const GP_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
const usdK = (n: number) => (n === 0 ? "$0" : `$${Math.round(n / 1000)}K`);

function DateRangePickerDemo() {
  const [v, setV] = React.useState<DateRangeValueT | undefined>(undefined);
  return (
    <div className="flex min-h-[440px] items-start justify-center pt-2">
      <DateRangePicker value={v} onValueChange={setV} align="start" today={new Date(2026, 6, 19)} />
    </div>
  );
}

const METRIC_ITEMS = [
  { value: "gp", label: "Gross profit" },
  { value: "rev", label: "Total revenue" },
  { value: "opex", label: "Total OpEx" },
];

function LineChartDemo() {
  const [metric, setMetric] = React.useState("gp");
  const scale = metric === "rev" ? 2.1 : metric === "opex" ? 0.55 : 1;
  const cur = GP_2026.map((v) => Math.round(v * scale));
  const prev = GP_2025.map((v) => Math.round(v * scale));
  const total = cur.reduce((s, v) => s + v, 0);
  return (
    <div className="w-full">
      <ChartCard
        title={METRIC_ITEMS.find((m) => m.value === metric)?.label}
        value={`$${(total / 1e6).toFixed(2)}M`}
        delta={{ value: "14.3%", direction: "up" }}
        controls={<Select items={METRIC_ITEMS} value={metric} onValueChange={setMetric} className="h-8 w-[168px]" />}
        legend={[
          { key: "cur", label: "2026", className: "text-chart", variant: "solid" },
          { key: "prev", label: "Prior year", className: "text-chart-prev", variant: "dashed" },
        ]}
      >
        {({ hidden }) => (
          <LineChart
            height={240}
            area
            formatY={usdK}
            formatTooltip={(n) => `$${n.toLocaleString()}`}
            // `tooltipTitle` turns on the Shopify layout: metric title, each series
            // on its OWN date (pointLabels) + value chip, delta under the current.
            tooltipTitle={METRIC_ITEMS.find((m) => m.value === metric)?.label}
            xLabels={GP_MONTHS}
            series={[
              // Solid actual → dashed projected tail (partialFrom).
              !hidden.has("cur") && { data: cur, label: "2026", partialFrom: 4, className: "text-chart", pointLabels: GP_MONTHS.map((m) => `${m} 2026`) },
              // `comparison` styles itself (dashed, chart-prev) and adds the
              // "% from comparison" hover delta — no hand-styling needed.
              !hidden.has("prev") && { data: prev, label: "Prior year", comparison: true, pointLabels: GP_MONTHS.map((m) => `${m} 2025`) },
            ].filter(Boolean) as React.ComponentProps<typeof LineChart>["series"]}
          />
        )}
      </ChartCard>
    </div>
  );
}

const PL_PERIODS = [
  { key: "jan", label: "Jan" }, { key: "feb", label: "Feb" }, { key: "mar", label: "Mar" },
  { key: "apr", label: "Apr" }, { key: "may", label: "May" }, { key: "jun", label: "Jun", partial: true },
];
const mo = (a: number[]) => Object.fromEntries(PL_PERIODS.map((p, i) => [p.key, a[i]]));
const PL_SECTIONS = [
  {
    key: "rev", label: "Revenue & product costs", collapsible: true,
    rows: [
      { key: "rev", label: "Revenue", subtotal: true, values: mo([3330881, 2911283, 3745173, 4360920, 3540165, 4469319]), total: 22357741, trend: [3.3, 2.9, 3.7, 4.4, 3.5, 4.5], data: { fc: -24, ly: 27 } },
      { key: "prod", label: "Product revenue", indent: 1, values: mo([2560000, 2240000, 2880000, 3350000, 2720000, 3430000]), total: 17680000, trend: [2.6, 2.2, 2.9, 3.4, 2.7, 3.4], data: { fc: -23, ly: 25 } },
      { key: "ship", label: "Shipping revenue", indent: 1, values: mo([770881, 671283, 865173, 1010920, 820165, 1039319]), total: 5177741, trend: [0.8, 0.7, 0.9, 1.0, 0.8, 1.0], data: { fc: -28, ly: 33 } },
      { key: "cogs", label: "Landed COGS", indent: 1, values: mo([-1200000, -1050000, -1350000, -1560000, -1270000, -1610000]), total: -8040000, trend: [-1.2, -1.1, -1.4, -1.6, -1.3, -1.6], data: { fc: 4, ly: -12 } },
    ],
  },
  {
    key: "gp", rows: [
      { key: "gp", label: "Gross profit", subtotal: true, values: mo([2130881, 1861283, 2395173, 2800920, 2270165, 2859319]), total: 14317741, trend: [2.1, 1.9, 2.4, 2.8, 2.3, 2.9], data: { fc: -18, ly: 21 } },
    ],
  },
  {
    key: "sell", label: "Selling costs", collapsible: true,
    rows: [
      { key: "mkt", label: "Marketing", indent: 1, values: mo([-620000, -540000, -700000, -810000, -660000, -830000]), total: -4160000, trend: [-0.6, -0.5, -0.7, -0.8, -0.7, -0.8], data: { fc: -8, ly: 14 } },
      { key: "fees", label: "Transaction fees", indent: 1, values: mo([-98000, -86000, -112000, -130000, -105000, -132000]), total: -663000, trend: [-0.1, -0.1, -0.1, -0.1, -0.1, -0.1], data: { fc: 2, ly: 9 } },
    ],
  },
  {
    key: "ni", rows: [
      { key: "ni", label: "Net income", subtotal: true, values: mo([1412881, 1235283, 1583173, 1860920, 1505165, 1897319]), total: 9494741, trend: [1.4, 1.2, 1.6, 1.9, 1.5, 1.9], data: { fc: -31, ly: 19 } },
    ],
  },
] satisfies ReportSectionT[];

const plUsd = (n: number) => `${n < 0 ? "-" : ""}$${(Math.abs(n) / 1e6).toFixed(2)}M`;
const pctTag = (v: number) => (
  <span className="tabular-nums">{v > 0 ? "+" : ""}{v}%</span>
);

function ReportTableDemo() {
  const [drill, setDrill] = React.useState<string | null>(null);
  return (
    <div className="w-full space-y-2">
      <p className="text-[12px] text-muted-foreground">
        Click any number to drill in →{" "}
        {drill ? <span className="font-medium text-foreground">{drill}</span> : <span className="italic">would open a Drawer of the underlying transactions</span>}
      </p>
      <ReportTable
        metricLabel="P&L · year to date"
        periods={PL_PERIODS}
        formatValue={(n) => `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n / 1000)).toLocaleString()}K`}
        maxHeight={460}
        onCellClick={(row, col) => setDrill(`${typeof row.label === "string" ? row.label : row.key} · ${col}`)}
        summaryColumns={[
          { key: "trend", label: "Trend", render: (r) => (r.trend ? <div className="ml-auto w-16"><Sparkline data={r.trend} className="text-muted-foreground" /></div> : null) },
          { key: "amount", label: "Amount", render: (r) => <span className="font-medium tabular-nums text-foreground">{plUsd(r.total ?? 0)}</span> },
          { key: "fc", label: "vs forecast", render: (r) => pctTag((r.data?.fc as number) ?? 0), tint: (r) => (r.subtotal ? ((r.data?.fc as number) < 0 ? "negative" : "positive") : null) },
          { key: "ly", label: "vs last year", render: (r) => pctTag((r.data?.ly as number) ?? 0), tint: (r) => (r.subtotal ? ((r.data?.ly as number) < 0 ? "negative" : "positive") : null) },
        ]}
        sections={PL_SECTIONS}
      />
    </div>
  );
}

const REV_CLUSTERED = [2050000, 2320000, 2180000, 2610000, 2470000, 2950000, 2740000];
const revM = (n: number) => `$${(n / 1e6).toFixed(1)}M`;

function LineBaselineDemo() {
  return (
    <div className="grid w-full gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 text-[12px] font-medium text-muted-foreground">
          yBaseline=&quot;zero&quot; — real movement squashed flat
        </div>
        <LineChart height={200} yBaseline="zero" formatY={revM} xLabels={GP_MONTHS} series={[{ data: REV_CLUSTERED, label: "Revenue", className: "text-chart" }]} />
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 text-[12px] font-medium text-muted-foreground">
          yBaseline=&quot;auto&quot; — the $2M–$3M trend is legible
        </div>
        <LineChart height={200} yBaseline="auto" formatY={revM} xLabels={GP_MONTHS} series={[{ data: REV_CLUSTERED, label: "Revenue", className: "text-chart" }]} />
      </div>
    </div>
  );
}

const KANBAN_COLS = [
  { key: "lead", label: "Lead Received", dot: "border-chart-5", value: "", cards: [] as { id: string; name: string; brand: string; accent: string; value: string; age: string; tone: string; warn?: boolean }[] },
  { key: "contacted", label: "Contacted", dot: "border-chart-4", value: "$5.0k", cards: [
    { id: "c1", name: "Graphic Design Institute", brand: "CT", accent: "bg-chart-1", value: "$1.0k", age: "1d", tone: "text-muted-foreground" },
    { id: "c2", name: "Wingtip Toys", brand: "CT", accent: "bg-chart-1", value: "$1.0k", age: "1d", tone: "text-muted-foreground" },
    { id: "c3", name: "Adventure Works", brand: "CT", accent: "bg-chart-1", value: "$3.0k", age: "1d", tone: "text-muted-foreground" },
  ] },
  { key: "quote", label: "Quote Sent", dot: "border-chart-3", value: "$16k", cards: [
    { id: "q1", name: "Springfield High", brand: "CT", accent: "bg-chart-1", value: "$4.3k", age: "today", tone: "text-muted-foreground" },
    { id: "q2", name: "Trey Research", brand: "CT", accent: "bg-chart-1", value: "$2.0k", age: "today", tone: "text-muted-foreground" },
    { id: "q3", name: "Margie's Travel", brand: "CT", accent: "bg-chart-1", value: "$1.1k", age: "today", tone: "text-muted-foreground" },
  ] },
  { key: "nego", label: "Negotiation", dot: "border-chart-2", value: "$34k", cards: [
    { id: "n1", name: "Jordan Lee", brand: "CT", accent: "bg-chart-1", value: "$750", age: "today", tone: "text-muted-foreground" },
    { id: "n2", name: "Litware", brand: "CT", accent: "bg-chart-1", value: "$1.4k", age: "1d", tone: "text-muted-foreground" },
    { id: "n3", name: "Fourth Coffee", brand: "CT", accent: "bg-chart-1", value: "$810", age: "1d", tone: "text-muted-foreground" },
  ] },
  { key: "closing", label: "Closing", dot: "border-chart-1", value: "$9.9k", cards: [
    { id: "x1", name: "Duff Brewing", brand: "CT", accent: "bg-chart-1", value: "$2.7k", age: "1d", tone: "text-muted-foreground" },
    { id: "x2", name: "Lucerne Publishing", brand: "TS", accent: "bg-chart-2", value: "$2.3k", age: "17d", tone: "text-verdict-red", warn: true },
  ] },
  { key: "won", label: "Won", dot: "bg-verdict-green", filled: true, value: "", cards: [] as never[] },
] as const;

function KanbanDemo() {
  return (
    <div className="w-full rounded-lg bg-background p-4">
      <KanbanBoard bleedClassName="-mx-4" padClassName="px-4 pb-1" fade="from-background">
        {KANBAN_COLS.map((col) => (
          <KanbanColumn
            key={col.key}
            label={col.label}
            count={col.cards.length}
            value={col.value || undefined}
            dotClassName={col.dot}
            dotFilled={"filled" in col ? col.filled : false}
            emptyLabel="No deals"
          >
            {col.cards.map((c) => (
              <KanbanCard key={c.id} href="#">
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">{c.name}</span>
                  <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-muted-foreground">
                    <span className={cn("size-1.5 rounded-full", c.accent)} />
                    {c.brand}
                  </span>
                </div>
                <div className="mt-1.5 flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-semibold tabular-nums text-foreground">{c.value}</span>
                  <span className={cn("text-[11px] tabular-nums", c.tone)}>{c.age}{c.warn ? " ⚠" : ""}</span>
                </div>
              </KanbanCard>
            ))}
          </KanbanColumn>
        ))}
      </KanbanBoard>
    </div>
  );
}

function BarChartDemo() {
  return (
    <div className="w-full">
      <ChartCard
        title="Campaign revenue"
        value="$24.5K"
        delta={{ value: "8.2%", direction: "up" }}
        legend={[
          { label: "Statik", className: "text-chart", variant: "solid" },
          { label: "KeySmart", className: "text-chart-compare", variant: "solid" },
        ]}
      >
        <BarChart
          height={220}
          formatY={(n) => `$${(n / 1000).toFixed(0)}K`}
          formatTooltip={(n) => `$${n.toLocaleString()}`}
          xLabels={["Jun 20", "Jun 22", "Jun 24", "Jun 26", "Jun 28", "Jun 30", "Jul 2", "Jul 4", "Jul 6", "Jul 8"]}
          series={[
            { data: [1800, 2100, 900, 400, 700, 300, 1200, 500, 1100, 600], label: "Statik", className: "text-chart" },
            { data: [1000, 900, 300, 150, 200, 120, 500, 200, 400, 260], label: "KeySmart", className: "text-chart-compare" },
          ]}
        />
      </ChartCard>
    </div>
  );
}

const REFUND_CAUSES = [
  { label: "Others", value: 46, meta: "$15K" },
  { label: "Shipping & customs", value: 45, meta: "$4K" },
  { label: "Customer decisions", value: 27, meta: "$20K" },
  { label: "Artwork & design", value: 19, meta: "$6K" },
  { label: "Quality issues", value: 19, meta: "$3K" },
  { label: "Invoicing mistake", value: 16, meta: "$2K" },
  { label: "Production delays", value: 8, meta: "$6K" },
];

function BarBreakdownDemo() {
  return (
    <div className="w-full rounded-lg border border-border bg-card p-5">
      <div className="mb-1 text-[13px] font-medium text-foreground">Refunds by root cause</div>
      <div className="mb-3 text-[12px] text-muted-foreground">Count of refunds filed · trailing 12 months</div>
      <BarBreakdown items={REFUND_CAUSES} formatValue={(n) => String(n)} valueLabel="Refunds" metaLabel="$" />
    </div>
  );
}

function SummaryStripDemo() {
  return (
    <div className="w-full">
      <SummaryStrip
        label="Catalog value by status"
        total="$21.4M"
        caption="2,369 SKUs · COGS × on-hand + inbound"
        items={[
          { label: "Keep", value: "$1.9M", share: 9, colorClassName: "bg-chart-2" },
          { label: "Cut", value: "$836K", share: 4, colorClassName: "bg-verdict-red" },
          { label: "Scale", value: "$616K", share: 3, colorClassName: "bg-verdict-green" },
          { label: "TBD", value: "$466K", share: 2, colorClassName: "bg-verdict-amber" },
          { label: "Discontinued", value: "$0", share: 0 },
          { label: "No status", value: "$17.6M", share: 82 },
        ]}
      />
    </div>
  );
}

function StatCardDemo() {
  return (
    <div className="w-full max-w-[880px] space-y-6">
      {/* Primary pattern: a KPI row as divided sections of one card. The first
          card is a link (↗ on hover) AND has the hover-breakdown card. */}
      <StatGroup>
        <StatCard
          label="July GP"
          value="$337K"
          delta={{ value: "12.4%", direction: "up" }}
          caption="vs last mo"
          sparkline={SPARK_UP}
          sparklineVariant="area"
          sparklineClassName="text-verdict-green"
          href="#/analytics"
          breakdown={
            <div className="flex flex-col">
              <BreakdownRow label="This period" value="$337K" />
              <BreakdownRow label="Last month" value="$301K" delta={{ value: "12%", direction: "up" }} />
              <BreakdownRow label="Last year" value="$223K" delta={{ value: "51%", direction: "up" }} />
              <div className="my-1.5 h-px bg-border" />
              <div className="pb-0.5 text-[11px] font-medium text-muted-foreground">By brand</div>
              <BreakdownRow label={<><span className="size-1.5 rounded-full bg-chart-1" />FK</>} value="$215K" />
              <BreakdownRow label={<><span className="size-1.5 rounded-full bg-chart-2" />CI</>} value="$101K" />
              <BreakdownRow label={<><span className="size-1.5 rounded-full bg-chart-3" />COM</>} value="$21K" />
            </div>
          }
        />
        <StatCard label="Leads" value="1,023" delta={{ value: "8.1%", direction: "up" }} caption="vs last mo" sparkline={SPARK_UP} />
        <StatCard label="Refund rate" value="1.9%" delta={{ value: "0.6pt", direction: "up", sentiment: "negative" }} caption="vs last mo" sparkline={SPARK_UP} />
        <StatCard label="New biz conversion" value="19.2%" delta={{ value: "0.7pt", direction: "down", sentiment: "negative" }} caption="vs last mo" hint="Paid orders ÷ inbound leads, selected period." sparkline={SPARK_DOWN} />
      </StatGroup>

      {/* Delta style comparison — pick a default. */}
      <div>
        <p className="mb-2 text-[12px] text-muted-foreground">Delta style — <span className="text-foreground">text</span> vs <span className="text-foreground">chip</span> (same data)</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatGroup>
            <StatCard label="Revenue" value="$471K" delta={{ value: "34.6%", direction: "down", sentiment: "negative" }} caption="vs last mo" deltaStyle="text" />
            <StatCard label="Closed" value="227" delta={{ value: "5.2%", direction: "up" }} caption="vs last mo" deltaStyle="text" />
          </StatGroup>
          <StatGroup>
            <StatCard label="Revenue" value="$471K" delta={{ value: "34.6%", direction: "down", sentiment: "negative" }} caption="vs last mo" deltaStyle="chip" />
            <StatCard label="Closed" value="227" delta={{ value: "5.2%", direction: "up" }} caption="vs last mo" deltaStyle="chip" />
          </StatGroup>
        </div>
      </div>
    </div>
  );
}

function PopoverDemo() {
  return (
    <Popover
      align="start"
      trigger={<Button variant="outline" size="sm">Edit column</Button>}
    >
      <div className="w-60 space-y-3">
        <p className="font-medium text-foreground">Rename column</p>
        <Input defaultValue="Gross profit" aria-label="Column name" />
        <div className="flex justify-end gap-2">
          <PopoverClose render={<Button variant="secondary" size="sm">Cancel</Button>} />
          <PopoverClose render={<Button size="sm">Save</Button>} />
        </div>
      </div>
    </Popover>
  );
}

function DrawerDemo() {
  return (
    <Drawer
      trigger={<Button variant="outline" size="sm">Open deal</Button>}
      title="Adventure Works"
      description="SO-1042 · Confirmed"
      footer={
        <>
          <DrawerClose render={<Button variant="secondary" size="sm">Close</Button>} />
          <Button size="sm">Edit deal</Button>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-muted-foreground">A right-side sheet for record detail, filters, or a peek — without leaving the list. Focus is trapped; Escape or the backdrop closes it.</p>
        <div className="space-y-2">
          {[["Revenue", "$48,200"], ["GP", "$15,100"], ["AE", "Alex Morgan"], ["Engineer", "Quinn Patel"]].map(([k, v]) => (
            <div key={k} className="flex items-center justify-between border-b border-border py-2">
              <span className="text-muted-foreground">{k}</span>
              <span className="tabular-nums text-foreground">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </Drawer>
  );
}

const CMD_ITEMS: CommandItem[] = [
  { id: "leads", label: "Leads intelligence", group: "Leads", hint: "Leads", onSelect: () => {} },
  { id: "alloc", label: "Lead allocation", group: "Leads", hint: "Leads", onSelect: () => {} },
  { id: "review", label: "Manual review", group: "Leads", hint: "Leads", onSelect: () => {} },
  { id: "deals", label: "Deals", group: "Pipeline", hint: "Pipeline", keywords: "orders", onSelect: () => {} },
  { id: "customers", label: "Customers", group: "Pipeline", hint: "Pipeline", onSelect: () => {} },
  { id: "quote", label: "Quotation", group: "Tools", hint: "Tools", keywords: "rfq quote", onSelect: () => {} },
  { id: "ship", label: "Shipping calculator", group: "Tools", hint: "Tools", onSelect: () => {} },
  { id: "refunds", label: "Refunds", group: "Finance", hint: "Finance", onSelect: () => {} },
  { id: "leaderboard", label: "Leaderboard", group: "Reports", hint: "Reports", onSelect: () => {} },
];

const CMD_RECENTS: CommandItem[] = [
  { id: "r-so1042", label: "SO-1042 · Adventure Works", hint: "Deal", onSelect: () => {} },
  { id: "r-deals", label: "Deals", hint: "Pipeline", onSelect: () => {} },
  { id: "r-refunds", label: "Refunds", hint: "Finance", onSelect: () => {} },
];

function CommandPaletteDemo() {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="flex flex-col items-center gap-3">
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Open search
      </Button>
      <p className="text-[12px] text-muted-foreground">…or press ⌘K / Ctrl-K anywhere. ↑↓ to navigate, Enter to select, Esc to close.</p>
      <CommandPalette open={open} onOpenChange={setOpen} items={CMD_ITEMS} recents={CMD_RECENTS} />
    </div>
  );
}

const BRAND_ITEMS = [
  { value: "all", label: "All brands" },
  { value: "ct", label: "Contoso" },
  { value: "fb", label: "Fabrikam" },
  { value: "nw", label: "Northwind" },
];

function PageHeaderDemo() {
  const [range, setRange] = React.useState<DateRangeValueT | undefined>(undefined);
  const [brand, setBrand] = React.useState("all");
  return (
    <div className="w-full rounded-lg border border-border bg-card p-5">
      <PageHeader
        eyebrow="Finance / Refunds"
        title="Refund dashboard"
        badge={<Badge variant="green">Live</Badge>}
        description="Activity counted by refund date. Refund rate uses deals closed in the same period."
        actions={
          <>
            {/* Real composed controls — the shell hosts, it doesn't hardcode. */}
            <Select items={BRAND_ITEMS} value={brand} onValueChange={setBrand} className="h-9 w-[150px]" />
            <DateRangePicker value={range} onValueChange={setRange} align="end" today={new Date(2026, 6, 19)} />
            <Button>Request refund</Button>
          </>
        }
      />
    </div>
  );
}

function BannerDemo() {
  return (
    <div className="w-full max-w-[720px] space-y-3">
      <Banner variant="info" title="Sample data">
        This dashboard is showing example data. Connect a source to see your own numbers.
      </Banner>
      <Banner
        variant="warning"
        title="Needs Ops pricing — send this RFQ"
        actions={<Button size="sm" variant="outline">Send to Ops</Button>}
      >
        Intake couldn&rsquo;t price this from the catalog. Review the brief, then send it to Ops.
      </Banner>
      <Banner variant="success" title="Deal confirmed" onDismiss={() => {}}>
        SO-1042 moved to Confirmed and the customer was notified.
      </Banner>
      <Banner variant="danger" title="Sync failed" actions={<Button size="sm" variant="outline">Retry</Button>}>
        The Amazon connector stopped 3 hours ago. Reviews and fees are stale.
      </Banner>
    </div>
  );
}

function EmptyStateDemo() {
  const box = (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 16V8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <path d="m3.3 7 8.7 5 8.7-5M12 22V12" />
    </svg>
  );
  return (
    <div className="grid w-full max-w-[880px] grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="rounded-lg border border-border bg-card">
        <EmptyState
          size="md"
          icon={box}
          title="No refunds in this period"
          description="Nothing to review yet. Try widening the date range or clearing filters."
          actions={<Button size="sm" variant="outline">Clear filters</Button>}
        />
      </div>
      <div className="rounded-lg border border-border bg-card">
        <EmptyState
          size="sm"
          icon={box}
          title="Amazon reviews"
          description="Not connected — authorize the Amazon connector to sync."
          actions={<Button size="sm" variant="outline">Connect</Button>}
        />
      </div>
    </div>
  );
}

function DealsTableDemo() {
  const collectedGp = DEAL_ROWS.reduce((s, r) => s + r.gp, 0);
  const [loading, setLoading] = React.useState(false);
  const simulate = () => {
    setLoading(true);
    window.setTimeout(() => setLoading(false), 1800);
  };
  return (
    <div className="space-y-3">
      <DataTable
        columns={DEAL_COLUMNS}
        rows={DEAL_ROWS}
        getRowId={(r) => r.id}
        getRowHref={(r) => `#/deal-${r.order}`}
        getRowLabel={(r) => `Open deal ${r.order} — ${r.customer}`}
        loading={loading}
        initialSort={{ key: "revenue", order: "desc" }}
        searchable
        searchPlaceholder="Search customer or order #"
        searchKeys={["customer", "order"]}
        filters={DEAL_FILTERS}
        tabs={[
          { key: "all", label: "All deals" },
          { key: "confirmed", label: "Confirmed", filter: (r) => r.status === "Confirmed" },
          { key: "tocollect", label: "To collect", filter: (r) => r.status === "To collect" },
        ]}
        summary={
          <span className="text-[12px] tabular-nums text-muted-foreground">
            <span className="font-medium text-foreground">{usd.format(collectedGp)}</span> GP
          </span>
        }
        exportFilename="deals"
        pdfTitle="Deals"
        pdfSubtitle="Curv OS — sample export"
        unit="deals"
        maxHeight={440}
      />
      {/* Showcase-only control — not part of the DataTable. */}
      <div className="flex items-center gap-2 pl-1 text-[12px] text-muted-foreground">
        <span>Showcase control:</span>
        <Button variant="outline" size="sm" onClick={simulate}>
          Simulate loading
        </Button>
      </div>
    </div>
  );
}

/* ---------- form-control demos (need local state) ---------- */

function TextFieldDemo() {
  return (
    <div className="flex w-[300px] flex-col gap-4">
      <Field label="Customer" htmlFor="tf-1">
        <Input id="tf-1" placeholder="Acme Inc." />
      </Field>
      <Field label="Email" htmlFor="tf-2" hint="We'll only use this for receipts.">
        <Input id="tf-2" type="email" placeholder="you@company.com" />
      </Field>
      <Field label="Order #" htmlFor="tf-3" error="That order doesn't exist.">
        <Input id="tf-3" defaultValue="SO-0000" />
      </Field>
    </div>
  );
}

function MultiSelectDemo() {
  const [brands, setBrands] = React.useState<string[]>(["ct", "fb"]);
  return (
    <div className="w-[300px]">
      <Field label="Brands" htmlFor="ms-1">
        <MultiSelect
          id="ms-1"
          value={brands}
          onValueChange={setBrands}
          placeholder="All brands"
          searchPlaceholder="Search brands…"
          items={[
            { value: "ct", label: "Contoso" },
            { value: "fb", label: "Fabrikam" },
            { value: "nw", label: "Northwind" },
            { value: "ts", label: "Tailspin" },
          ]}
        />
      </Field>
    </div>
  );
}

function SelectDemo() {
  const [v, setV] = React.useState("ct");
  return (
    <div className="w-[300px]">
      <Field label="Brand" htmlFor="sel-1">
        <Select
          id="sel-1"
          value={v}
          onValueChange={setV}
          items={[
            { value: "ct", label: "Contoso" },
            { value: "cu", label: "Customs" },
            { value: "fb", label: "FB" },
          ]}
        />
      </Field>
    </div>
  );
}

function CheckboxDemo() {
  const [a, setA] = React.useState(true);
  const [b, setB] = React.useState(false);
  return (
    <div className="flex flex-col gap-3 text-[13px] text-foreground">
      <div className="flex items-center gap-2.5">
        <Checkbox checked={a} onCheckedChange={setA} aria-label="Email me updates" /> Email me updates
      </div>
      <div className="flex items-center gap-2.5">
        <Checkbox checked={b} onCheckedChange={setB} aria-label="Subscribe to digest" /> Subscribe to digest
      </div>
      <div className="flex items-center gap-2.5 opacity-50">
        <Checkbox checked disabled aria-label="Locked" /> Locked
      </div>
    </div>
  );
}

function RadioDemo() {
  const [v, setV] = React.useState("mtd");
  return (
    <RadioGroup value={v} onValueChange={setV}>
      <Radio value="wtd">Week to date</Radio>
      <Radio value="mtd">Month to date</Radio>
      <Radio value="qtd">Quarter to date</Radio>
    </RadioGroup>
  );
}

function SwitchDemo() {
  const [on, setOn] = React.useState(true);
  return (
    <div className="flex items-center gap-3 text-[13px] text-foreground">
      <Switch checked={on} onCheckedChange={setOn} aria-label="Notifications" />
      Notifications {on ? "on" : "off"}
    </div>
  );
}

/* ---------- the registry ---------- */

const notifSquare = (bg: string, node: React.ReactNode) => (
  <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", bg)}>{node}</span>
);

function ShellChromeDemo() {
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  const [items, setItems] = React.useState<NotificationItem[]>([
    { id: "1", title: "Deal assigned to you", body: "Contoso — $42k custom order", time: "2m ago", unread: true, href: "#", icon: notifSquare("bg-chart/12 text-chart", <Inbox size={16} />) },
    { id: "2", title: "Feedback resolved", body: "“Export to CSV” shipped in v0.2.8", time: "1h ago", unread: true, href: "#", icon: notifSquare("bg-verdict-green/12 text-verdict-green", <ListChecks size={16} />) },
    { id: "3", title: "Whale spotted", body: "New high-value lead in Manual Review", time: "3h ago", href: "#", icon: notifSquare("bg-muted text-muted-foreground", <Bell size={16} />) },
  ]);
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-1.5">
      <div className="flex-1" />
      <NotificationBell
        items={items}
        onMarkAllRead={() => setItems((p) => p.map((n) => ({ ...n, unread: false })))}
        onMarkRead={(id) => setItems((p) => p.map((n) => (n.id === id ? { ...n, unread: false } : n)))}
        onDismiss={(id) => setItems((p) => p.filter((n) => n.id !== id))}
      />
      <span className="mx-1 h-6 w-px bg-border" aria-hidden />
      <AccountMenu name="Jordan Lee" email="jordan.lee@contoso.com" role="Admin" theme={theme} onThemeChange={setTheme}>
        <AccountMenuItem icon={<Gauge size={15} />} href="#">Access</AccountMenuItem>
        <AccountMenuItem icon={<Users size={15} />} href="#">Team &amp; settings</AccountMenuItem>
        <AccountMenuItem icon={<Sparkles size={15} />} onClick={() => {}}>Replay welcome tour</AccountMenuItem>
      </AccountMenu>
    </div>
  );
}

function ThemeToggleDemo() {
  const [theme, setTheme] = React.useState<"light" | "dark">("light");
  return <ThemeToggle value={theme} onValueChange={setTheme} />;
}


/* ---------- MorphStack demos ---------- */

type Waiting = { id: string; name: string; meta: string; days: number };
const WAITING: Waiting[] = [
  { id: "w1", name: "Sam Rivera", meta: "Time off · Aug 4–8", days: 71 },
  { id: "w2", name: "Priya Shah", meta: "Time off · Sep 22–26", days: 12 },
  { id: "w3", name: "Alex Kim", meta: "Time off · Oct 13–17", days: 9 },
  { id: "w4", name: "Jordan Lee", meta: "Expense · $84.20", days: 2 },
  { id: "w5", name: "Maya Chen", meta: "Expense · $412.00", days: 1 },
];

function MorphApprovalsDemo() {
  const [left, setLeft] = React.useState(WAITING);
  const [declining, setDeclining] = React.useState<string | null>(null);
  const remove = (id: string) => {
    setDeclining(null);
    setLeft((l) => l.filter((w) => w.id !== id));
  };
  const oldest = Math.max(0, ...left.map((w) => w.days));
  const items: MorphStackItem[] = left.map((w) => ({
    id: w.id,
    label: w.name,
    meta: w.meta,
    aside: declining === w.id ? undefined : `${w.days}d`,
    asideTone: w.days >= 7 ? "hot" : "muted",
    actions:
      declining === w.id ? (
        <>
          <MorphStackInput placeholder="Reason" aria-label={`Reason for declining ${w.name}`} autoFocus />
          <MorphStackButton variant="primary" onClick={() => remove(w.id)}>Send</MorphStackButton>
          <MorphStackButton variant="ghost" aria-label="Cancel" onClick={() => setDeclining(null)}>Cancel</MorphStackButton>
        </>
      ) : (
        <>
          <MorphStackButton onClick={() => setDeclining(w.id)} aria-label={`Decline ${w.name}`}>Decline</MorphStackButton>
          <MorphStackButton variant="primary" onClick={() => remove(w.id)} aria-label={`Approve ${w.name}`}>Approve</MorphStackButton>
        </>
      ),
  }));
  return (
    <div className="flex w-full flex-col items-end gap-3">
      <div className="flex h-14 w-full items-center justify-end rounded-lg bg-topbar px-3" data-morph-demo="island">
        <MorphStack
          tone="island"
          anchor="end"
          items={items}
          summary={<><strong>{left.length} waiting</strong><span className={oldest >= 7 ? "morph-hot" : "morph-muted"}> · {oldest}d</span></>}
          title="Approvals"
          headerAction={<a href="#/morph-stack">View all</a>}
          clearedLabel="All clear"
        />
      </div>
      <Button variant="secondary" size="sm" onClick={() => setLeft(WAITING)}>Reset</Button>
    </div>
  );
}

const BURST = ["Northwind Coffee", "Harbor Fitness", "Alder Pine Co", "Summit Dental", "Kite Studio", "Mesa Brewing"];

function MorphGroupDemo() {
  const [left, setLeft] = React.useState(BURST);
  const items: MorphStackItem[] = left.map((name, i) => ({
    id: name,
    label: name,
    meta: `Deal ${18422 - i * 4}`,
    aside: `${2 + i * 11}m`,
    href: "#/morph-stack",
    onOpen: () => setLeft((l) => l.filter((n) => n !== name)),
  }));
  return (
    <div className="w-[360px] rounded-xl bg-popover p-2 shadow-card" data-morph-demo="row">
      <MorphStack
        tone="row"
        items={items}
        summary={<><strong>Design assigned</strong><span className="morph-muted"> · {left[0]} and {left.length - 1} more</span></>}
        pillAside="2m"
        title="Design assigned"
        headerAction={<button type="button" className="morph-link" onClick={() => setLeft([])}>Mark read</button>}
        clearedLabel="All caught up"
      />
      <div className="px-4 py-3 text-[13px] text-muted-foreground">RFQ completed · Deal 18388</div>
      <div className="px-4 pb-2 text-[13px] text-muted-foreground">Refund decision · Order 51207</div>
      <div className="px-2 pb-1"><Button variant="ghost" size="sm" onClick={() => setLeft(BURST)}>Reset</Button></div>
    </div>
  );
}

function MorphAccessDemo() {
  const people = ["Anna Lindqvist", "Diego Ramos", "Tessa Grant"];
  const [left, setLeft] = React.useState(people);
  const items: MorphStackItem[] = left.map((name) => ({
    id: name,
    label: name,
    actions: (
      <>
        <MorphStackButton onClick={() => setLeft((l) => l.filter((n) => n !== name))}>Reject</MorphStackButton>
        <MorphStackButton variant="primary" onClick={() => setLeft((l) => l.filter((n) => n !== name))}>Approve</MorphStackButton>
      </>
    ),
  }));
  return (
    <div className="flex w-full flex-col items-center gap-3" data-morph-demo="dark">
      <MorphStack
        tone="dark"
        anchor="center"
        items={items}
        summary={<><strong>{left[0]?.split(" ")[0]}</strong><span className="morph-muted">{left.length > 1 ? ` and ${left.length - 1} others requested access` : " requested access"}</span></>}
        title="Access requests"
        onDismiss={() => setLeft([])}
        clearedLabel="All handled"
      />
      <Button variant="secondary" size="sm" onClick={() => setLeft(people)}>Reset</Button>
    </div>
  );
}

export const COMPONENTS: Entry[] = [
  {
    slug: "app-frame",
    name: "App Frame",
    group: "Layout and structure",
    summary:
      "The full application shell: dark cradle, sticky top bar, sidebar + content row. Every OS opens with this exact frame.",
    usage: `import { AppFrame, TopBar, PageContainer } from "@curvgroup/design-system";

<AppFrame topBar={<TopBar … />} sidebar={<YourSidebar />}>
  <PageContainer bleed>{/* page */}</PageContainer>
</AppFrame>`,
    demos: [
      {
        title: "Full shell",
        description: "Top bar + sidebar + content, assembled. Scroll inside the frame.",
        canvas: "frame",
        render: () => (
          <AppFrame
            topBar={<TopBar logo={demoLogo} center={demoSearch} actions={demoActions} />}
            sidebar={<DemoSidebar />}
          >
            <DealsPage />
          </AppFrame>
        ),
      },
    ],
  },
  {
    slug: "top-bar",
    name: "Top Bar",
    group: "Navigation",
    summary:
      "The global navigation bar — a fixed dark (#1b1b1b) chrome bar in both themes. Three regions: logo, search, actions.",
    usage: `import { TopBar } from "@curvgroup/design-system";

<TopBar
  logo={<Wordmark />}
  center={<CommandSearch />}
  actions={<Actions />}
/>`,
    demos: [
      {
        canvas: "fill",
        render: () => <TopBar logo={demoLogo} center={demoSearch} actions={demoActions} />,
      },
    ],
  },
  {
    slug: "sidebar",
    name: "Sidebar",
    group: "Navigation",
    isNew: true,
    summary:
      "The left nav — recessed gray, pinned under the bar, rounding into the cradle. Compose it from sections and items with icons + an active state.",
    usage: `import { Sidebar, SidebarSection, SidebarItem } from "@curvgroup/design-system";

<Sidebar>
  <SidebarSection label="Pipeline">
    <SidebarItem icon={Users} label="Customers" onClick={…} />
    <SidebarItem icon={LayoutGrid} label="Deals" active />
  </SidebarSection>
</Sidebar>`,
    demos: [
      {
        title: "In the frame",
        description: "Where a sidebar lives — pinned under the bar. Scroll: the corner stays put.",
        canvas: "frame",
        render: () => (
          <AppFrame
            topBar={<TopBar logo={demoLogo} center={demoSearch} actions={demoActions} />}
            sidebar={<DemoSidebar />}
          >
            <PageContainer>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Sidebar</h1>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Sections, items with icons, and the active state — pinned in the cradle it
                lives in. Scroll: the rounded corner stays under the bar.
              </p>
              <div className="mt-4 h-[440px] rounded-lg border border-dashed border-border" />
            </PageContainer>
          </AppFrame>
        ),
      },
    ],
  },
  {
    slug: "account-notifications",
    name: "Account & notifications",
    group: "Navigation",
    isNew: true,
    summary:
      "The shared top-bar chrome every OS reused by hand: an account chip + menu (identity, theme toggle, item slot), a notification bell + inbox popover, and the standalone Light/Dark ThemeToggle. Data and polling stay in the app; the design system owns the look.",
    usage: `import { AccountMenu, AccountMenuItem, NotificationBell, ThemeToggle } from "@curvgroup/design-system";

<NotificationBell
  items={items} onMarkRead={markRead} onDismiss={dismiss} onMarkAllRead={markAll}
/>
<AccountMenu name={user.name} email={user.email} role={user.role}
  theme={theme} onThemeChange={setTheme}>
  <AccountMenuItem icon={<Shield />} href="/access">Access</AccountMenuItem>
  {/* app owns sign-out (a POST form), passed as a child */}
</AccountMenu>`,
    demos: [
      {
        title: "In the top bar — click to open",
        description: "The bell and account chip as they sit in a top bar. Their content is behind a click: open the bell for the inbox (mark-read / dismiss on hover), and the account chip for identity + the Light/Dark toggle + items. Everything is prop-driven — the app feeds notifications and wires the theme.",
        canvas: "fill",
        render: () => <ShellChromeDemo />,
      },
      {
        title: "Theme toggle (standalone)",
        description: "The Light/Dark toggle is also usable on its own — controlled + callback-driven, so the app owns the actual theme switch.",
        canvas: "center",
        render: () => <ThemeToggleDemo />,
      },
    ],
  },
  {
    slug: "page-container",
    name: "Page Container",
    group: "Layout and structure",
    summary:
      "The content container, in two levels: centered max-width (level 2, most pages) or full-width bleed (level 1, wide tables & boards).",
    usage: `import { PageContainer } from "@curvgroup/design-system";

<PageContainer>{/* level 2 — centered max-width */}</PageContainer>
<PageContainer bleed>{/* level 1 — full width */}</PageContainer>`,
    demos: [
      {
        title: "Level 2 — centered",
        description: "Capped width, centered. The default for most pages.",
        canvas: "fill",
        render: () => (
          <div className="w-full bg-background">
            <PageContainer>
              <DashedBox>Centered max-width content.</DashedBox>
            </PageContainer>
          </div>
        ),
      },
      {
        title: "Level 1 — full width (bleed)",
        description: "Edge-to-edge. For wide tables and boards.",
        canvas: "fill",
        render: () => (
          <div className="w-full bg-background">
            <PageContainer bleed>
              <DashedBox>Full-width content.</DashedBox>
            </PageContainer>
          </div>
        ),
      },
    ],
  },
  {
    slug: "data-table",
    name: "Data Table",
    group: "Data display",
    isNew: true,
    summary:
      "The one table every OS uses. Search, Linear-style filters, view tabs, a summary slot, and CSV/PDF export — each optional. Virtualized rows; column-config driven.",
    usage: `import { DataTable } from "@curvgroup/design-system";

const columns = [
  // Primary text column: a comfortable min-width so typical names fit; longer
  // values truncate with an ellipsis. Numeric columns can stay at the default.
  { key: "customer", header: "Customer", minWidth: 240 },
  { key: "revenue", header: "Revenue", align: "right",
    render: (r) => usd.format(r.revenue), value: (r) => r.revenue },
];

<DataTable
  columns={columns}
  rows={rows}
  searchable
  exportFilename="deals"
  initialSort={{ key: "revenue", order: "desc" }}
/>`,
    demos: [
      {
        title: "Deals",
        description:
          "Everything on: search + Filter (Linear-style chips) + view tabs + summary + Export. Sort by header; scroll is virtualized. Any of these is optional per table.",
        canvas: "surface",
        render: () => <DealsTableDemo />,
      },
    ],
  },
  {
    slug: "stat-card",
    name: "Stat Card",
    group: "Data display",
    isNew: true,
    summary:
      "The one hero number: label, value, an optional delta (arrow + colour) and an optional sparkline. Compose a KPI row with StatGroup — divided sections of one card, never a field of boxes.",
    usage: `import { StatCard, StatGroup } from "@curvgroup/design-system";

<StatGroup>
  <StatCard label="July GP" value="$337K"
    delta={{ value: "12.4%", direction: "up" }} caption="vs last mo"
    sparkline={series} sparklineVariant="area" />
  {/* rising refund rate: up arrow, negative colour */}
  <StatCard label="Refund rate" value="1.9%"
    delta={{ value: "0.6pt", direction: "up", sentiment: "negative" }} />
</StatGroup>`,
    demos: [
      {
        title: "KPI row + delta styles",
        description:
          "A KPI row as divided sections of one card (sparkline optional). Below: the two delta styles — inline text vs tinted chip — on identical data, to compare. Direction (arrow) and sentiment (colour) are separate, so a rising refund rate is an up-arrow in red.",
        canvas: "surface",
        render: () => <StatCardDemo />,
      },
    ],
  },
  {
    slug: "date-range-picker",
    name: "Date Range",
    group: "Forms & input",
    isNew: true,
    summary:
      "The reporting date control: a pill showing the preset + resolved range, opening a two-pane popover — presets on the left (each showing what it resolves to right now, e.g. “Quarter to date · Q3”), a range calendar on the right (react-day-picker, skinned to our tokens; Monday-first).",
    usage: `import { DateRangePicker } from "@curvgroup/design-system";

const [range, setRange] = React.useState();

<DateRangePicker value={range} onValueChange={setRange} />
// range = { range: { from, to }, presetKey?: "mtd" | ... }`,
    demos: [
      {
        title: "Presets + range calendar",
        description: "Presets resolve against today and show their concrete value; the calendar handles custom ranges (click start → click end). Q1–Q4 quick-picks for finance. Selecting either commits and closes.",
        canvas: "plain",
        render: () => <DateRangePickerDemo />,
      },
    ],
  },
  {
    slug: "kanban",
    name: "Kanban Board",
    group: "Data display",
    isNew: true,
    summary:
      "A horizontally-scrolling board of fixed-width columns (the pipeline pattern). KanbanBoard owns the scroll + edge-fades; KanbanColumn is a from-muted gradient with a dot/label/count/value header and a dashed empty state; KanbanCard is the clickable shell — card content stays app-composed.",
    usage: `import { KanbanBoard, KanbanColumn, KanbanCard } from "@curvgroup/design-system";

<KanbanBoard bleedClassName="-mx-6" padClassName="px-6 pb-1" fade="from-background">
  <KanbanColumn label="Quote Sent" count={10} value="$16k" dotClassName="border-chart-3">
    <KanbanCard href="/deals/1">…your card content…</KanbanCard>
  </KanbanColumn>
  <KanbanColumn label="Won" count={0} dotClassName="bg-verdict-green" dotFilled emptyLabel="No deals" />
</KanbanBoard>`,
    demos: [
      {
        title: "Deal pipeline",
        description: "Six fixed-width columns in one horizontal scroll track (drag the board sideways). Ring dot per stage, filled green for Won; cards link out; the rotting-deal age turns red. Edge-fades appear only when there's more to scroll.",
        canvas: "plain",
        render: () => <KanbanDemo />,
      },
    ],
  },
  {
    slug: "line-chart",
    name: "Line Chart",
    group: "Data display",
    isNew: true,
    summary:
      "The reporting trend primitive: one accent series + optional muted/dashed comparison, nice-number y-axis cap (the Shopify rule), hover crosshair + per-series dots + a shared tooltip. Stays a dumb primitive — wrap it in ChartCard and compose the metric dropdown / compare / period from Select · SegmentedControl · DateRangePicker.",
    usage: `import { LineChart } from "@curvgroup/design-system";

<LineChart
  height={240} area formatY={(n) => \`$\${Math.round(n/1000)}K\`}
  deltaTone="up-positive" // "down-positive" for cost metrics (CPL, CPA)
  xLabels={["Jan","Feb","Mar","Apr","May","Jun","Jul"]}
  series={[
    { data: gp2026, label: "2026", className: "text-chart" },
    // one flag → dashed chart-prev line + "% from comparison" hover delta
    { data: gp2025, label: "Prior year", comparison: true },
  ]}
/>`,
    demos: [
      {
        title: "Metric explorer (ChartCard + LineChart)",
        description: "The composed pattern: ChartCard owns the title, hero value, delta, a metric Select, and the legend; LineChart draws. The prior-year series is flagged comparison:true — it styles itself (dashed, chart-prev) and the hover gains a signed \"% from comparison\" delta. Switch the metric to re-plot. Solid = current, dashed = prior year.",
        canvas: "plain",
        render: () => <LineChartDemo />,
      },
      {
        title: "Y-axis baseline: zero vs auto",
        description: "Line charts don't have to start at zero. For a metric that lives at $2M–$3M and never nears zero, a zero baseline squashes the movement into the top third (left). yBaseline=\"auto\" fits the axis just below the data min so the trend is legible (right). Default stays \"zero\" — the honest baseline; opt into auto deliberately. Never on a BarChart (a truncated bar lies).",
        canvas: "plain",
        render: () => <LineBaselineDemo />,
      },
    ],
  },
  {
    slug: "report-table",
    name: "Report Table",
    group: "Data display",
    isNew: true,
    summary:
      "The P&L / financial-matrix grid: metric rows grouped into collapsible sections with emphasized subtotals, a sticky label column + header, and a Summary↔Monthly toggle. Monthly shows every period (value only); Summary shows compact columns you define (Trend · Amount · vs forecast · vs last year). Tint is opt-in per column, for totals past a threshold — never a washed grid.",
    usage: `import { ReportTable } from "@curvgroup/design-system";

<ReportTable
  metricLabel="P&L · year to date"
  periods={[{ key: "jan", label: "Jan" }, /* … */ { key: "jun", label: "Jun", partial: true }]}
  sections={[{ key: "rev", label: "Revenue", collapsible: true, rows: [
    { key: "rev", label: "Revenue", subtotal: true, values: {...}, total: 22357741 },
  ] }]}
  summaryColumns={[
    { key: "amount", label: "Amount", render: (r) => fmt(r.total) },
    { key: "fc", label: "vs forecast", render: (r) => pct(r.data.fc),
      tint: (r) => r.subtotal ? (r.data.fc < 0 ? "negative" : "positive") : null },
  ]}
/>`,
    demos: [
      {
        title: "P&L — Summary / Monthly",
        description: "Toggle Summary (Trend · Amount · vs forecast · vs last year) vs Monthly (every period, value only — the current period italic). Collapse a section. Subtotals (Gross profit, Net income) carry weight; tint appears only on subtotal comparison cells past the threshold.",
        canvas: "plain",
        render: () => <ReportTableDemo />,
      },
    ],
  },
  {
    slug: "bar-chart",
    name: "Bar Chart",
    group: "Data display",
    isNew: true,
    summary:
      "Stacked (default) or grouped vertical bars in the same reporting language as LineChart — nice-number y-axis cap, hover column highlight + shared tooltip with per-series values and a total. Colour each series with a token.",
    usage: `import { BarChart, ChartCard } from "@curvgroup/design-system";

<ChartCard title="Campaign revenue" value="$24.5K" delta={{ value: "8.2%", direction: "up" }}>
  <BarChart
    height={220} formatY={(n) => \`$\${(n/1000).toFixed(0)}K\`}
    xLabels={weeks}
    series={[
      { data: statik, label: "Statik", className: "text-chart" },
      { data: keysmart, label: "KeySmart", className: "text-verdict-red" },
    ]}
  />
</ChartCard>`,
    demos: [
      {
        title: "Stacked revenue by brand",
        description: "Series stack into one bar per period; hover for the column highlight + a tooltip with each brand's value and the total. Same axis cap and tooltip as LineChart.",
        canvas: "plain",
        render: () => <BarChartDemo />,
      },
    ],
  },
  {
    slug: "bar-breakdown",
    name: "Bar Breakdown",
    group: "Data display",
    isNew: true,
    summary:
      "A ranked distribution (refunds by cause, spend by vendor). Proportion is a subtle fill BEHIND each row (the Vercel/Plausible top-list pattern) so length, label, and value read as one line. One neutral fill by default — override a single row's fill to flag a real exception (colour marks meaning, not category).",
    usage: `import { BarBreakdown } from "@curvgroup/design-system";

<BarBreakdown
  items={[
    { label: "Shipping & customs", value: 45, meta: "$4K" },
    { label: "Quality issues", value: 19, meta: "$3K" },
  ]}
  formatValue={(n) => String(n)}
/>`,
    demos: [
      {
        title: "Refunds by root cause",
        description: "Proportion reads as a fill behind each row — ranking is obvious at a glance and each label sits with its value. One neutral fill; \"Quality issues\" flagged with a faint red. Value + share-of-total % + optional $ meta.",
        canvas: "plain",
        render: () => <BarBreakdownDemo />,
      },
    ],
  },
  {
    slug: "summary-strip",
    name: "Summary Strip",
    group: "Data display",
    isNew: true,
    summary:
      "A full-width breakdown that sits ABOVE a table (the Dub/Plausible pattern): the total anchored left, the breakdown as a horizontal stat row filling the width, and a thin proportional bar. Never a small card marooned in a corner. Colour marks meaning; a neutral \"none/unclassified\" residual goes last.",
    usage: `import { SummaryStrip } from "@curvgroup/design-system";

<SummaryStrip
  label="Catalog value by status"
  total="$21.4M"
  caption="2,369 SKUs"
  items={[
    { label: "Keep", value: "$1.9M", share: 9, colorClassName: "bg-chart-2" },
    { label: "Cut", value: "$836K", share: 4, colorClassName: "bg-verdict-red" },
    { label: "No status", value: "$17.6M", share: 82 }, // neutral, last
  ]}
/>`,
    demos: [
      {
        title: "Catalog value by status",
        description:
          "Full-width above the table: total anchored left, statuses as a horizontal stat row, a proportional bar showing where value concentrates. Colour first, neutral \"No status\" residual last. An action on the gap (\"triage 1,232 unclassified\") is a separate Banner.",
        canvas: "plain",
        render: () => <SummaryStripDemo />,
      },
    ],
  },
  {
    slug: "page-header",
    name: "Page Header",
    group: "Layout and structure",
    isNew: true,
    summary:
      "The top of every OS page: eyebrow, title with an optional count + status badge, description, and right-aligned controls. Like ChartCard, it's a layout shell — `actions` hosts REAL composed controls (Select · DateRangePicker · Button), never hardcoded ones. Stacks on narrow screens.",
    usage: `import { PageHeader, Badge, Button, Select, DateRangePicker } from "@curvgroup/design-system";

<PageHeader
  eyebrow="Finance / Refunds"
  title="Refund dashboard"
  badge={<Badge variant="green">Live</Badge>}
  description="Activity counted by refund date."
  actions={
    <>
      <Select items={brands} value={brand} onValueChange={setBrand} className="h-9 w-[150px]" />
      <DateRangePicker value={range} onValueChange={setRange} align="end" />
      <Button>Request refund</Button>
    </>
  }
/>`,
    demos: [
      {
        title: "Page header",
        description: "Eyebrow + title + badge + description on the left; the actions slot holds the REAL brand Select, DateRangePicker, and the primary action — open them, they work. Everything but the title is optional. Best practice: scope controls first, one filled primary action rightmost.",
        canvas: "plain",
        render: () => <PageHeaderDemo />,
      },
    ],
  },
  {
    slug: "banner",
    name: "Banner",
    group: "Overlays & feedback",
    isNew: true,
    summary:
      "A rare, persistent page-level status callout — a disconnected source, sample data, a blocking action. A whisper tint of the hue (~7%) + a matching hairline border + a coloured icon carry the meaning (the Geist/Polaris pattern) — not a loud wash, not a left stripe. Max one per view.",
    usage: `import { Banner, Button } from "@curvgroup/design-system";

<Banner variant="warning" title="Needs Ops pricing"
  actions={<Button size="sm" variant="outline">Send to Ops</Button>}>
  Review the brief, then send it to Ops.
</Banner>`,
    demos: [
      {
        title: "All variants",
        description: "info / warning / success / danger. A whisper tint of the hue (~7%) + a matching hairline border + a coloured icon — the suffused-not-washed pattern the good tools use (Geist, Polaris, Chatbase). Info stays neutral. Optional actions + dismiss.",
        canvas: "plain",
        render: () => <BannerDemo />,
      },
    ],
  },
  {
    slug: "empty-state",
    name: "Empty State",
    group: "Overlays & feedback",
    isNew: true,
    summary:
      "The centered “nothing here yet / not connected” block for empty regions, unconnected sources, and zero-result panels. `md` for a full region, `sm` for inline card tiles.",
    usage: `import { EmptyState, Button } from "@curvgroup/design-system";

<EmptyState
  icon={<BoxIcon />}
  title="No refunds in this period"
  description="Try widening the date range or clearing filters."
  actions={<Button size="sm" variant="outline">Clear filters</Button>}
/>`,
    demos: [
      {
        title: "Region + tile",
        description: "Left: md, filling a content region. Right: sm, sized for a small “not connected” card tile. Icon sits in a soft recessed circle.",
        canvas: "plain",
        render: () => <EmptyStateDemo />,
      },
    ],
  },
  {
    slug: "command-palette",
    name: "Command Palette",
    group: "Overlays & feedback",
    isNew: true,
    summary:
      "The global ⌘K search/jump modal every OS mounts once. A base-ui Dialog (focus trap, Escape, focus restore) wrapping a filtered, keyboard-navigable list — grouped, with icons and hints.",
    usage: `import { CommandPalette } from "@curvgroup/design-system";

const [open, setOpen] = useState(false);

<CommandPalette
  open={open} onOpenChange={setOpen}
  items={[
    { id: "deals", label: "Deals", group: "Pipeline", hint: "Pipeline",
      onSelect: () => router.push("/deals") },
  ]}
/> // registers ⌘K itself`,
    demos: [
      {
        title: "⌘K search",
        description: "Press ⌘K / Ctrl-K (or the button) to open. Type to filter across label + keywords; ↑↓ to move, Enter to select, Esc to close. Results group by section with a right-aligned hint.",
        canvas: "center",
        render: () => <CommandPaletteDemo />,
      },
    ],
  },
  {
    slug: "drawer",
    name: "Drawer",
    group: "Overlays & feedback",
    isNew: true,
    summary:
      "A side sheet that slides in from the edge — record detail, filters, a peek without leaving the list. Built on base-ui Dialog: focus trapped, closes on Escape/outside click, restores focus.",
    usage: `import { Drawer, DrawerClose, Button } from "@curvgroup/design-system";

<Drawer
  trigger={<Button variant="outline">Open deal</Button>}
  title="Adventure Works" description="SO-1042 · Confirmed"
  footer={<DrawerClose render={<Button>Close</Button>} />}
>
  {/* detail content */}
</Drawer>`,
    demos: [
      {
        title: "Right-side sheet",
        description: "Slides in from the right (set side=\"left\" to anchor left). Header with title/description + close, scrollable body, pinned footer for actions.",
        canvas: "center",
        render: () => <DrawerDemo />,
      },
    ],
  },
  {
    slug: "popover",
    name: "Popover",
    group: "Overlays & feedback",
    isNew: true,
    summary:
      "A click-triggered floating panel for richer content than a tooltip and freer than a menu — a small form, a filter, a detail peek. Same surface as our menus: origin-aware, rounded-lg, soft shadow.",
    usage: `import { Popover, PopoverClose, Button } from "@curvgroup/design-system";

<Popover trigger={<Button variant="outline">Edit column</Button>}>
  {/* form */}
  <PopoverClose render={<Button>Save</Button>} />
</Popover>`,
    demos: [
      {
        title: "Edit-in-place",
        description: "A tiny form in a popover, anchored to its trigger and origin-aware. PopoverClose dismisses it from an action inside.",
        canvas: "center",
        render: () => <PopoverDemo />,
      },
    ],
  },
  {
    slug: "button",
    name: "Button",
    group: "Forms & input",
    isNew: true,
    summary: "The one button — variants and sizes only, no bespoke buttons per app. Presses with a subtle scale; fixed h-9 height.",
    usage: `import { Button } from "@curvgroup/design-system";

<Button>Save</Button>
<Button variant="outline">Cancel</Button>
<Button variant="destructive">Delete</Button>`,
    demos: [
      {
        canvas: "center",
        render: () => (
          <div className="flex flex-col items-center gap-6">
            <div className="flex flex-col items-center gap-2.5">
              <span className="text-[11px] font-medium text-muted-foreground">Variants</span>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button>Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Delete</Button>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2.5">
              <span className="text-[11px] font-medium text-muted-foreground">Sizes</span>
              <div className="flex items-center gap-2">
                <Button size="sm">Small</Button>
                <Button>Default</Button>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2.5">
              <span className="text-[11px] font-medium text-muted-foreground">Loading — spinner, disabled, width preserved</span>
              <ButtonLoadingDemo />
            </div>
          </div>
        ),
      },
    ],
  },
  {
    slug: "text-field",
    name: "Text field",
    group: "Forms & input",
    isNew: true,
    summary: "Single- and multi-line text input, wrapped in a Field (label + hint / error). Fixed h-9.",
    usage: `import { Field, Input, Textarea } from "@curvgroup/design-system";

<Field label="Email" htmlFor="email" hint="Receipts only.">
  <Input id="email" type="email" placeholder="you@company.com" />
</Field>`,
    demos: [{ canvas: "center", render: () => <TextFieldDemo /> }],
  },
  {
    slug: "textarea",
    name: "Textarea",
    group: "Forms & input",
    isNew: true,
    summary: "Multi-line text input, styled to match Input.",
    usage: `import { Textarea } from "@curvgroup/design-system";

<Textarea placeholder="Add a note…" />`,
    demos: [
      {
        canvas: "center",
        render: () => (
          <div className="w-[300px]">
            <Field label="Notes" htmlFor="ta-1">
              <Textarea id="ta-1" placeholder="Add a note…" />
            </Field>
          </div>
        ),
      },
    ],
  },
  {
    slug: "select",
    name: "Select",
    group: "Forms & input",
    isNew: true,
    summary: "A styled dropdown (not the native OS picker) — h-9 trigger, menu matches our surfaces.",
    usage: `import { Select } from "@curvgroup/design-system";

<Select
  value={v}
  onValueChange={setV}
  items={[
    { value: "ct", label: "Contoso" },
    { value: "cu", label: "Customs" },
  ]}
/>`,
    demos: [{ canvas: "center", render: () => <SelectDemo /> }],
  },
  {
    slug: "multi-select",
    name: "Multi-select",
    group: "Forms & input",
    isNew: true,
    summary:
      "Pick several options (the Linear filter pattern, on base-ui combobox). Button trigger shows the selection + a count badge; the popover has a search box and a checkable list that stays open while you toggle. For one choice, use Select.",
    usage: `import { MultiSelect } from "@curvgroup/design-system";

<MultiSelect
  value={brands}
  onValueChange={setBrands}
  placeholder="All brands"
  items={[
    { value: "ct", label: "Contoso" },
    { value: "fb", label: "Fabrikam" },
  ]}
/>`,
    demos: [
      {
        title: "Brand filter",
        description: "Type to search, click to toggle (the popover stays open). The trigger shows the first labels + a count. Checkbox fills on selection.",
        canvas: "center",
        render: () => <MultiSelectDemo />,
      },
    ],
  },
  {
    slug: "checkbox",
    name: "Checkbox",
    group: "Forms & input",
    isNew: true,
    summary: "Controlled checkbox (checked / onCheckedChange).",
    usage: `import { Checkbox } from "@curvgroup/design-system";

<Checkbox checked={on} onCheckedChange={setOn} aria-label="Subscribe" />`,
    demos: [{ canvas: "center", render: () => <CheckboxDemo /> }],
  },
  {
    slug: "radio",
    name: "Radio",
    group: "Forms & input",
    isNew: true,
    summary: "A single choice from a set — RadioGroup + Radio.",
    usage: `import { RadioGroup, Radio } from "@curvgroup/design-system";

<RadioGroup value={v} onValueChange={setV}>
  <Radio value="mtd">Month to date</Radio>
  <Radio value="qtd">Quarter to date</Radio>
</RadioGroup>`,
    demos: [{ canvas: "center", render: () => <RadioDemo /> }],
  },
  {
    slug: "switch",
    name: "Switch",
    group: "Forms & input",
    isNew: true,
    summary: "An on/off toggle — controlled, for instant settings.",
    usage: `import { Switch } from "@curvgroup/design-system";

<Switch checked={on} onCheckedChange={setOn} aria-label="Notifications" />`,
    demos: [{ canvas: "center", render: () => <SwitchDemo /> }],
  },
  {
    slug: "segmented-control",
    name: "Segmented control",
    group: "Forms & input",
    isNew: true,
    summary:
      "The pill toggle for ≤3 mutually-exclusive options that switch a mode of the current view (money-state, Summary/Monthly). Not navigation — that's Tabs; not ≥4 options — that's Select.",
    usage: `import { SegmentedControl } from "@curvgroup/design-system";

<SegmentedControl
  aria-label="Money state"
  value={v}
  onValueChange={setV}
  items={[
    { value: "all", label: "All" },
    { value: "confirmed", label: "Confirmed" },
    { value: "collect", label: "To collect" },
  ]}
/>`,
    demos: [{ canvas: "center", render: () => <SegmentedControlDemo /> }],
  },
  {
    slug: "avatar",
    name: "Avatar",
    group: "Data display",
    isNew: true,
    summary: "A person, rendered identically everywhere — initials on a colour derived from the name, or an image. Powers table cells, menus, comments.",
    usage: `import { Avatar, AvatarGroup } from "@curvgroup/design-system";

<Avatar name="Alex Morgan" />
<AvatarGroup>
  <Avatar name="Alex Morgan" />
  <Avatar name="Casey Kim" />
</AvatarGroup>`,
    demos: [
      {
        canvas: "center",
        render: () => (
          <div className="flex flex-col items-center gap-5">
            <div className="flex items-center gap-3">
              <Avatar name="Alex Morgan" size="sm" />
              <Avatar name="Jordan Lee" size="md" />
              <Avatar name="Sam Rivera" size="lg" />
            </div>
            <AvatarGroup>
              <Avatar name="Alex Morgan" />
              <Avatar name="Casey Kim" />
              <Avatar name="Jamie Cruz" />
              <Avatar name="Avery Stone" />
            </AvatarGroup>
          </div>
        ),
      },
    ],
  },
  {
    slug: "badge",
    name: "Badge",
    group: "Data display",
    isNew: true,
    summary: "The status / label pill — soft-tint verdict variants + neutral. One badge for statuses, tags, and counts.",
    usage: `import { Badge } from "@curvgroup/design-system";

<Badge variant="green">Confirmed</Badge>
<Badge>Neutral</Badge>`,
    demos: [
      {
        canvas: "center",
        render: () => (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Badge>Neutral</Badge>
            <Badge variant="green">Confirmed</Badge>
            <Badge variant="amber">Pending</Badge>
            <Badge variant="red">Overdue</Badge>
            <Badge variant="outline">Draft</Badge>
          </div>
        ),
      },
    ],
  },
  {
    slug: "card",
    name: "Card",
    group: "Surfaces",
    summary:
      "The canonical raised surface: 12px radius, card background, elevation via the shared hairline-shadow. The one card every OS uses.",
    usage: `import { Card } from "@curvgroup/design-system";

<Card className="p-5">{/* content */}</Card>`,
    demos: [
      {
        canvas: "center",
        render: () => (
          <Card className="w-72 p-5">
            <div className="text-[12px] font-medium text-muted-foreground">Collected GP</div>
            <div className="mt-1.5 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
              $327,449
            </div>
            <div className="mt-2 border-t border-border pt-2 text-[11.5px] text-muted-foreground">
              261 of 261 deals
            </div>
          </Card>
        ),
      },
    ],
  },
  {
    slug: "tabs",
    name: "Tabs",
    group: "Navigation",
    isNew: true,
    summary:
      "View-navigation tabs — switching between distinct views of a page (Overview / All deals). A full-width bar under the top bar, active view underlined. For filtering data in a view, use Segmented control instead.",
    usage: `import { Tabs } from "@curvgroup/design-system";

<Tabs
  aria-label="Views"
  value={view}
  onValueChange={setView}
  items={[
    { value: "overview", label: "Overview" },
    { value: "all", label: "All deals" },
  ]}
/>`,
    demos: [{ canvas: "fill", render: () => <TabsDemo /> }],
  },
  {
    slug: "tooltip",
    name: "Tooltip",
    group: "Overlays & feedback",
    isNew: true,
    summary:
      "A small inverted label anchored to its trigger. Wrap a region in TooltipProvider so scanning between icon buttons opens each instantly — no re-delay.",
    usage: `import { Tooltip, TooltipProvider } from "@curvgroup/design-system";

<TooltipProvider>
  <Tooltip content="Delete">
    <button aria-label="Delete">…</button>
  </Tooltip>
</TooltipProvider>`,
    demos: [{ canvas: "center", render: () => <TooltipDemo /> }],
  },
  {
    slug: "menu",
    name: "Dropdown menu",
    group: "Overlays & feedback",
    isNew: true,
    summary:
      "A trigger + a menu of actions. Origin-aware, keyboard-navigable, matches the Select surface. Compose with MenuItem, MenuSeparator, MenuLabel.",
    usage: `import { Menu, MenuItem, MenuSeparator } from "@curvgroup/design-system";

<Menu
  trigger={
    <Button variant="outline" className="data-[popup-open]:bg-accent">
      Actions <ChevronDown size={14} className="text-muted-foreground" />
    </Button>
  }
>
  <MenuItem onClick={edit}>Edit</MenuItem>
  <MenuSeparator />
  <MenuItem destructive onClick={remove}>Delete</MenuItem>
</Menu>`,
    demos: [{ canvas: "center", render: () => <MenuDemo /> }],
  },
  {
    slug: "dialog",
    name: "Dialog",
    group: "Overlays & feedback",
    isNew: true,
    summary:
      "A centered modal over a themed scrim — focus trapped, restored to the trigger on close. The home for destructive confirms.",
    usage: `import { Dialog, DialogClose, Button } from "@curvgroup/design-system";

<Dialog
  trigger={<Button variant="destructive">Delete</Button>}
  title="Delete deal?"
  description="This can't be undone."
  footer={<><DialogClose>Cancel</DialogClose><Button variant="destructive" onClick={remove}>Delete</Button></>}
/>`,
    demos: [{ canvas: "center", render: () => <DialogDemo /> }],
  },
  {
    slug: "morph-stack",
    name: "Morph Stack",
    group: "Overlays & feedback",
    isNew: true,
    summary:
      "A one-line summary over a stack of faces that opens in place into the list it summarises, with actions on each row. For approvals waiting on you, a burst of same-type notifications, access requests.",
    usage: `import { MorphStack, MorphStackButton } from "@curvgroup/design-system/morph";
// globals.css: @import "@curvgroup/design-system/morph.css";

<MorphStack
  tone="island"
  items={rows.map((r) => ({ id: r.id, label: r.name, meta: r.meta, aside: r.age, asideTone: r.days >= 7 ? "hot" : "muted",
    actions: <MorphStackButton variant="primary" onClick={() => approve(r)}>Approve</MorphStackButton> }))}
  summary={<><strong>{rows.length} waiting</strong><span className="morph-hot"> · {oldest}d</span></>}
  title="Approvals"
  clearedLabel="All clear"
/>`,
    demos: [
      { title: "Island in the top bar", description: "Approve removes the row; Decline asks for a reason in the row.", canvas: "center", render: () => <MorphApprovalsDemo /> },
      { title: "A burst in the notifications list", description: "Opens in flow and pushes the list down. Opening a row marks it read.", canvas: "center", render: () => <MorphGroupDemo /> },
      { title: "Floating notice", canvas: "center", render: () => <MorphAccessDemo /> },
    ],
  },
  {
    slug: "confirm-dialog",
    name: "Confirm Dialog",
    group: "Overlays & feedback",
    isNew: true,
    summary:
      "The sanctioned gate for destructive actions — a delete never fires from a bare one-click button (accessibility rule). Cancel is focused by default; the confirm button spins while an async onConfirm runs, then closes.",
    usage: `import { ConfirmDialog, Button } from "@curvgroup/design-system";

<ConfirmDialog
  trigger={<Button variant="destructive">Delete deal</Button>}
  title="Delete deal SO-1042?"
  description="This can't be undone."
  confirmLabel="Delete"
  onConfirm={() => api.deleteDeal(id)}
/>`,
    demos: [
      {
        title: "Destructive confirm",
        description: "Cancel is focused (the safe default). Confirm runs an async action — the button shows a spinner (preserving its width), then the dialog closes.",
        canvas: "center",
        render: () => <ConfirmDialogDemo />,
      },
    ],
  },
  {
    slug: "kbd",
    name: "Kbd",
    group: "Overlays & feedback",
    isNew: true,
    summary:
      "A keyboard-key chip (⌘K, ↵, Esc) — one treatment for shortcut hints in the command palette, menu accelerators, and tooltips.",
    usage: `import { Kbd } from "@curvgroup/design-system";

Search <Kbd>⌘</Kbd><Kbd>K</Kbd>`,
    demos: [{ title: "Shortcut hints", canvas: "center", render: () => <KbdDemo /> }],
  },
  {
    slug: "skeleton",
    name: "Skeleton",
    group: "Data display",
    isNew: true,
    summary:
      "A pulsing placeholder for loading content — recessed bg-muted shapes that hold the layout's geometry while data arrives. Prefer over spinners for cards, tables, charts. Also powers StatCard / ChartCard / DataTable `loading`.",
    usage: `import { Skeleton } from "@curvgroup/design-system";

<Skeleton width={120} height={12} />
<Skeleton circle width={40} height={40} />`,
    demos: [
      { title: "Placeholder block", canvas: "center", render: () => <SkeletonDemo /> },
      {
        title: "Loading states (StatCard)",
        description: "Toggle to see the skeleton hold each card's shape — no layout shift when the numbers arrive.",
        canvas: "plain",
        render: () => <LoadingStatesDemo />,
      },
    ],
  },
  {
    slug: "toast",
    name: "Toast",
    group: "Overlays & feedback",
    isNew: true,
    summary:
      "Transient feedback that stacks bottom-right and auto-dismisses. Mount ToastProvider once, then call toast.success / toast.error from anywhere.",
    usage: `import { ToastProvider, toast } from "@curvgroup/design-system";

// once, at the app root:
<ToastProvider>{app}</ToastProvider>

// anywhere:
toast.success("Deal confirmed", { description: "SO-1042 moved to Confirmed." });`,
    demos: [{ canvas: "center", render: () => <ToastDemo /> }],
  },
];

export const GROUP_ORDER = [
  "Layout and structure",
  "Navigation",
  "Forms & input",
  "Data display",
  "Surfaces",
  "Overlays & feedback",
] as const;

/* ---------- overlays & feedback demos ---------- */

// A custom trigger must forward ref + props so base-ui can wire the tooltip
// onto the real <button> (the same contract as Radix `asChild`).
const IconTriggerBtn = React.forwardRef<
  HTMLButtonElement,
  React.ComponentPropsWithoutRef<"button">
>(function IconTriggerBtn({ children, className, ...props }, ref) {
  return (
    <button
      ref={ref}
      {...props}
      className={cn(
        "grid size-9 place-items-center rounded-md border border-border bg-card text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
        className,
      )}
    >
      {children}
    </button>
  );
});

function TooltipDemo() {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-1.5">
        <Tooltip content="Edit">
          <IconTriggerBtn aria-label="Edit"><Pencil size={16} /></IconTriggerBtn>
        </Tooltip>
        <Tooltip content="Duplicate">
          <IconTriggerBtn aria-label="Duplicate"><Copy size={16} /></IconTriggerBtn>
        </Tooltip>
        <Tooltip content="Notifications">
          <IconTriggerBtn aria-label="Notifications"><Bell size={16} /></IconTriggerBtn>
        </Tooltip>
        <Tooltip content="Delete">
          <IconTriggerBtn aria-label="Delete"><Trash2 size={16} /></IconTriggerBtn>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}

function MenuDemo() {
  return (
    <Menu
      trigger={
        // The canonical dropdown trigger (design-system.md → Dropdown menus):
        // toolbar chrome + trailing muted chevron, accent while open.
        <Button variant="outline" className="data-[popup-open]:bg-accent">
          Actions
          <ChevronDown size={14} className="text-muted-foreground" />
        </Button>
      }
    >
      <MenuLabel>Deal SO-1042</MenuLabel>
      <MenuItem icon={<Pencil size={15} />} shortcut="⌘E">Edit</MenuItem>
      <MenuItem icon={<Copy size={15} />}>Duplicate</MenuItem>
      <MenuSeparator />
      <MenuItem destructive icon={<Trash2 size={15} />}>Delete</MenuItem>
    </Menu>
  );
}

function DialogDemo() {
  return (
    <Dialog
      trigger={<Button variant="destructive">Delete deal</Button>}
      title="Delete this deal?"
      description="SO-1042 for Adventure Works will be permanently removed. This can't be undone."
      footer={
        <>
          <DialogClose>Cancel</DialogClose>
          <DialogClose render={<Button variant="destructive">Delete</Button>} />
        </>
      }
    />
  );
}

function ToastDemo() {
  return (
    <ToastProvider>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          variant="outline"
          onClick={() =>
            toast.success("Deal confirmed", { description: "SO-1042 moved to Confirmed." })
          }
        >
          Success
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast.error("Couldn't save", { description: "Check your connection and retry." })
          }
        >
          Error
        </Button>
        <Button variant="outline" onClick={() => toast.message("Draft saved")}>
          Message
        </Button>
        <Button
          variant="outline"
          onClick={() =>
            toast.message("Deal deleted", {
              description: "SO-1042 removed.",
              action: { label: "Undo", onClick: () => toast.success("Restored") },
            })
          }
        >
          Delete + Undo
        </Button>
      </div>
    </ToastProvider>
  );
}

function KbdDemo() {
  return (
    <div className="flex flex-wrap items-center gap-5 text-[13px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">Search <Kbd>⌘</Kbd><Kbd>K</Kbd></span>
      <span className="inline-flex items-center gap-1.5">Submit <Kbd>↵</Kbd></span>
      <span className="inline-flex items-center gap-1.5">Close <Kbd>Esc</Kbd></span>
      <span className="inline-flex items-center gap-1.5">Assign <Kbd>A</Kbd></span>
    </div>
  );
}

function SkeletonDemo() {
  return (
    <div className="w-full max-w-[360px] rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <Skeleton circle width={40} height={40} />
        <div className="flex-1 space-y-2">
          <Skeleton width="55%" height={12} />
          <Skeleton width="38%" height={12} />
        </div>
      </div>
      <Skeleton height={12} className="mt-4 w-full" />
      <Skeleton height={12} className="mt-2 w-[82%]" />
    </div>
  );
}

function ConfirmDialogDemo() {
  return (
    <ConfirmDialog
      trigger={<Button variant="destructive">Delete deal</Button>}
      title="Delete deal SO-1042?"
      description="This removes the deal and its line items. This can't be undone."
      confirmLabel="Delete"
      onConfirm={() => new Promise((r) => window.setTimeout(r, 900))}
    />
  );
}

function ButtonLoadingDemo() {
  const [loading, setLoading] = React.useState(false);
  const run = () => {
    setLoading(true);
    window.setTimeout(() => setLoading(false), 1500);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button loading={loading} onClick={run}>Save changes</Button>
      <Button variant="outline" loading={loading} onClick={run}>Export</Button>
      <Button variant="destructive" loading={loading} onClick={run}>Delete</Button>
    </div>
  );
}

function LoadingStatesDemo() {
  const [loading, setLoading] = React.useState(true);
  return (
    <div className="w-full space-y-3">
      <Button variant="outline" size="sm" onClick={() => setLoading((v) => !v)}>
        {loading ? "Show data" : "Show loading"}
      </Button>
      <StatGroup>
        <StatCard loading={loading} label="July GP" value="$337K" delta={{ value: "12.4%", direction: "up" }} caption="vs last mo" sparkline={SPARK_UP} />
        <StatCard loading={loading} label="Leads" value="1,023" delta={{ value: "8.1%", direction: "up" }} caption="vs last mo" sparkline={SPARK_UP} />
        <StatCard loading={loading} label="Closed" value="227" delta={{ value: "5.2%", direction: "up" }} caption="vs last mo" sparkline={SPARK_UP} />
      </StatGroup>
    </div>
  );
}

function SegmentedControlDemo() {
  const [v, setV] = React.useState("all");
  return (
    <SegmentedControl
      aria-label="Money state"
      value={v}
      onValueChange={setV}
      items={[
        { value: "all", label: "All" },
        { value: "confirmed", label: "Confirmed" },
        { value: "collect", label: "To collect" },
      ]}
    />
  );
}

function TabsDemo() {
  const [view, setView] = React.useState("overview");
  return (
    <div className="w-[440px]">
      <Tabs
        aria-label="Deal views"
        value={view}
        onValueChange={setView}
        items={[
          { value: "overview", label: "Overview" },
          { value: "all", label: "All deals" },
          { value: "collect", label: "To collect" },
        ]}
      />
      <div className="px-3 py-5 text-[13px] text-muted-foreground">
        {view === "overview" && "The overview view."}
        {view === "all" && "Every deal, unfiltered."}
        {view === "collect" && "Deals with an outstanding balance."}
      </div>
    </div>
  );
}

/* ---------- overview card thumbnails (small, static, safe) ---------- */

function Bar({ w, className }: { w: string; className?: string }) {
  return <div className={cn("h-2 rounded-full bg-foreground/15", className)} style={{ width: w }} />;
}

export const PREVIEWS: Record<string, () => React.ReactNode> = {
  "app-frame": () => (
    <div className="flex h-24 w-40 flex-col overflow-hidden rounded-md bg-topbar shadow-card">
      <div className="h-3 w-full" />
      <div className="flex flex-1">
        <div className="w-7 rounded-tl-md bg-sidebar" />
        <div className="flex-1 rounded-tr-md bg-background" />
      </div>
    </div>
  ),
  "page-container": () => (
    <div className="flex w-full max-w-[220px] flex-col items-center gap-2">
      <div className="h-12 w-2/3 rounded-md border border-dashed border-border bg-card" />
    </div>
  ),
  "top-bar": () => (
    <div className="flex h-8 w-full max-w-[230px] items-center gap-2 rounded-md bg-topbar px-2">
      <span className="size-2 rounded-full bg-white/40" />
      <div className="h-3.5 flex-1 rounded bg-white/10" />
      <span className="size-2 rounded-full bg-white/30" />
    </div>
  ),
  sidebar: () => (
    <div className="flex h-24 w-28 flex-col gap-1.5 rounded-md bg-sidebar p-2 shadow-card">
      <div className="rounded bg-sidebar-active px-1.5 py-1"><Bar w="70%" className="bg-foreground/40" /></div>
      <div className="px-1.5 py-1"><Bar w="60%" /></div>
      <div className="px-1.5 py-1"><Bar w="75%" /></div>
      <div className="px-1.5 py-1"><Bar w="50%" /></div>
    </div>
  ),
  button: () => <Button size="sm">Button</Button>,
  "text-field": () => (
    <div className="w-44">
      <Input placeholder="Text field" readOnly />
    </div>
  ),
  textarea: () => (
    <div className="w-44">
      <Textarea rows={2} className="min-h-0 h-14" placeholder="Notes…" readOnly />
    </div>
  ),
  select: () => (
    <div className="w-44">
      <Select items={[{ value: "ct", label: "Contoso" }]} defaultValue="ct" />
    </div>
  ),
  checkbox: () => (
    <div className="flex flex-col gap-2 text-[13px] text-foreground">
      <span className="flex items-center gap-2"><Checkbox checked /> Option A</span>
      <span className="flex items-center gap-2"><Checkbox /> Option B</span>
    </div>
  ),
  radio: () => (
    <RadioGroup value="a">
      <Radio value="a">Option A</Radio>
      <Radio value="b">Option B</Radio>
    </RadioGroup>
  ),
  switch: () => (
    <span className="flex items-center gap-2 text-[13px] text-foreground">
      <Switch checked /> On
    </span>
  ),
  "data-table": () => (
    <div className="w-full max-w-[240px] overflow-hidden rounded-md border border-border bg-card shadow-card">
      <div className="flex gap-3 border-b border-border bg-muted px-2.5 py-1.5">
        <Bar w="34%" className="bg-foreground/25" />
        <Bar w="22%" className="bg-foreground/25" />
        <Bar w="18%" className="bg-foreground/25" />
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex items-center gap-3 border-b border-border px-2.5 py-1.5 last:border-b-0">
          <Bar w="34%" />
          <Bar w="22%" />
          <Bar w="18%" />
        </div>
      ))}
    </div>
  ),
  avatar: () => (
    <AvatarGroup>
      <Avatar name="Alex Morgan" />
      <Avatar name="Casey Kim" />
      <Avatar name="Jamie Cruz" />
    </AvatarGroup>
  ),
  badge: () => (
    <div className="flex gap-2">
      <Badge variant="green">Confirmed</Badge>
      <Badge>Neutral</Badge>
    </div>
  ),
  card: () => (
    <Card className="w-40 p-3">
      <div className="text-[11px] text-muted-foreground">Collected GP</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">$327k</div>
    </Card>
  ),
  tooltip: () => (
    <div className="flex flex-col items-center gap-1.5">
      <div className="rounded-md bg-foreground px-2 py-1 text-[11px] font-medium text-background shadow-card">
        Edit
      </div>
      <div className="grid size-8 place-items-center rounded-md border border-border bg-card text-muted-foreground">
        <Pencil size={15} />
      </div>
    </div>
  ),
  menu: () => (
    <div className="w-36 rounded-lg border border-border bg-popover p-1 shadow-card">
      <div className="rounded bg-accent px-2 py-1"><Bar w="55%" className="bg-foreground/40" /></div>
      <div className="px-2 py-1"><Bar w="70%" /></div>
      <div className="my-1 h-px bg-border" />
      <div className="px-2 py-1"><Bar w="45%" className="bg-destructive/50" /></div>
    </div>
  ),
  dialog: () => (
    <div className="grid h-24 w-40 place-items-center overflow-hidden rounded-md bg-overlay">
      <div className="w-28 rounded-lg border border-border bg-card p-2.5 shadow-card">
        <Bar w="55%" className="bg-foreground/35" />
        <div className="mt-1.5 space-y-1"><Bar w="90%" /><Bar w="70%" /></div>
        <div className="mt-2 flex justify-end gap-1">
          <div className="h-3 w-8 rounded bg-muted" />
          <div className="h-3 w-8 rounded bg-foreground/80" />
        </div>
      </div>
    </div>
  ),
  toast: () => (
    <div className="flex w-44 items-start gap-2 rounded-lg border border-border bg-popover p-2.5 shadow-card">
      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-verdict-green" />
      <div className="flex-1 space-y-1">
        <Bar w="55%" className="bg-foreground/35" />
        <Bar w="85%" />
      </div>
    </div>
  ),
  "segmented-control": () => (
    <div className="inline-flex items-center gap-0.5 rounded-[8px] border border-border bg-muted p-0.5 text-[12px] font-medium">
      <span className="rounded-[6px] bg-card px-3 py-1 text-foreground shadow-sm">All</span>
      <span className="px-3 py-1 text-muted-foreground">Confirmed</span>
      <span className="px-3 py-1 text-muted-foreground">To collect</span>
    </div>
  ),
  tabs: () => (
    <div className="w-48 border-b border-border bg-card text-[12px] font-medium">
      <div className="flex items-center">
        <span className="relative px-3 py-2 text-foreground after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:rounded-full after:bg-foreground">
          Overview
        </span>
        <span className="px-3 py-2 text-muted-foreground">All deals</span>
      </div>
    </div>
  ),
  banner: () => (
    <div className="flex w-52 items-center gap-2 rounded-md border border-verdict-amber/25 bg-verdict-amber/[0.07] px-3 py-2">
      <span className="size-1.5 shrink-0 rounded-full bg-verdict-amber" />
      <Bar w="65%" className="bg-verdict-amber/40" />
    </div>
  ),
  "bar-breakdown": () => (
    <div className="flex w-52 flex-col gap-1.5">
      {[["72%", "42%"], ["50%", "30%"], ["32%", "20%"]].map(([fill, lbl], i) => (
        <div key={i} className="relative flex items-center overflow-hidden rounded-md bg-muted/60 px-2 py-1.5">
          <div className="absolute inset-y-0 left-0 bg-foreground/[0.06]" style={{ width: fill }} />
          <Bar w={lbl} className="relative bg-foreground/25" />
        </div>
      ))}
    </div>
  ),
  "bar-chart": () => (
    <div className="flex h-24 w-44 items-end gap-1.5 rounded-md border border-border bg-card p-3 shadow-card">
      {[42, 66, 30, 82, 54, 70].map((h, i) => (
        <div key={i} className="flex-1 rounded-sm bg-foreground/20" style={{ height: `${h}%` }} />
      ))}
    </div>
  ),
  "command-palette": () => (
    <div className="w-52 overflow-hidden rounded-lg border border-border bg-popover shadow-card">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-muted-foreground">
        <Search size={13} />
        <Bar w="45%" />
      </div>
      <div className="flex flex-col gap-1 p-1.5">
        <div className="rounded bg-accent px-2 py-1"><Bar w="58%" className="bg-foreground/40" /></div>
        <div className="px-2 py-1"><Bar w="46%" /></div>
        <div className="px-2 py-1"><Bar w="52%" /></div>
      </div>
    </div>
  ),
  "confirm-dialog": () => (
    <div className="w-52 rounded-xl border border-border bg-card p-3 shadow-card">
      <Bar w="55%" className="bg-foreground/40" />
      <div className="mt-2 flex flex-col gap-1">
        <Bar w="88%" />
        <Bar w="68%" />
      </div>
      <div className="mt-3 flex justify-end gap-1.5">
        <div className="h-5 w-12 rounded-md border border-border" />
        <div className="h-5 w-14 rounded-md bg-destructive/80" />
      </div>
    </div>
  ),
  "date-range-picker": () => (
    <div className="w-40 rounded-lg border border-border bg-card p-2.5 shadow-card">
      <div className="mb-1.5 flex items-center justify-between">
        <Bar w="42%" className="bg-foreground/30" />
        <ChevronDown size={12} className="text-muted-foreground" />
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 21 }).map((_, i) => (
          <div key={i} className={cn("h-2.5 rounded-sm", i >= 8 && i <= 12 ? "bg-foreground/70" : "bg-muted")} />
        ))}
      </div>
    </div>
  ),
  drawer: () => (
    <div className="relative h-24 w-44 overflow-hidden rounded-md border border-border bg-muted/50">
      <div className="absolute inset-y-0 right-0 flex w-2/3 flex-col gap-1 border-l border-border bg-card p-2.5 shadow-card">
        <Bar w="55%" className="mb-1 bg-foreground/30" />
        <Bar w="80%" />
        <Bar w="66%" />
        <Bar w="72%" />
      </div>
    </div>
  ),
  "empty-state": () => (
    <div className="flex h-24 w-44 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-card">
      <div className="grid size-8 place-items-center rounded-full bg-muted text-muted-foreground"><Inbox size={16} /></div>
      <Bar w="38%" />
      <Bar w="26%" />
    </div>
  ),
  kanban: () => (
    <div className="flex w-52 gap-1.5">
      {[2, 1, 2].map((n, c) => (
        <div key={c} className="flex flex-1 flex-col gap-1 rounded-md bg-muted/60 p-1.5">
          <Bar w="60%" className="mb-0.5" />
          {Array.from({ length: n }).map((_, i) => (
            <div key={i} className="rounded bg-card px-1.5 py-1.5 shadow-card"><Bar w="70%" className="bg-foreground/25" /></div>
          ))}
        </div>
      ))}
    </div>
  ),
  kbd: () => (
    <div className="flex items-center gap-1.5">
      {["⌘", "K"].map((k) => (
        <span key={k} className="grid h-6 min-w-6 place-items-center rounded-md border border-border bg-card px-1.5 text-[12px] font-medium text-muted-foreground">{k}</span>
      ))}
    </div>
  ),
  "line-chart": () => (
    <div className="h-24 w-44 rounded-md border border-border bg-card p-2 shadow-card">
      <svg viewBox="0 0 100 50" className="h-full w-full text-foreground/40" preserveAspectRatio="none">
        <polyline points="0,40 20,28 40,33 60,16 80,22 100,7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  ),
  "multi-select": () => (
    <div className="flex h-8 w-44 items-center gap-1 rounded-md border border-border bg-card px-2 shadow-card">
      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">FK ×</span>
      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">CI ×</span>
      <ChevronDown size={13} className="ml-auto text-muted-foreground" />
    </div>
  ),
  "page-header": () => (
    <div className="w-52">
      <Bar w="22%" className="mb-1.5 bg-foreground/20" />
      <div className="flex items-center justify-between">
        <Bar w="45%" className="h-2.5 bg-foreground/50" />
        <div className="h-5 w-12 rounded-md bg-foreground/80" />
      </div>
      <Bar w="70%" className="mt-2" />
    </div>
  ),
  popover: () => (
    <div className="flex flex-col items-center">
      <div className="w-40 rounded-lg border border-border bg-popover p-2.5 shadow-card">
        <Bar w="55%" className="bg-foreground/30" />
        <div className="mt-1.5 flex flex-col gap-1">
          <Bar w="82%" />
          <Bar w="60%" />
        </div>
      </div>
      <div className="-mt-1 size-2 rotate-45 border-b border-r border-border bg-popover" />
    </div>
  ),
  "report-table": () => (
    <div className="w-52 overflow-hidden rounded-md border border-border bg-card shadow-card">
      {[0, 1, 2].map((r) => (
        <div key={r} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 border-b border-border px-2.5 py-1.5">
          <Bar w="70%" />
          <Bar w="16px" />
          <Bar w="16px" />
          <Bar w="16px" />
        </div>
      ))}
      <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 bg-muted/60 px-2.5 py-1.5">
        <Bar w="50%" className="bg-foreground/40" />
        <Bar w="16px" className="bg-foreground/40" />
        <Bar w="16px" className="bg-foreground/40" />
        <Bar w="16px" className="bg-foreground/40" />
      </div>
    </div>
  ),
  skeleton: () => (
    <div className="flex w-44 flex-col gap-2">
      <div className="h-2.5 w-3/4 rounded-full bg-muted motion-safe:animate-pulse" />
      <div className="h-2.5 w-full rounded-full bg-muted motion-safe:animate-pulse" />
      <div className="h-2.5 w-1/2 rounded-full bg-muted motion-safe:animate-pulse" />
    </div>
  ),
  "stat-card": () => (
    <div className="w-44 rounded-lg border border-border bg-card p-3 shadow-card">
      <Bar w="45%" />
      <div className="mt-1.5 flex items-center gap-1.5">
        <span className="text-[15px] font-semibold text-foreground">$337K</span>
        <span className="rounded bg-verdict-green-soft px-1 text-[9px] font-medium text-verdict-green">12%</span>
      </div>
      <svg viewBox="0 0 100 24" className="mt-1.5 h-5 w-full text-verdict-green" preserveAspectRatio="none">
        <polyline points="0,20 25,13 50,16 75,8 100,3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  ),
  "summary-strip": () => (
    <div className="w-52 rounded-md border border-border bg-card p-2.5 shadow-card">
      <div className="flex items-end justify-between gap-2">
        <span className="text-[14px] font-semibold text-foreground">$21.4M</span>
        <div className="flex gap-2.5">
          {["bg-verdict-green", "bg-chart-2", "bg-muted-foreground/40"].map((c) => (
            <div key={c}>
              <span className={cn("mb-1 block size-1.5 rounded-full", c)} />
              <Bar w="22px" className="bg-foreground/25" />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
        <div className="bg-verdict-green" style={{ width: "10%" }} />
        <div className="bg-chart-2" style={{ width: "14%" }} />
        <div className="bg-muted-foreground/40" style={{ width: "76%" }} />
      </div>
    </div>
  ),
};
