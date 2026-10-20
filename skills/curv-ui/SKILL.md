---
name: curv-ui
description: >-
  Read before building or editing ANY UI in a Curv OS app (Revenue OS, Product
  OS, Marketing OS, …). Carries the taste, the shared components, and the rules
  (tokens, concentric radius, polish, accessibility) so every OS looks and
  behaves like one product. Use whenever a task adds or changes a page, layout,
  table, card, nav, or any visual component.
---

# Building UI in a Curv OS

Consistency across our OS apps is **structural**, not something anyone re-decides
per screen. Before you write UI, you adopt the shared parts and the shared rules.
Skipping this is how apps drift apart — and how UI ends up merely "fine."

## Taste — the thing that actually separates good from fine

Taste is **trained, not innate**: the ability to see beyond "it works" to what
makes an interface feel right. You build it by studying great work, asking *why*
it feels good, and applying that relentlessly.

- **Unseen details compound.** Most of what makes UI feel premium is never
  consciously noticed — correct easing, concentric corners, optical alignment, a
  press that scales `0.97`. Individually invisible; in aggregate, unmistakable.
- **Beauty is leverage.** People choose tools on the *whole* experience, not the
  feature list. A crisp, considered interface is a real advantage — spend effort
  there.
- **Restraint is the default.** In a dense, power-user product, the tasteful move
  is usually *fewer* parts, not more. When unsure whether to add something,
  don't. When unsure whether to animate, don't.
