# Home kit

One implementation of the Home page pieces every Curv OS shares, so Curv OS, Sales OS, Customs OS, Finance OS and Product OS stop carrying hand copies. Ported from the Sales OS home (round 5) and its Curv OS port.

```tsx
import { CountText, MonthClock, HomePanel, PanelLink, HomePanelNote, HOME_ROW, HOME_FEED_ROW, HOME_ROW_HOVER, HOME_CHIP, HOME_ROW_ICON } from "@curvgroup/design-system/home";
```

```css
/* app/globals.css, beside the mobile import */
@import "@curvgroup/design-system/home.css";
```

## What is in it

- `CountText` counts up once on entrance (0.8s, ease `[0.16, 1, 0.3, 1]`) and tweens to later values instead of swapping. The server renders the final value. The tween is a small `requestAnimationFrame` loop that writes the DOM directly. It does nothing under `prefers-reduced-motion` or in a hidden tab. `from={null}` skips the entrance and still tweens later changes. Pass a module-level `format`.
- `MonthClock` renders "September  Day 27 of 30" and one hairline segment per day. Past days are ink, today is taller and breathes, and days to come are faint. The segments lift toward the pointer on a Gaussian (rise 1.15, spread 2.4), with a date tooltip. The strip hides under 640px.
- `HomePanel` has a 16px heading, an optional `count` chip (0 shows, null hides), muted `meta`, a `right` slot and one-line rows. `feed` puts a hairline under the heading. `entrance` (default on) plus `delayMs` stagger the CSS entrance.
- `PanelLink` is a quiet link with a chevron. Pass `as={Link}` for next/link.
- `HomePanelNote` shows an empty, signed-out or unavailable state, with an optional `action`. `ruled` adds a hairline and room for panels built from `HOME_ROW`.
- Row classes:
  - `HOME_ROW` is full width with a hairline above, for tables.
  - `HOME_FEED_ROW` is inset with no hairline, for feeds.
  - `HOME_ROW_HOVER` adds the wash and focus ring to a linked row.
  - `HOME_CHIP` is a neutral label chip.
  - `HOME_ROW_ICON` is a 28px icon square.
- `home.css` holds the pulse surface and its pieces: `home-pulse-surface`, `home-score`, `home-score-gradient`, `home-bar-gain`, `home-bar-booked`, `home-ghost-col`, `home-needed-line`, `home-progress-fill` and `home-tile`. It also holds the entrances (`home-enter-up`, `home-enter-rise`, `home-enter-sweep`), the `home-breathe` loop and the reduced-motion overrides.

The panel pieces and row classes are hook-free and render in server components. `CountText` and `MonthClock` ship in `dist/home-client.js` with `"use client"`. `dist/home.js` re-exports them, so one import works from a server page or a client component.

## Vendoring into an app

The entry stands alone. It imports React and its own client half, never `dist/index.js` or the mobile files, so vendoring it changes no desktop or mobile surface. Copy these built files into `vendor/curv-design-system/`:

```
dist/home.js
dist/home.d.ts
dist/home-client.js
dist/home-client.d.ts
home.css
```

Then add the two export entries to the vendored `package.json`. Edit it; don't replace it, because the vendored version and dependencies differ per app:

```json
"./home": { "types": "./dist/home.d.ts", "import": "./dist/home.js", "default": "./dist/home.js" },
"./home.css": "./home.css"
```

The app's own `home-*` rules can stay while pages move over. Both are unlayered, and the app's rules come later, so they win until they are deleted.

## Tokens

Nothing is required. Every color resolves from tokens the app already has. Set a public `--home-*` variable only to override.

The pulse tokens are fixed in both themes. They are declared on `:where(:root)`, so any app `:root` rule wins:

| Variable | Default |
| --- | --- |
| `--home-signal` | `#ff6b4a` (coral: progress toward goal) |
| `--home-signal-soft` | `#ff8a6b` |
| `--home-signal-ink` | `#ff3a0e` (signal on a light canvas; the hovered day) |
| `--home-pulse-ink`, `--home-pulse-line`, `--home-pulse-track`, `--home-pulse-tooltip` | `#fff`, `rgba(255,255,255,.07)`, `#212227`, `#2a2b31` |

The panel and clock tokens follow the theme. Each one resolves on the element, so it follows whichever theme scope it sits in. The chain tries the design-system name first, then the Sales OS ink scale:

| Variable | Falls back to |
| --- | --- |
| `--home-ink` | `--foreground` → `--ink` → `#1b1b1b` |
| `--home-ink-muted` | `--muted-foreground` → `--ink-3` → `#6b6b6f` |
| `--home-ink-secondary` (past days, chips) | `--text-2` → `--ink-2` → `#6b6b6f` |
| `--home-surface` | `--card` → `--surface` → `#fff` |
| `--home-line` | `--border` → `rgba(27,27,27,.08)` |
| `--home-chip-bg` | `--surface-2` → `--muted` → `#f3f3f4` |
| `--home-hover` | `--accent` → `rgba(27,27,27,.05)` |
| `--home-ring` | `--ring` → `rgba(27,27,27,.2)` |
| `--home-day-future` | `--app-strong` → `--border` |

The shape tokens default to the design system:

| Variable | Default |
| --- | --- |
| `--home-panel-radius` | `--radius` → `12px` (small radii are `--radius` × 0.8) |
| `--home-panel-border-width` | `1px` (also the row and chip hairline) |
| `--home-panel-shadow` | `--shadow-card` → `none` |
| `--home-strong-weight` | `500` (titles, month name, count, chips, tooltip) |
| `--home-sweep-duration` | `400ms` |

### Per-app settings

- **Curv OS** needs nothing. Its tokens use the design-system names, and its `--home-signal`/`--home-pulse-*` tokens are the same names and values, so they can be deleted. Set `--home-sweep-duration: 600ms` to keep the slower year track.
- **Sales OS** sets `--home-panel-radius: 16px; --home-panel-border-width: 0.5px; --home-panel-shadow: none; --home-strong-weight: 600;`. Its `--home-line` is picked up as-is. For its exact row hover, add `--home-hover: color-mix(in srgb, var(--surface-2) 60%, transparent)`. `CountText` counts up on entrance by default; pass `from={null}` where the scoreboard should only tween on change.
- **Customs, Finance, Product OS** need nothing if they use the design-system token names.
