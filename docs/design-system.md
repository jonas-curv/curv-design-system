# Curv OS design system

The reference aesthetic is Linear and Vercel: near-monochrome surfaces, color
only where it carries meaning, a small fixed type scale, generous-but-dense
spacing, and hierarchy expressed through text color rather than size or
weight escalation. Every page should feel like the same product. The surface
palette is a **neutral, navy-free gray** (see Color palette), and every OS app
is framed by a **dark Shopify-style top bar over a gray sidebar** (see App shell).

Legacy styling does not get grandfathered in — when touching a page, migrate
it to these rules. The only hard constraint: **all data that was visible must
stay reachable** (tabs, hovers, and progressive disclosure are fine).

## Using this doc — the north star

This document is the single source of truth for how **Curv OS apps** look and
behave, and the reference for any **new UI we build**. Read it before
writing UI. Everything below is here because we already decided it once on a
real page — so you don't re-decide (or re-argue) it per page.

- **Always reuse before you build.** If a control or pattern already exists as a
  shared component, use it — never hand-roll a second copy. One shared component
  cannot drift; N hand-rolled copies always do, and that drift is what makes an
  app feel stitched together. This is the highest-leverage rule in this doc. If
  the thing you need doesn't exist yet, build it *as a shared component*, don't
  inline it.
- **New component → write it down.** The moment you add a shared component (or a
  reusable pattern), add it to *Components to reuse* below: **what it is, when to
  use it, and — if non-obvious — why.** A component that isn't in this doc gets
  re-invented by the next person; the registry is how reuse actually happens.
  Treat the doc as part of the definition of done, not an afterthought.
- **Portable by design.** The *principles* here — color = meaning, one small
  type scale, hierarchy by color not size, the two view-switch patterns, the
  control-selection rule, reuse-don't-hand-roll — are product-agnostic. A new
  system adopts this by porting the token set (`app/globals.css` `:root` /
  `.dark` / `@theme`) and the shared component library, then swapping the domain
  examples (deals, P&L, brands) for its own. Keep this file as the shared
  reference across systems, not a per-repo fork.

## The bar — perfection is the spec

The standard this system is held to is the Rams / Ive / Jobs standard: **"less,
but better," carried out until nothing feels arbitrary.** That is not a mood —
it's the acceptance criterion for every component and every screen. Concretely:

- **"Good enough" is a defect.** If a corner, a spacing, an alignment, or a
  120ms-vs-200ms timing looks *slightly* off, it **is** off. Fix it; don't
  rationalize it. The aggregate of tolerated 1px errors is exactly what makes an
  app feel cheap, and no single one of them will ever be worth arguing about —
  so none of them get to stay.
- **Inconsistency is a bug, not a nitpick.** Two implementations of one pattern
  means one of them is wrong — file it and fix it with the same seriousness as
  a crash. Same control, same recipe, every OS, no exceptions per page.
- **Paint the back of the fence.** The quality of the parts nobody inspects —
  empty states, focus rings, disabled states, dark mode, `prefers-reduced-motion`,
  the loading flash, the 4th toast in a stack — is what makes the visible parts
  feel inevitable. A component isn't done until its unglamorous states are as
  considered as its happy path.
- **Design is how it works.** A beautiful menu that traps focus wrong, a dialog
  that loses your place, a table that jitters on refresh — these are *design*
  failures, not engineering footnotes. Ease of use and interaction correctness
  are held to the same bar as the pixels.
- **Subtract until it breaks.** Every element, option, and animation must earn
  its place; when in doubt, remove it and see if anyone misses it. The best
  version of most screens has fewer things on it than the first draft.
- **Review like a critic, not an author.** Before anything ships: diff it against
  the strongest existing screen at 100% zoom, in both themes, keyboard-only,
  reduced-motion on. If it reads as a different hand made it, it goes back.

Nothing ships at 90%. The last 10% — the part that's invisible line-by-line —
is the entire difference between "fine" and the product people can't articulate
why they love.

## Color palette (neutral, navy-free)

A **true neutral gray scale** — hue-agnostic, no blue tint (the app was rebased
off a navy `#0A2540` ink in 2026). Every value lives in `app/globals.css` (the
`:root` light block, the `.dark` block, and the `@theme` map). Use the semantic
tokens in components — **never raw hex**.

Light:

| Token | Hex | Role |
| ----- | --- | ---- |
| `--background` | `#FCFCFD` | Page canvas (near-white) |
| `--card` | `#FFFFFF` | Raised surfaces |
| `--muted` | `#F3F3F4` | Recessed gray (= sidebar, tracks, insets) |
| `--secondary` | `#E5E5E6` | Stronger recessed fill |
| `--foreground` | `#1B1B1B` | Primary text / ink |
| `--muted-foreground` | `#6B6B6F` | Secondary text |
| `--text-3` | `#8A8A8E` | Tertiary text |
| `--border` | `rgba(27,27,27,.08)` | Hairline borders |
| `--sidebar` | `#F3F3F4` | Sidebar surface |
| `--sidebar-accent` | `#EBEBEC` | Sidebar hover |
| `--sidebar-active` | `#E5E5E6` | Active nav item |
| `--primary` | `#171717` | Black CTAs / active states |
| `--overlay` | `rgba(27,27,27,.40)` | Modal scrim (dark: `rgba(0,0,0,.60)`) — never a hardcoded `bg-black/40` |

Dark mirrors the same logic (navy-free): `--background #0B0B0C`, `--card #161618`,
`--muted #1E1E20`, `--secondary #2A2A2C`, `--foreground #EDEDED`,
`--muted-foreground #A1A1A6`, `--border rgba(255,255,255,.10)`,
`--sidebar #101011`, `--sidebar-accent #1E1E20`, `--sidebar-active #2A2A2C`.

**Accents are shared across themes and were untouched by the neutral rebase**:
`--verdict-green #1F7A33` (soft `#D7F7C2`), `--verdict-amber #A35C00`,
`--verdict-red #D6453F`, the chart/data blue `--chart #2E90FA`, and the brand
dots. The top bar is a fixed `#1b1b1b` in both themes.

**Elevation shadow** — raised cards lift with `shadow-card` (a `0.5px` hairline
"border" done as a shadow + two soft drops) and `shadow-card-hover` when
interactive. Dark mode swaps the dark drop for a light hairline ring (a drop is
invisible on dark). Prefer shadow over border for raised cards — see Cards &
surfaces.

## Type scale — the ONLY allowed font sizes

| Token        | Size | Tailwind      | Use                                                        |
| ------------ | ---- | ------------- | ---------------------------------------------------------- |
| display      | 32px | `text-[32px]` | THE hero number. At most one per page.                     |
| title        | 24px | `text-2xl`    | Page title (`font-semibold tracking-tight`); large metric values. |
| heading      | 16px | `text-base`   | Section/card headings (`font-medium`). Use sparingly.      |
| body         | 13px | `text-[13px]` | Default UI text: table cells, labels, buttons, prose.      |
| caption      | 12px | `text-[12px]` | Secondary/meta text, column headers, stat labels.          |
| micro        | 11px | `text-[11px]` | Rare: dense annotations, chart axes, count badges.         |