- **Study the references before you build — every time.** The teams with the best
  taste have already solved most of this; don't reinvent it from a blank page.
  Before designing any component or flow, look at how they do it and ask *why* it
  feels good and *what pattern* makes it work — then borrow the reasoning, not the
  skin:
  - **Linear** — filtering, command menus, keyboard-first density, smooth
    micro-interactions. (Our filter UX is modelled on Linear's for a reason.)
  - **Vercel / Geist** — restraint, typography, spacing, elevation.
  - **Shopify Polaris** — dense admin surfaces, tables, data-heavy layouts.
  - **Apple HIG** — concentric corners, motion, optical detail.
  Then open the closest already-approved Curv screen (the showcase or the
  strongest revenue-os page) and match its structure, density, and rhythm. New UI
  should read as the same hand, not a new dialect.

## The bar — perfection is the spec

The standard is the Rams / Ive / Jobs standard: **"less, but better," carried
out until nothing feels arbitrary.** This is the acceptance criterion, not a
mood (the full doctrine is in `design-system.md` → *The bar*):

- **"Good enough" is a defect.** If a spacing, corner, alignment, or timing
  looks slightly off, it *is* off — fix it, never rationalize it.
- **Inconsistency is a bug, not a nitpick.** Two implementations of one pattern
  means one is wrong; treat it with the seriousness of a crash.
- **Paint the back of the fence.** Empty states, focus rings, disabled states,
  dark mode, reduced motion — the states nobody inspects must be as considered
  as the happy path, or the whole stops feeling inevitable.
- **Design is how it works.** Interaction correctness (focus, keyboard, no
  jitter) is held to the same bar as the pixels.
- **Review like a critic, not an author** — both themes, 100% zoom,
  keyboard-only, reduced-motion on. If it reads as a different hand, it goes
  back. Nothing ships at 90%.

Everything below is that taste written down as specific, checkable rules.

## The order of operations (do not skip step 1)

*First time wiring the design system into this OS? Do the one-time setup in
`docs/consuming-in-an-os.md` FIRST — theme import, Tailwind scan, the ESLint
config, the `AppFrame` shell. A missed step there is why an OS renders unstyled,
off-colour, or with a hand-rolled `bg-neutral-100` shell.*

0. **If this task is a redesign/rebuild of a page (not a tweak), run the
   `redesign-brief` skill FIRST.** Decide what the page is *for* — whose job it
   serves, what decisions it drives, what earns a place — *before* you touch
   layout. This skill is HOW it looks; `redesign-brief` is WHAT belongs there. A
   beautiful page of the wrong things is still the wrong page. (Skip straight to
   step 1 for a copy fix, a single-component swap, or a bug.)
1. **Read `docs/design-system.md` first.** It is the source of truth. Most UI
   mistakes are "wrote it before reading it." If the repo consumes
   `@curvgroup/design-system`, read that package's `docs/design-system.md`.
   **Execute this concretely**: grep the doc for every pattern you're about to
   touch (`Dropdown`, `tabs`, `toolbar`, `table`, `pill`, …) and read those
   sections in full — **the recipes live in the doc, not in this skill**, and
   "I read the skills" does not satisfy this step. (Case study: Batch 3's menu
   demo shipped a gray `secondary` trigger because this step was skipped — the
   outline-trigger recipe was sitting in the doc the whole time.)
2. **Reach for a shared component before hand-rolling.** The package exports a
   large, current set — the **showcase site is the live catalogue** and
   `docs/design-system.md` → *Components to reuse* is the full index. Grouped:
   - **Shell / layout:** `AppFrame` (the whole dark cradle + sticky bar + sidebar
     — never rebuild it), `TopBar`, `Sidebar`/`SidebarSection`/`SidebarItem`,
     `PageContainer` (`bleed`=full width), `PageHeader` (eyebrow + title + badge +
     an `actions` slot — it hosts controls, doesn't hardcode them), `Card`.
   - **Navigation:** `Tabs` (view-navigation — switching between distinct
     *views/sections* of a page, e.g. Overview / Inventory / Sales; **always the
     full-width bar at the very top of the content, under the app bar** — the
     page/entity header sits *below* it, inner width per tab follows its level,
     see design-system.md → *Page tabs*. A table's **status/row filter is NOT a
     page tab** — it stays in the table toolbar via the `DataTable` `tabs` prop),
     `SegmentedControl` (filter toggle *within* a view), `CommandPalette` (⌘K).
   - **Forms:** `Button` (has `loading`), `Input`, `Textarea`, `Select`,
     `MultiSelect`, `Checkbox`, `Radio`/`RadioGroup`, `Switch`, `Field`,
     `DateRangePicker`.
   - **Data display:** `DataTable` (+ filter bar, `TableLink`/`getRowHref` for
     real row links, CSV/PDF export, sticky columns, loading skeleton, opt-in
     row grouping via `groupBy` + `renderGroupHeader` — never hand-roll group
     rows). **Column
     widths follow the Linear model:** leave exactly ONE primary text column with
     no `width`/`maxWidth` (the filler — it stretches to fill and truncates down
     to `minWidth` when narrow), give every other column a fixed `width`, and
     render truncating text cells as inline/string content (a `<span>` Fragment,
     not a wrapping `<div>`) so `…` shows. Never hand-roll a table or the export
     button — use `DataTable` + `exportFilename`. (Full rules: `docs/cheatsheet.md`
     → *DataTable column widths*.) The
     **reporting engine** — `StatCard`/`StatGroup`, `Sparkline`, `LineChart`,
     `BarChart`, `BarBreakdown`, `ChartCard` (the shell that hosts chart
     controls; chart stays a dumb primitive), `ReportTable` (P&L/matrix grid),
     `SummaryStrip` (the full-width breakdown above a list — total + horizontal
     stats + proportional bar; never a corner card) —
     plus `KanbanBoard`/`KanbanColumn`/`KanbanCard`, `HScroll`, `Badge`,
     `Avatar`/`AvatarGroup`, `CopyButton`.
   - **Overlays & feedback:** `Tooltip`, `Menu`, `Dialog`, `ConfirmDialog`
     (the sanctioned gate for destructive actions), `Drawer` (right-side sheet),
     `Popover`, `ToastProvider` + `toast` (with an `action`/Undo), `Banner`
     (rare, page-level), `EmptyState`, `Skeleton`, `Kbd`. These carry the
     interaction layer (focus trap/restore, keyboard, ARIA, positioning) via
     base-ui — **never re-implement overlay behavior by hand**, never use the
     native `title` attribute or `<select>`.
   - `cn` — class merging.
   Charts cap the y-axis at **≤5 nice-number gridlines**; the chart is a dumb
   primitive and controls (metric dropdown, compare, period) compose *around* it
   via `ChartCard` + `Select`/`SegmentedControl`/`DateRangePicker`. **A chart-sized
   surface must be interactive** (hover → values) — if a trend only needs its
   shape at a glance, use a `Sparkline` at sparkline size beside the number, never
   a full static chart frame that can't be hovered.
   If a shared component *almost* fits, **improve the shared component** — don't
   fork a private copy. **If the system genuinely has nothing that fits, you may
   build a new component — but it joins the language, it doesn't start a dialect:**
   built from the tokens, the `h-9` rhythm, concentric radius, `shadow-card`, and
   the taste rules, so a stranger can't tell it wasn't in the package. Treat it as
   a chance to *simplify* — cut clutter, drop what doesn't drive a decision, make
   it easier for the user, not just fill the gap. If the pattern recurs, promote it
   into the design system (design-system.md → *Components to reuse*).
3. **Import the theme, never raw colours.** Style through tokens (`bg-card`,
   `text-muted-foreground`, `border-border`, the `verdict-*` / `chart-*`
   families), never hex.
4. **Run `npm run lint` and fix every error** — a red lint is a blocker.
5. **Ask the design-review agent to review the diff** for the taste-level things
   lint can't see (`agents/design-review.md`). This step is **not optional** and
   it applies to **showcase demos too** — a demo teaches its pattern to every
   consumer, so a demo that deviates from a doc recipe propagates the deviation.
   Verifying that something *works* (opens, clicks, keyboard) is not this step;
   this step checks that it *conforms*.

## Mechanical rules (lint enforces these)

- **No full uppercase.** No `uppercase`, no `tracking-wider`/`tracking-widest`.
  Labels are **sentence case** ("Gap to goal", not "GAP TO GOAL").
- **No raw hex in className.** Use tokens. (The single sanctioned exception is
  the top-bar chrome `bg-[#1b1b1b]`, which `AppFrame`/`TopBar` already own.)

## Radius — concentric, not fixed (a taste rule, review-enforced)

When a rounded element sits inside another with padding between them:

    outer radius = inner radius + padding

so the corners run parallel instead of one looking pinched inside the other.
Mismatched nested radii are one of the most common things that make UI feel off.

**Proportional to size + elevation** (as Apple/Vercel reason): bigger, more-raised
→ rounder; small + dense → crisp.

- Chips / small dense cards (kanban & list items): `rounded-md` (~8–10px), kept
  tight like Linear's board cards.
- Buttons / inputs / toolbar controls: `rounded-md` (~8–10px).
- Content cards / panels / tables: `rounded-lg` (12px) — **the anchor** (matches
  Polaris cards + Geist medium/menu/modal; between Linear's 8px and iOS's 16px).
- Large floating surfaces (modals, boards, hero): `rounded-xl` (~16px).
- **Derive nested corners:** a `rounded-lg` (12px) child in a card with `p-2`
  (8px) → the card is `rounded-[20px]` (12 + 8). A child is **never** rounder
  than its parent. Above ~24px padding, treat layers as separate and pick each
  on its own.

(This replaced the old blunt "always `rounded-lg`, never `rounded-xl`" lint rule.
Concentricity can't be linted, so review owns it.)

## Polish details (the unseen correctness)

- **Fixed control heights — never padding-derived.** Every control in a
  toolbar/filter row gets an *explicit* height so the row aligns by rule, not by
  luck. The main toolbar height is **`h-9` (36px)** — search inputs, filter
  buttons, triggers, primary buttons all sit at `h-9`. A control whose height
  comes from `py-*` + text is the classic source of 1–2px misalignment; set the
  height, put padding inside it. (Dense in-table controls may drop to h-7/h-8.)
- **Numbers get `tabular-nums`** wherever digits align in columns or update in
  place (KPIs, tables, counters) so they don't jitter.
- **Optical alignment over geometric.** Icon + text buttons: the icon side gets
  ~2px less padding (`pl-4 pr-3.5`). Triangular/asymmetric glyphs (play, carets)
  shift ~1–2px toward their visual centre — fix it in the SVG when you can.
- **Elevation via shadow, not border.** Raised cards/containers use `shadow-card`
  (a hairline-as-shadow + soft drops), which adapts to any background. **But**
  dividers and layout separators (`border-t`, table cell lines, input outlines)
  stay real borders — the shadow rule is for *depth*, not separation.
- **Covering surfaces are full-bleed — verify box == region, at the edges.** Any
  element whose job is to **mask / back / overlay** a region (a sticky column's
  opaque cell, a header or toolbar background, a modal scrim, an edge-fade) must
  span the *entire* region it covers. Confirm its computed box equals the region
  on all four edges — never spot-check the centre (a too-short mask still hits
  the middle, giving a false pass; content behind then peeks at the uncovered
  edge). Two traps that caused real bugs here: grid `items-center` sizes a cell
  to its *content* height, not the row height, so a masking cell ends up shorter
  than its row (`self-stretch` to fill it); and fixed grid tracks can overflow a
  `min-width` container, so a header background stops before the last column
  (`min-w-max` so it spans every track). When you verify a cover, probe its
  corners.
- **`text-wrap: balance`** on headings, **`pretty`** on body — no orphans, no
  lonely last words.
- **Minimum hit area** ~40×40px on desktop controls (44 for touch); extend a
  small visible control's target with an `::after` pseudo-element rather than
  padding that distorts layout.
- **Image outlines** are a neutral `outline-black/10` (light) / `outline-white/10`
  (dark) with `-outline-offset-1` — never a tinted `zinc/slate` scale, which
  reads as dirt on the edge.
- **Squares use `size-*`** (`size-9`, not `h-9 w-9`) so width and height can never
  drift apart.
- **Full-height is `h-dvh`, not `h-screen`** — the dynamic viewport unit accounts
  for mobile browser chrome. Pad fixed / bottom-anchored elements with
  `env(safe-area-inset-*)` so they clear the notch and home indicator.
- **One z-index scale.** Layer through a small fixed set (dropdown → sticky →
  overlay → modal → toast), never ad-hoc `z-[9999]`.
- **Enable font smoothing** on the app body (`-webkit-font-smoothing: antialiased`).

## Accessibility (baseline, always — never a follow-up)

- Every control has an **accessible name**: icon-only buttons get `aria-label`;
  form fields get associated `<label>`s.
- **Keyboard-reachable with a visible focus ring.** Don't remove `:focus-visible`;
  don't build click-only controls.
- **Dialogs/menus** trap focus while open and restore it to the trigger on close.
- **Native semantics first** — a real `<button>`/`<a>`/`<input>` over a `div`
  with ARIA bolted on.
- **Form errors** are programmatically tied (`aria-describedby`, `aria-invalid`),
  not colour-only.
- **Destructive / irreversible actions confirm** — a delete goes through a confirm
  dialog (an alert dialog), never a bare one-click button.
- **Never block paste.** Don't disable paste on inputs (emails, codes, passwords);
  it breaks password managers and is user-hostile.
- Respect **`prefers-reduced-motion`** (see motion-system): keep opacity/colour,
  drop movement — reduced, not zero.

## Distill — subtract before you ship

The tasteful default is *less*. Before a screen is done, run a subtraction pass —
remove until it breaks, then add the one thing back:

> **Subtract noise, not signal.** The subtraction pass removes what drives no
> decision — never information the user came for. Don't trade a purpose-built,
> information-rich element (a value-by-status breakdown, a distribution) for a
> generic one to satisfy consistency; rebuild it with the reporting primitives
> instead. Consistency serves the page's job; it doesn't outrank it.

- **Halve the copy.** Cut labels and helper text to the shortest that still reads.
  A control that says what it does needs no paragraph under it.
- **Flatten nesting. Never nest a card in a card.** Related stats are **sections of
  one card** (`border-t` / `divide-x`), not a field of boxes. A third nesting level
  is a smell — stop.
- **Cut variants.** Every option is a decision every consumer must make and every
  future change must carry. Ship the one right default, not five.
- **One accent per view.** Semantic colour (verdict green/amber/red) is separate
  and doesn't count. If two things compete for "look here", one loses.
- **Remove decorative chrome.** Drop borders/shadows/dividers that aren't doing a
  job — if `shadow-card` already conveys the surface, the border is noise.
- **Progressive disclosure.** Hide advanced or rare controls behind a menu or a
  reveal; the common path stays clean.
- **One control row.** Filters/toolbar controls share one height (`h-9`) and one
  shape (`rounded-md border border-border bg-card`); Export sits rightmost.

When unsure whether something earns its place, remove it and see if anyone misses it.

## Motion

Defer to the **`motion-system`** skill for anything animated — the decision
framework (should it animate at all?), easing curves, sub-300ms durations,
`scale(0.97)` press feedback, origin-aware popovers, springs, and reduced-motion.