Weights: `font-semibold` for display/title/metric values, `font-medium` for
headings/labels/emphasis, normal for everything else. Never `font-bold`.

**Never use full uppercase.** No `uppercase`, no `tracking-wider` label style,
anywhere. Labels are sentence case ("Gap to goal", not "GAP TO GOAL"). The
only exception is a proper name/acronym that is genuinely spelled that way
(FK, CCM, AOV, GP).

## Text color hierarchy (how hierarchy is made)

Hierarchy comes from **color, not size**. Three neutral levels:

1. `text-foreground` — primary: the data, values, names.
2. `text-muted-foreground` — secondary: labels, meta, descriptions, headers.
3. `text-muted-foreground/60` — tertiary: placeholders, empty values ("—"),
   disabled, de-emphasized counts.

A cell/tile reads label-muted → value-foreground. If everything on a surface
is `text-foreground`, the hierarchy is missing; fix the labels, don't enlarge
the values.

## Semantic color

Color = meaning, never decoration:

- `verdict-green` — good / money collected / positive delta / on track.
- `verdict-amber` — attention / at risk (use sparingly; amber everywhere
  reads as noise).
- `verdict-red` — bad / negative / short of goal.
- Brand accents (`BRANDS[].accent`) — **small dots only** (`size-1.5
  rounded-full`), never filled badges or text color.

Application rules:

- Status = **small soft pill** (Untitled UI style): `bg-verdict-green-soft
  text-verdict-green` + check for good, `bg-muted text-muted-foreground` +
  dot for neutral, red-soft for bad. Works in table rows too. (A bare dot +
  word is the lighter alternative when even a pill is too much.)
- Deltas = **small soft-filled pill** (`bg-verdict-green-soft
  text-verdict-green` / red), `rounded-full px-1.5 py-0.5 text-[11px]` with a
  direction arrow. The fill makes up/down a pre-readable shape — that's the
  one place soft-fill earns its keep on a data-dense surface.
- Soft fill (`verdict-*-soft`) is allowed only on **small semantic
  indicators** (delta chips, a single status token). A large surface never
  takes the full-saturation soft fill — that loud wash is the failure mode.
  The one exception is a **`Banner`**, which uses a *whisper* tint instead: the
  hue at **~7%** (`bg-verdict-*/[0.07]`) + a matching hairline border
  (`border-verdict-*/25`) + a coloured icon — suffused, not washed (the
  Geist/Polaris pattern). No left accent stripe. A page still has at most one
  large emphasized surface.
- Charts: one accent series + muted/dashed comparisons. Series colours are a
  restrained categorical set (the `chart-*` tokens) — **never verdict red/green
  for a category** (a red brand segment reads as "bad", not "brand").
- **Period-over-period is a convention, not per-page wiring.** Flag the prior
  window's series `comparison: true` and it styles itself — muted + dashed in the
  `chart-prev` hue — and the tooltip gains a signed "% from comparison" delta on
  the current series (the Shopify hover). Don't hand-restyle a gray dashed line on
  every chart; flag exactly one series. The delta is the one sanctioned
  verdict-coloured mark on a chart: set `deltaTone="up-positive"` (default — a
  rise is green: conversion, revenue) or `"down-positive"` (a fall is green: CPL,
  CPA, cost); the arrow always points the literal direction, only the colour
  flips. **Scope lives with what it governs:** the metric dropdown sits on the
  `ChartCard` (it changes only the chart); a page-wide date range + comparison
  period belong in the *page* header (they re-scope every chart, table, and tile
  at once) — never a per-chart date picker when the page has more than one widget.
- **Y-axis: never more than 5 gridlines.** 5 is the target; when a clean coarser
  step covers the range in 3–4 lines, take that (never pad to 5). Values use
  "nice" 1/2/2.5/5×10ⁿ steps. Line charts may drop the zero baseline
  (`yBaseline="auto"`) for large clustered values; **bars never do** — a
  truncated bar lies. (Both rules live in `chart.tsx`'s `niceTicks` + the
  `LineChart`/`BarChart` primitives.)
- **A chart-sized surface must be interactive — otherwise it's a `Sparkline`.** A
  full chart frame promises you can *read values off it* (hover → crosshair +
  shared tooltip + per-series dots; `LineChart`/`BarChart` do this). A big frame
  with a static line and no hover is the worst of both worlds — it *looks* like a
  chart but answers nothing (a real regression we shipped). If a trend is just a
  **glyph** — shape/direction at a glance, no exact values needed — use a
  **`Sparkline` at sparkline size** beside the number; never blow one up to chart
  size to fill space. Interactive chart when the user reads values; `Sparkline`
  when they only need the shape. **Never render a chart-sized element that can't
  be hovered.**
- **Color marks exceptions, not the field.** Never wash a whole column or table
  with verdict tints — a column where every cell is green/amber/red carries no
  signal, and amber-everywhere reads as noise. Tint **only meaningful deviations
  past a threshold**, only where a comparison is actually meaningful, and prefer
  a small indicator (a dot, or a colored delta figure) over a full-cell fill on
  dense tables. Good: the P&L monthly grid (tints only vs-forecast, only on
  section totals, only ≥10%) and the leaderboard IQ column (extremes only). Bad:
  a rate column that paints every row.

## Pills (the Linear recipe)

Pills are welcome — Linear uses them everywhere — but only the clean kind:
**outlined, no tinted fill, colored dot carries the meaning**:

```
inline-flex h-6 items-center gap-1.5 rounded-full border border-border
bg-card px-2.5 text-[12px] font-medium text-foreground
```

- Optional leading `size-1.5 rounded-full bg-<semantic/brand>` dot.
- Text stays neutral (foreground or muted-foreground) — never colored text
  inside a pill, never `verdict-*-soft` / `*-500/15` tinted backgrounds.
- Use for: standalone status chips, tags/labels, filter values, counts that
  need to read as objects. Don't use inside dense table rows (dot + word,
  no border, is quieter there).

## Page container & responsive width

Width follows **content type**, not taste. The test: does the content
degrade when stretched?

- **Rows and boards don't degrade** — a table/list row is anchored left
  (identity) and right (meta); extra width is calm empty middle. Linear
  runs these full-bleed and it works at any resolution.
- **Charts, KPI tiles, big numbers, and prose DO degrade** — a chart
  stretched to 2400px flattens into noise, a stat card becomes an empty
  slab, a progress bar puts the % a half-meter from its label. Linear has
  no full-width charts anywhere (graphs live in bounded rails); Vercel
  centers its dashboards for the same reason.

Three containers:

| Type      | Class                          | Use                                                                 |
| --------- | ------------------------------ | ------------------------------------------------------------------- |
| full      | `w-full px-6` (no max)         | Pages/views that are ONLY rows/boards: lists, tables, kanban (Linear). |
| dashboard | `mx-auto max-w-[1280px] px-6`  | Any page containing charts / KPI tiles / hero numbers / mixed content (Vercel). |
| narrow    | `mx-auto max-w-[720px] px-6`   | Settings, forms, prose (Linear settings).                            |

A page with a **chart** or big hero numbers uses `dashboard` for the whole page
— those degrade when stretched, and mixing widths reads as broken. Don't invent
other max-widths. Vertical rhythm: `py-7`, `xl:px-8` optional on dashboard/full.

**Level 1 vs level 2 (the shared `PageContainer`).** The two ideas ship in
`@curvgroup/design-system` as `PageContainer`: **level 2** is the default —
centered, capped width (`size` = `narrow` | `default` | `wide`) for dashboards,
mixed content, and prose; **level 1** is `bleed` — edge-to-edge full width for
pure rows/boards. Mapping the table above: `full` → **level 1** (`bleed`);
`dashboard` / `narrow` → **level 2** (centered). `PageContainer` is the source of
truth for the exact max-widths — never hard-code your own wrapper (a hand-rolled
`min-h-screen … px-6 py-8` shell is how a page ends up off-token and off-width).

**Table-first pages stay `full` even with a KPI summary.** A wide data table is
the point of the page and shouldn't be boxed into `dashboard`; a table page with
a KPI strip on top (no chart) stays full-width. Example:
`app/(app)/customers/page.tsx`.

**KPI cards are ONE treatment across the app** — the same raised shadow cards
everywhere (`rounded-lg bg-card px-5 py-4 shadow-card`, sentence-case `12px`
label + `text-2xl font-semibold` value, `grid … lg:grid-cols-5 gap-3`), whether
the page is centered (`dashboard`, e.g. the deals overview) or full-width (e.g.
customers). Don't invent a second KPI style (divided bars, bordered boxes) for
one page — consistency across pages beats a per-page optimisation.

**But this bans re-skinning the *same* numbers — never building a *richer* one.**
The rule stops someone giving four plain KPIs a bespoke look on one page. It is
NOT license to delete a purpose-built visualization that carries *more*
information: a value-by-status breakdown, a distribution, a proportional bar
answering "where is it concentrated?" is a **chart / breakdown**, not "a second
KPI style". Build it with the reporting primitives (`BarBreakdown`, `StatCard` +
`breakdown`, `Sparkline`, the charts) — never flatten it into generic tiles for
uniformity. **Consistency serves the page's job; it never outranks the
information the user came for.** (A real bug we shipped: a redesign replaced a
catalog-value-by-status hero — the single most useful thing on the page — with
four generic count tiles, because it read this rule as "standardize the KPIs".)

**Stat depth is a hover away (the Curv breakdown pattern).** A `StatCard` stays
minimal — label, value, delta — and its detail lives in the **`breakdown`**
hover card (period comparisons + per-brand rows via `BreakdownRow`), appearing
after a short rest and never on click. A stat that links to its report takes
`href` (whole card is a real anchor, ↗ affordance on hover). Progressive
disclosure, not denser cards.

**Table headers never wrap or truncate.** A header is the key to its whole
column, so it must stay fully readable — `whitespace-nowrap`, and if a label is
too long, shorten the word (never "…" + tooltip; truncation is for cell values,
not headers).

## App shell — dark top bar + gray sidebar

The chrome is **Shopify-style**: a dark top bar spanning the width, with a gray
nav sidebar and whiter content "cradled" below it. Ships as the package
`AppFrame` / `TopBar` / `Sidebar` (`src/components/shell/*`) — never rebuild it;
the Customs OS mount (`app/(app)/layout.tsx`) is the reference implementation.

**Top bar** — `sticky top-0 z-50`, `h-14` (56px), `bg-[#1b1b1b]`, light text.
A `grid-cols-[1fr_auto_1fr]` layout so the search sits at the **true center**
regardless of side widths:

- **Left**: the logo (`h-4`).
- **Center**: the global **⌘K search** — a wide (`w-[36rem]`) dark pill
  (`bg-white/10`) with a light hairline shadow (the dark-surface analogue of the
  card shadow). This is the only mount of the `CommandPalette` (⌘K).
- **Right**: knowledge base + feedback (icon buttons), the notifications bell, a
  divider, then the account chip (avatar + name → menu with Light/Dark toggle,
  Access, Settings, Sign out). Icon buttons are `text-white/70 hover:bg-white/10`.

**Sidebar** — `w-60`, `bg-sidebar` (recessed gray), `sticky top-14`,
`h-[calc(100vh-3.5rem)]`, `rounded-tl-[12px]`, `border-r border-sidebar-border`.
It is **nav only** — logo, search and profile all live in the top bar. Nav is
`px-3 py-3`. Items: inactive `text-foreground/80`, `hover:bg-sidebar-accent`,
active `bg-sidebar-active` + `text-foreground` + `font-medium`. Collapsible
section headers (`text-foreground/70`, `text-[12px]`) with a **right-aligned**
chevron (Vercel); **Home is pinned** at the top (`mb-2`, no header). Collapse
state persists per-device (cookie) and the active section auto-opens on deep
links.

**The "cradle" (rounded frame)** — the layout wrapper is the bar colour
(`bg-[#1b1b1b]`), so it shows through the frame's rounded top corners for a soft
transition instead of a hard edge:

- The sidebar rounds its **top-left** (`rounded-tl-[12px]`), visible because the
  sidebar is sticky.
- The content rounds its **top-right** via a **sticky, zero-height concave mask**
  pinned under the bar (a `radial-gradient` quarter-circle in the bar colour) —
  `main` scrolls, so its own corner wouldn't stay pinned; the mask does.
- Radius is **12px** on both corners. Content is `bg-background` with
  `overflow-x-clip` (keeps sticky descendants pinned to the window).

## Spacing & layout

4px grid. Sections stacked with `mt-4` (16px). Card padding `px-5 py-4`
(compact) or `px-5 py-5` (featured). Related stats become **sections of one
card** separated by `border-t border-border` or `divide-x divide-border` —
not a field of separate boxes.

**Control height** — interactive controls in a filter/toolbar row share one
height: **`h-9` (36px)**. Triggers, dropdowns, segmented toggles, search
inputs, primary buttons all sit at h-9 so a filter row reads as one aligned
band. (Dense in-table controls may drop to h-7/h-8; a page's main toolbar
does not.) Popovers/menus are generously sized — `text-[13px]` rows at
`py-2`, not cramped `text-xs` at `py-1`.

## Surface hierarchy (backgrounds)

Every background maps to ONE of these levels — never pick an ad-hoc gray or a
random opacity. The palette is a true neutral gray scale (no blue tint). Depth
runs: near-white canvas → recessed gray → raised white card.

| Level         | Token          | Use                                                        |
| ------------- | -------------- | ---------------------------------------------------------- |
| canvas        | `bg-background`| The page canvas — a near-white (`#FCFCFD`). The app shell. |
| recessed      | `bg-muted`     | The recessed gray (`#F3F3F4`, the same gray as the sidebar): sidebar, kanban column tracks, stat tiles, segmented-control tracks, table header band, insets inside a card. |
| card / raised | `bg-card`      | Raised surfaces (white): cards, popovers, the active pill in a segmented control. Lift with `shadow-card` (preferred) or a flat `border-border`. |
| hover         | `bg-accent`    | Row/button hover only — never a resting background.        |

Rules: a raised white card sits on either the canvas or a recessed gray track;
a recessed gray tile sits on the canvas or inside a card. The canonical nesting
is canvas → gray track → white card (e.g. the kanban board). Avoid opacity
variants like `bg-muted/40` when the solid token reads correctly; reserve
fractional opacity for genuine subtlety.

## Cards & surfaces

**Radius is concentric, not fixed.** The old "everything is `rounded-lg`, never
`rounded-xl`" rule was a blunt instrument — it prevented the actual thing that
makes nesting look right. The rule is now relational: when a rounded element sits
inside another with padding between them,

    outer radius = inner radius + padding

so the two corners run parallel (concentric) instead of one looking pinched
inside the other. Mismatched nested radii are one of the most common things that
make an interface feel subtly off.

**The scale is proportional to size and elevation** — a bigger, more-raised
surface earns a rounder corner (how Apple and Vercel both reason about it), and a
small dense element stays crisp:

- Inline chips / small dense cards (kanban & list items): `rounded-md` (~8–10px),
  kept tight the way Linear keeps its board cards crisp and engineered.
- Buttons, inputs, toolbar controls: `rounded-md` (~8–10px).
- Standalone content cards / panels / tables: `rounded-lg` (12px) — **the anchor**.
- Large floating surfaces (modals, full boards, hero panels): `rounded-xl` (~16px).
- Pills / avatars: `rounded-full`.

**Why 12px for cards specifically?** It's the established convention, not a guess:
Shopify Polaris cards are `border-radius-300` = 12px, and Vercel Geist uses 12px
for its medium / menu / modal surfaces. It sits deliberately between Linear's
tighter ~8px (crisp, engineered) and iOS's softer ~16px — a middle that reads as
a polished data product, not toy-round or sharp-corporate. Buttons run tighter
(Polaris 8px, Geist 6px), which is why controls stay below the card radius.

- **Derive nested corners, don't guess.** A card that tightly wraps a rounded
  child gets a *larger* radius so the child stays concentric — e.g. a `rounded-lg`
  (12px) thumbnail in a card with `p-2` (8px) → the card is `[20px]` (12 + 8). A
  child is **never** rounder than the parent that contains it.
- **The 24px cutoff.** Concentric math only matters for tightly-nested surfaces.
  If the padding is larger than ~24px, treat the layers as separate surfaces and
  pick each radius on its own merits — don't let a spacious card balloon to 40px.
- Retune the base globally via `--radius`; derive nested corners per-context.

This is a *taste* rule, enforced by review (`curv-ui` skill + design-review
agent), not by lint — a linter can't compute concentricity.

**Prefer shadow over border for raised cards.** A raised card lifts with
`shadow-card` — a token whose first layer is a `0.5px` hairline "border" done as
a shadow, plus two soft drops. Recipe: `rounded-lg bg-card shadow-card` (no
`border`), adding `transition-shadow hover:shadow-card-hover` when it's
interactive. The older flat recipe `rounded-lg border border-border bg-card`
still fits dense/tabular contexts, but standalone cards and boards use the
shadow. `shadow-card` is defined per-theme (light: hairline + soft drop; dark: a
light hairline ring, since drops don't read on dark). Reserve `shadow-lg` for
genuinely floating elements (popovers, menus). No nested bordered boxes: inside
a card use recessed `bg-muted` tiles or dividers.

**Kanban / board columns**: the column track is the recessed gray
(`rounded-lg bg-muted p-2`, no border); the cards inside are raised white
(`rounded-lg bg-card p-2.5 shadow-card` + `transition-shadow
hover:shadow-card-hover`). Canvas → gray column → white card.

**Two tab patterns, one per job** (don't mix them up):

1. **View-navigation tabs** — switching between distinct *views of a page*
   (Overview / All deals). Use the package **`Tabs`** (base-ui `tablist`,
   arrow-key roving). Renders as a **full-width `bg-card` (white) bar with
   `border-b border-border`, directly under the top bar** (separated from the
   content by its border). Tabs align to the content's left edge (pull the
   nav back by the tab padding, e.g. `-ml-3`), active marked with an
   **underline** (`after:-bottom-px after:h-0.5 after:bg-foreground`),
   inactive muted. Chrome/navigation — the Clerk/GitHub pattern.
2. **Filter toggles within a view** — mutually-exclusive filters on the
   current data (money-state All/Confirmed/To Collect, Collected/Posted
   lens). Use the package **`SegmentedControl`** (a radiogroup — exactly-one-of-N
   + arrow-key selection) — never hand-roll the track, so every instance is
   identical. Recipe: a `bg-muted`
   track with `p-0.5` (2px) padding, `gap-0.5` (2px), `rounded-[8px]`, and a
   1px `border-border`; the active segment is a raised `bg-card` pill,
   `rounded-[6px]`, `shadow-sm`, `font-medium`, inactive muted. (Radii are
   explicit px — the project's `--radius` scale is 12px-based and doesn't land
   on 6/8px.)

If it changes *what page-view you're looking at*, it's an underline bar. If
it *filters the data in the current view*, it's segmented pills.

**These two are the only view-switching patterns we use** — no dropdown
view-switchers, no secondary left rails. (Validated against Stripe / Vercel /
Linear, which use underline tabs for a small fixed set of views and segmented
pills for filtering; a dropdown-switcher only earns its keep for unbounded
user-created views, which we don't have.) Underline tabs top out around 7 items;
if a group would exceed that, rethink the grouping rather than reach for a new
pattern.

**Breadcrumbs — when (not) to use them.** We deliberately **do not** ship a
breadcrumb component today, and most surfaces shouldn't want one. Our navigation
is top bar + sidebar → page → optional Tabs, and our pages are mostly **list →
detail** (Deals → SO-1042): one level deep, where the sidebar's active state and
the entity title already answer "where am I." Adding breadcrumbs there is
decoration, and decoration is what we subtract.

Breadcrumbs earn their place only when **both** are true: (1) the hierarchy is
genuinely **3+ levels** deep (e.g. `Settings → Team → Member → Permissions`), or
a detail page is reachable from **multiple parents** and the path back is
ambiguous; and (2) the user actually needs to jump *up* the tree, not just back.
At 1–2 levels, use a single **back affordance** + the sidebar context instead.

If a surface ever clears that bar, that's when we build the component — shaped
against the real screen, not speculatively — and document its recipe here. Until
then, "no breadcrumbs" is the decision, on the record.

**Toolbar controls** are visually uniform: every filter trigger, dropdown,
and the date picker share `h-9 rounded-md border border-border bg-card`
(white fill) so the row reads as one set. Don't mix filled and unfilled
triggers in the same row.

**Progress/meter bars**: `h-1.5 rounded-full bg-muted` track. A success/pace
meter fills `bg-verdict-green`; a neutral capacity meter fills a single brand
or foreground tone. One color per bar — don't tint by category when the bar's
meaning is "progress".

## Tables

- Container: card recipe, header row `border-b`.
- Header cells: caption size, `font-medium text-muted-foreground`, sentence
  case, on a subtly grayer band (`bg-muted/95` sticky) so the header reads as
  separate from the body. Sortable via subtle chevron.
- Progress/meter bars in cells carry a **meaningful** tint (brand accent, or
  verdict color for good/bad) on a `bg-muted` track — not a flat gray.
- Body: body size (13px); rows `py-2.5`, `border-b border-border`,
  `hover:bg-accent/30`.
- **Fixed column layout** — use `table-fixed` with a `<colgroup>` giving
  every data column a constant width; let ONE identity column (Customer/Name)
  flex to absorb the remainder. This stops columns resizing/jumping as rows
  load. Consistent cell padding (`px-3`) across all columns — never eyeball
  per-column spacing.
- **The primary text column gets a comfortable min-width — never the numeric
  floor.** In the shared `DataTable` (a CSS grid), an auto-sized column defaults
  to `minmax(120px, 1fr)`. 120px is fine for a number but *crushes* a Name/Title
  column, so it truncates **typical** values, not just long ones. Give the
  identity/name column a **`minWidth`** (~240–320px): it then fills slack (`1fr`)
  and only genuinely long values ellipsis at the edge — the Linear pattern (fit
  the common case; cut the outlier with `…`, never let one 60-character name set
  the whole column's width). `maxWidth` caps the growth. A column with a fixed
  `width` (e.g. a sticky identity column) sizes to exactly that. Numbers must
  never truncate — keep numeric columns wide enough for their longest value.
- Numeric columns right-aligned with `tabular-nums`. Empty = `—` tertiary.
- Identity columns use the **two-line cell**: primary in foreground medium,
  meta line below in caption muted. Never cram badges next to the primary
  text; never let a cell wrap accidentally.
- **Filtering** for a table with 3+ facets uses the **Linear filter pattern**
  (see `app/(app)/deals/deals-filter.tsx`): a single dashed **"Filter"**
  button opening a menu of properties; **hovering a property opens a submenu**
  with its multi-select values (base-ui `Menu` + `SubmenuRoot` +
  `CheckboxItem`), so you switch facets without clicking back. Each active
  filter is a **removable chip** ("Status is Confirmed ✕"); clicking the chip
  re-opens its value picker. Don't line up N always-visible `field · all`
  dropdowns. Keep free-text search as its own input.
- **Never let a wide table scroll the page.** The scroll container
  (`overflow-auto`) owns horizontal scroll; ancestors that are flex items
  need `min-w-0` so the table's `min-w` can't force page-level scroll.
- **Signal horizontal overflow** with a soft edge fade (Linear pattern): a
  `bg-gradient-to-l from-card` overlay on the right (and `-to-r` on the left),
  each shown only when the table can scroll that way (track `scrollLeft` vs
  `scrollWidth - clientWidth`), `pointer-events-none`. **Built into `DataTable`**
  automatically — the left fade is suppressed when a column is pinned, since the
  frozen column already anchors the left edge.
- **Clickable cells are the default; a whole-row link is opt-in — not the other
  way round.** Make the *specific* cells that represent entities clickable with
  **`TableLink`**: the identity column (customer, person) → *that entity's*
  profile, a secondary id → *its* record; never point two cells at the same
  place. That is the baseline for every table. **Only add a whole-row link
  (`getRowHref`) when the row is a single entity whose page is the primary click
  target** — a deals/orders/issues list you open one at a time (the Linear /
  Stripe pattern). There, the row anchor is just a big hit target for that one
  destination, and `TableLink` cells override it for secondary entities (and stop
  the double-fire). Do **not** make the row a link when its cells point to
  *different* places with no single "open" destination, or when the table is
  analytical data you *scan* rather than open (a catalog, a reporting matrix) — a
  whole-row link there is confusing and defeats the point of the deliberate cell
  links. When you do use one, it's a *real anchor* (`getRowHref`), never an
  `onClick` div — cmd/middle-click, copy-link, and keyboard access come free.
  **Navigate vs peek:** navigate when the entity has its own page and opening it
  is the primary action; open a `Drawer` peek only for triage flows where losing
  list position hurts — composed at page level, never baked into the table.
- **Copy affordance on identifiers only.** `CopyButton` (hover-revealed via
  `group/copy`) belongs on order/quote #s, SKUs, and shareable links — things
  people paste into other systems. Never on names, money, statuses, or free
  text; copy-everything is noise.
- **Sticky what you scroll past.** For a wide or long table scanned daily, make
  the header sticky (`sticky top-0`) and the identity column(s) sticky
  (`sticky left-0`) so labels never leave view (Customers, the P&L monthly grid).
  In `DataTable`, mark **the identity column** — the name/id that says *which
  row this is* — with `sticky: true` (the header is already sticky). **Freeze
  only that by default**, the way Linear / Airtable / Notion / Stripe do; don't
  pin data columns (status, amounts) just to keep them on screen — every frozen
  column permanently eats horizontal room you're trying to scroll *into*, and
  status isn't identity. The frozen block is opaque (scrolled cells never bleed
  through) and takes the row's hover tint; its right edge shows a **hairline at
  rest that deepens to a soft shadow once content scrolls under it**, so partial
  cells read as sliding *under* the frozen block. An adjacent column — including
  a status badge — may briefly fragment at that edge *while you scroll through
  it*; that's normal and the shadow absorbs it. (`sticky` does accept multiple
  leftmost columns if a product genuinely needs one always visible — but that's
  a deliberate opt-in trading width for persistence, not the default.)
- **Read-only by default; selection is opt-in.** Our tables display data — they
  don't edit or remove rows from the table itself. So `DataTable` ships **no row
  selection**; that's correct, not a gap. When (and only when) a table gains a
  genuine bulk action (assign, export-subset, archive), selection + a
  bulk-action bar get added as an **opt-in** capability (a `selectable` /
  `rowActions` prop). Absence of that prop *is* "read-only" — never add a
  `readOnly` mode flag. Reporting surfaces (the P&L) never get selection.
- **Loading is a skeleton, not a spinner or a blank.** Pass `loading` to
  `DataTable` for pulsing `bg-muted` skeleton rows on the `bg-card` surface
  (distinct from the empty state), with `aria-busy` + a polite "Loading…" status
  so it's not silent to a screen reader.
- **Full-bleed row backgrounds.** When a row carries a background (selected, an
  emphasized total), it should span the card edge-to-edge — put horizontal
  padding on the *cells* (`pl-4` first, `pr-4` last), not on a wrapper. A padded
  wrapper insets the fill and it reads as a cut-off band.
- **Inline sparklines** (a "Trend" column) are line-only, one neutral color, no
  axes or fill, and **no red/green** — trend-at-a-glance, not a verdict
  (direction lives in the delta column). One identical stroke for every row.

### Pagination & virtualization — match the tool to the data

The **UX is the same for every data table**: scroll to browse + a row-count at
the bottom. **No "Show 50/100/200", no Load-more, no page numbers.** Only the
*implementation* changes with the realistic max row count — and virtualization is
a performance tool, not a default (a virtualized div-grid loses `<table>`
semantics, breaks Cmd+F / print / text-selection, and paints empty on the
server). So reach for it only when scale actually demands it:

| Realistic max rows | Implementation |
| ------------------ | -------------- |
| Bounded, ≤ ~1.5–2k | Plain semantic `<table>`, **render all rows**. Keep Cmd+F, print, a11y, clean SSR. Soft-cap the render (e.g. 1,500) with a "narrow the range" hint so a freak-wide filter can't freeze the browser. Example: `app/(app)/deals/deals-table.tsx`. |
| Thousands+ / unbounded / can't fit the client | **Virtualize** (`@tanstack/react-virtual`) + fetch row windows on scroll. Div-grid rows, sticky header, a bottom count/aggregation bar. Example: `app/(app)/customers/customers-table.tsx` + `app/api/customers`. |

**Two independent questions — don't conflate them.**

1. **Will anyone *query* this table — search, filter, sort, export, or select
   rows?** Yes → the **`DataTable`** component, *at any size* (its features are
   opt-in; enable only what the view needs). No → a read-only block of a few
   bounded rows you just present (a SKU's warehouses, a summary, PO detail) → a
   plain semantic `<table>`, keeping Cmd+F / print / clean SSR.
2. **Read-only fallback by size.** For a *read-only* block, size picks the
   render: bounded (≤ ~2k) → a plain `<table>` that renders all rows (keeps
   Cmd+F / print / clean SSR); larger → it must virtualize. **`DataTable` always
   virtualizes** — a CSS div-grid, never a `<table>`, at any size — so it also
   covers *large* read-only data, trading native find/print for its chrome.
   Render-all is the plain-`<table>` path, **not** a mode inside `DataTable`.

**Size is not the trigger for `DataTable` — intent-to-query is.** A six-row list
people filter is a `DataTable` (Shopify's Products index, Linear's issues, a
six-row analytics list all keep Search / Filter / Sort / Export at any count); a
few hundred read-only rows nobody queries can stay a plain `<table>`. So a per-SKU
or "detail" table is **not** "always plain," and `DataTable` is **not**
"catalog-only." Reach for `DataTable` the moment a query verb
(sort / filter / search / export / select) enters the picture; use a plain
`<table>` only for pure display — and give even that plain table the soft-cap +
"narrow the range" hint above, so a freak-large case can't freeze the page.

### Summary strip — the breakdown above a table

A list page's aggregate (catalog value by status, deals by stage, revenue by
brand) is a **full-width `SummaryStrip`** above the table — never a small card in
a corner (the Dub / Plausible pattern): the total anchored left, the breakdown as
a horizontal stat row filling the width, and a thin proportional bar. Colour marks
**meaning** (a `verdict-*` / `chart-*` token per slice), and a neutral
"none / unclassified" residual is ordered **last** (colour first, gray last). An
*action* on the breakdown — "1,232 SKUs unclassified → triage" — is a separate
`Banner` (amber / whisper-tint), not baked into the strip.

### Financial statements (P&L pattern)

A multi-period statement (the P&L, `app/(app)/finance/pnl`) is a *reading*
surface, not a spreadsheet. Keep the default calm:

- **Model the operational waterfall, and don't fudge it.** Revenue − Direct
  COGS = Deal Gross Profit; Deal GP − Operational Expenses = Operating
  Contribution. COGS lines never reappear under OpEx. Direct COGS, Deal GP, and
  OpEx are *derived* from component metrics (`COGS_KEYS` / `OPEX_KEYS`); the
  legacy stored `gpTotal` source is presented as Operating Contribution. Do not display
  EBITDA until the overhead layer (payroll, rent, software) is included. If a
  stored figure doesn't reconcile
  (e.g. Operating Contribution ≠ Deal GP − Operational Expenses), show the stored value and **flag it** with a
  warning + tooltip — never silently correct it.
- **One period at a time.** Use one Period control for Selected month, QTD, YTD,
  and trailing 12 months. The control also owns its through-month; do not render
  a separate row of year tabs.
- **One page skeleton for both views:** page controls → a single
  full-width **chart card** → the full-width table. Switching Summary↔Monthly
  swaps only the table region; the chart card is identical and stays put. The
  **Summary/Monthly switch is a segmented control on the table's header**
  (top-right, attached to the table it controls) — not on the year-tab row. The
  Options popover holds only true display prefs (projection, full numbers,
  show-empty-rows). `view`, `comparison`, `period`, and `month` all persist in the URL, so a
  configured view survives refresh and is shareable.
- **The chart is driven by a metric dropdown** (Revenue, Direct COGS, Deal
  Gross Profit, Deal GP Margin, Operational Expenses, Operating Contribution)
  in its own header; the statement's total + margin rows are also
  click-to-plot (a shortcut, not the only path).
- **Comparison is one page-level control** — a `vs forecast / vs last year`
  segmented toggle in the page header (no "off"). It drives the **chart's
  comparison series**, the Summary delta column, and in Monthly the **grid
  tints + pacing** (both vs-forecast only; vs-last-year shows no tints). Summary
  shows one delta column for the chosen comparison: plain colored numerals
  (`+8%`, or `+2.4pp` for rate rows), right-aligned, expenses flip good/bad. In
  Monthly, cell tints mean off-plan:
  only vs-forecast, only section-total rows, only closed months, only ≥10%.
- **The in-progress month is not a closed month.** Derive the live month from
  the reporting-timezone "now" (never hardcode it), and make the marker and the
  styling agree. The current month renders muted like a forecast cell with an
  `MTD` header, is column-highlighted, and is excluded from exception tinting
  and from the pacing calculation until it closes. Closed months keep normal
  actual styling; the actual/forecast divider sits on the last closed month.
- **The comparison follows the selected period.** A month, QTD, YTD, or TTM
  selection is measured against forecast or last year over the same months.
  Never compare partial actuals with a full-year baseline. A cumulative
  **pacing** row (actual vs forecast over closed months, colored text only) sits
  at the foot of the Monthly grid when comparing vs forecast.
- **Hide dead rows.** All-zero line items are noise — hidden by default,
  revealed by a "show empty rows" audit toggle. Section totals always show.
- **Editing lives with the data, not the view.** Target-setting (Goals) is its
  own sidebar destination, not a button on the viewing dashboard.
- **Every number answers "what's inside?"** Wire `ReportTable`'s `onCellClick`
  (and `onRowClick`) to open a `Drawer` of the underlying transactions for that
  cell (the Ramp/Digits pattern) — interactive cells become full-cell buttons
  with a hover affordance and native keyboard access. A figure you can't drill
  into is a figure the reader can't trust.

`ReportTable` implements this section's shell. Two chart details it pairs with:
the current-vs-projected line is one `LineChart` series with **`partialFrom`**
(solid up to the last closed month, dashed after — not two series); and when a
chart carries a comparison, give `ChartCard`'s legend items a `key` + a
render-prop child so the legend **toggles series on/off** (the chart stays a
dumb primitive; the card hands you the hidden keys).

## Choosing a control: segmented vs dropdown vs tabs

Which control a setting gets is not taste — it's a function of **how many
options, how often you switch, and whether seeing the state (and the
alternatives) at a glance is worth the space.** Three species:

- **Segmented control** — **≤3 options, frequently switched, and the current +
  alternative states are worth showing at a glance.** Its whole value is that
  it shows the options you're *not* on, so there's no click to see what else
  exists. Caveat: the real cutoff is **label width, not just count** — 3 short
  labels fit; 3 long ones (or 2 in a cramped toolbar) overflow, and then it's a
  dropdown. Reach for `components/ui/segmented-control.tsx`.
- **Dropdown / select** — **≥4 options, OR set-and-forget** regardless of
  count. It trades glanceability for space and scales to long lists; use it
  when the choice is made rarely or the options don't fit as segments.
- **Tabs** — the third species: **many options, frequently switched, AND enough
  horizontal room to show them all.** Tabs also differ *semantically*: they
  switch the **content/scope** you're looking at (year tabs re-scope the whole
  page), whereas a segmented control switches a **mode/parameter** of the
  content already in view.

The test that the rule is right, not a rationalization: audit an existing page
and every control should already land where the rule puts it. On `/finance/pnl`:
comparison basis (2, frequent, glanceable → **segmented**); brand (5, occasional
→ **dropdown**); Summary/Monthly (2, frequent → **segmented**); chart metric (5,
occasional → **dropdown**); reporting period (preset plus through-month →
**popover**). All five land where the rule predicts.

### Page tabs — always at the top, full-width

Where page/view tabs sit is **not** a per-page decision. Page-level tabs are
**always the top-most element of the content area, pinned directly under the app
bar, and always full-width** — the underline bar (`border-b border-border`) runs
edge to edge across the content column. You read the tabs first ("I need the
Marketing view"), *then* the content. This holds even on an **entity-detail** page
where the title is identical on every tab: the entity header (title, ids, status,
freshness) lives **below** the tab bar, inside the active panel — never above it.
Customs OS Deals is the reference — Overview / All deals / My deals sit at the top
full-width; the "Deals" title and its controls live underneath.

**The test — section-switch, not row-filter.** Page tabs switch between distinct
*views or sections* of the page: each tab is a different screenful of content
(Overview vs Inventory & supply vs Sales on a product-detail page; a list's
Overview dashboard vs its full table). If a set of tab-looking chips instead
**filters or scopes the rows of a single table** — a status filter like *Active /
Scale / Keep / Cut / All* — it is **not** a page tab. Same content, fewer rows =
**filter → it stays in the table's toolbar**, never hoisted above the page header.
Different section = page tab → top.

- **Full-width bar, per-tab inner width.** The tab *strip* is always full-width;
  what sits *under* it takes the level its content needs (see *Page container*):
  a table/board view is **level 1** (`bleed`, full-bleed — e.g. All deals), an
  overview with charts/KPIs is **level 2** (centered max-width — e.g. Overview).
  One bar, different inner widths per tab. Wrap each panel's content in the
  right `PageContainer`; the bar stays outside it, full-width.
- Use `<Tabs>` — it *is* this bar (full-width `bg-card` + underline, `h-11`). A
  `<SegmentedControl>` is the opposite species: it switches a *mode* of the
  content already in view and lives *inside* a panel, never at page top.
- **A table's status/row filter is NOT a page tab.** The `DataTable` `tabs` prop
  (All / Confirmed / To collect; Active / Cut / All) *filters the table's rows*
  and renders inside the table's own toolbar — it never becomes the page's top
  bar. Hoisting a products list's status filter above the page header and hero is
  the classic mistake: a filter wearing tab chrome is still a filter, not
  navigation.
- **Embedded exception** — `<Tabs bar={false}>` drops the bar to nest tabs in a
  card header. That is the *only* place tabs aren't the full-width page bar.

### Dropdown menus — the recipe

When the control-selection rule says "dropdown," it's a base-ui `Menu`, styled
one way so every dropdown in the app matches (never a native `<select>`):

- **Trigger** — the shared toolbar chrome: `h-9 rounded-md border border-border
  bg-card px-3 text-[13px] font-medium`, a trailing muted `ChevronDown` (14px),
  `data-[popup-open]:bg-accent`. A compact `h-7` variant is fine inside a card
  header — keep the border + chevron.
- **Popup** — `z-50 min-w-[180px] rounded-lg border border-border bg-popover
  p-1 text-[13px] text-foreground shadow-lg outline-none`.
- **Item** — `flex items-center justify-between gap-3 rounded px-2 py-1.5
  outline-none data-[highlighted]:bg-accent`; the selected item shows a trailing
  `Check` (14px). The P&L brand + chart-metric pickers are the reference.

## Overlays & feedback — the interaction layer

The package ships the full overlay layer: **`Tooltip`, `Menu`, `Dialog`,
`Toast`** (plus `Select`). Two architecture rules govern all of them:

1. **Behavior is never hand-rolled.** Every overlay is built on **base-ui
   headless primitives** *inside the package* — focus trap + restore-to-trigger,
   ARIA semantics, keyboard nav, outside-click/Escape dismissal, and collision-
   aware positioning are solved once, correctly. Apps import the styled
   component; neither apps nor new package components ever re-implement
   interaction behavior by hand. (This is the "reuse before build" rule applied
   one level down: behavior reuse, not just visual reuse.)
2. **One z-scale, no ad-hoc values.** Sticky chrome and popovers/menus/dialogs
   sit at `z-50`; toasts above everything at `z-[60]`. Never `z-[9999]`.

Per component:

- **`Tooltip` + `TooltipProvider`** — the inverted chip (`bg-foreground` /
  `text-background`, `rounded-md`, 12px medium). For icon-only buttons (which
  always also carry `aria-label` — the tooltip is not the accessible name) and
  metric-definition hints. Wrap a toolbar in `TooltipProvider` so scanning
  adjacent triggers opens each instantly (no re-delay). The first-open delay is
  **300ms** (a rest delay — the cursor must settle; longer values read as
  broken to a moving cursor). Never the native `title` attribute. A tooltip
  holds a label, not a paragraph — if it needs a sentence, the UI needs a
  clearer label instead.
- **Menu triggers follow the dropdown recipe above** — `Button
  variant="outline"` + trailing muted `ChevronDown`, `data-[popup-open]:
  bg-accent`. Never a gray `secondary` button: `secondary` is the quiet
  *in-content* action (a dialog's Cancel); `outline` is toolbar chrome
  (triggers, filters); `primary` is the one black CTA.
- **`Menu` / `MenuItem` / `MenuSeparator` / `MenuLabel`** — actions on an
  object (row actions, "…" menus, the account menu). Same surface as the
  dropdown recipe above. Destructive actions are `destructive`, sit **last**,
  below a separator. Shortcuts render as trailing muted hints (`⌘E`). A menu
  is for *actions*; picking a value is `Select`.
- **`Dialog` + `DialogClose`** — the centered `rounded-xl` modal over the
  `--overlay` scrim. **Every destructive or irreversible action confirms
  through a Dialog** — never a bare one-click delete. Structure is fixed:
  title (semibold, balanced) → optional description (muted) → optional body →
  right-aligned footer, Cancel (secondary) before the primary action. Modals
  scale from **center** (the one popover exception to origin-aware motion).
  If a "dialog" is becoming a multi-step form, it wants to be a page.
- **`ToastProvider` + `toast.success/error/message`** — outcome feedback for
  async operations ("Deal confirmed", "Couldn't save"). Mount the provider
  **once at the app root**; call the imperative helpers from anywhere. Stacks
  bottom-right (max 4), auto-dismisses, pauses on a hidden tab. Toasts are for
  *outcomes* — validation errors live at the field (`aria-describedby`), never
  in a toast. Title is sentence-case and short; the description carries the
  detail.
- **`Banner`** — a persistent, page-level status callout, and a **rare** one.
  Use it ONLY for state the user must know about that isn't tied to a single
  control: a disconnected/failed data source ("Amazon not connected"), sample
  vs. live data, an action that blocks the workflow ("Needs Ops pricing before
  sending"), account/billing state. **At most one per view.** Do NOT use it for
  transient outcomes (that's a `Toast`), field validation (inline at the field),
  contextual help (a tooltip or the description text), or tips/marketing (cut
  them). Meaning is carried by a **whisper tint of the hue** (`bg-verdict-*/[0.07]`)
  + a matching hairline border + a coloured icon (Geist/Polaris) — suffused, not
  a loud wash and never a left accent stripe (info stays neutral). If it's not
  something the user must act on or know, it doesn't earn a banner.
- **`ConfirmDialog`** — the ONLY sanctioned gate for a destructive/irreversible
  action; a delete never fires from a bare one-click button (accessibility
  rule). Cancel is focused by default (the safe choice); the confirm button
  takes an async `onConfirm` and shows a spinner (via `Button loading`) while it
  runs, then closes. Don't hand-roll a delete confirm per page.
- **Undo over confirm, where it's safe.** For a *reversible* destructive action,
  prefer optimistic delete + a `toast.message(..., { action: { label: "Undo" }})`
  (Linear's pattern) over a modal — it's faster and less interruptive. Reserve
  `ConfirmDialog` for the truly irreversible.
- **Loading is a skeleton, not a spinner** — for layout-shaped content (cards,
  tables, charts) use `Skeleton` / the components' `loading` prop so the page
  keeps its geometry. A spinner is only for a *button* (`Button loading`, which
  preserves width) or a tiny inline control — never a big blank card.
- **`Kbd`** for every shortcut hint (⌘K, ↵, Esc) — one chip treatment across the
  palette, menus, and tooltips; never ad-hoc styled keys.

Motion (from the motion-system skill, encoded in the components): popovers/
menus/tooltips are origin-aware and ~150ms; the modal is ~200ms from center;
exits are faster than entries; `motion-safe:` gates every transform so
reduced-motion keeps the fade and drops the movement.

## Components to reuse (don't hand-roll)

This is the registry — the canonical list of shared UI. **Before building any
control, scan this list; after building a new shared component, add it here**
(what it is · when to use it). If it's not here, it gets re-invented.

**When the system genuinely has nothing — building new.** If no shared component
fits and improving one won't either, you may build a new component. Three
non-negotiables: (1) **it joins the language, it doesn't start a dialect** — built
from the tokens, the `h-9` control rhythm, concentric radius, `shadow-card`
elevation, and every taste rule in this doc, so a stranger can't tell it wasn't in
the package; (2) **it earns its shape by simplifying** — a bespoke component is a
chance to do *better* than what it replaces: cut clutter, drop anything that
doesn't drive a decision, make it simpler for the user, not just fill the gap;
(3) **if the pattern recurs** across pages or OSes, promote it into the design
system and add it below — the second copy is the signal to extract, never to fork.

**From `@curvgroup/design-system` — always the first choice:**

- **Shell / layout**: `AppFrame` (the whole cradle — never rebuild it), `TopBar`,
  `Sidebar` / `SidebarSection` / `SidebarItem`, `PageContainer`, `PageHeader`.
- **Primitives**: `Button`, `Badge`, `Avatar` / `AvatarGroup`, `Card`, `Kbd`,
  `Skeleton`, `CopyButton`, `cn`.
- **Forms**: `Input`, `Textarea`, `Select`, `MultiSelect`, `Checkbox`,
  `Radio` / `RadioGroup`, `Switch`, `SegmentedControl`, `Field`, `DateRangePicker`.
- **Navigation**: `Tabs` (view-navigation underline bar — see *Page tabs*),
  `CommandPalette` (⌘K).
- **Overlays & feedback**: `Tooltip` / `TooltipProvider`, `Menu` / `MenuItem` /
  `MenuSeparator` / `MenuLabel`, `Dialog` / `DialogClose`, `ConfirmDialog` (the
  destructive-action gate), `Drawer` / `DrawerClose`, `Popover` / `PopoverClose`,
  `ToastProvider` + `toast`, `Banner` (page-level), `EmptyState` — see *Overlays
  & feedback* above.
- **Data & reporting**: `DataTable` (+ `TableLink`, `FilterButton` /
  `ActiveFilterBar`, CSV/PDF export), `SummaryStrip` (full-width breakdown above a
  table), `StatCard` / `StatGroup` / `BreakdownRow`, `Sparkline`, `LineChart`,
  `BarChart`, `BarBreakdown`, `ChartCard`, `ReportTable` (P&L / matrix grid),
  `KanbanBoard` / `KanbanColumn` / `KanbanCard`, `HScroll`.
- **Kits (own entries)**: `@curvgroup/design-system/home` (Home pieces,
  docs/home.md); `@curvgroup/design-system/morph` — `MorphStack`, a one-line
  "Sam and 4 others are waiting" summary that opens in place into its rows with
  inline actions (approvals waiting on you, a burst of same-type notifications,
  access requests). Use it instead of a count that sends people to another
  page (docs/morph.md).

**Already extracted (use the package — don't fork the old app-local copies):**
The pieces this section used to list now ship in the package — `date-range-picker`
→ **`DateRangePicker`**; the **Linear filter pattern** (`app/(app)/deals/deals-filter.tsx`)
→ **`FilterButton`** / **`ActiveFilterBar`** + `DataTable`'s `filters` prop; a
URL-driven value picker → **`MultiSelect`**. If something is genuinely still
missing, that's the "build new" path above.

Superseded (migrate on touch): in-app `components/ui/tooltip.tsx`,
`components/ui/select-menu.tsx`, and `components/ui/segmented-control.tsx` →
the package `Tooltip` / `Select` / `SegmentedControl`; shadcn `components/ui/*`
copies → the package equivalents as they ship.
