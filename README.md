# @curvgroup/design-system

The shared design system for every **Curv OS** app (Revenue OS, Product OS, Marketing OS, …). One source of truth for how they all look and behave, so consistency is **structural** — not something anyone has to enforce by hand.

It ships three things together:

1. **Theme tokens** (`theme.css`) — the colors, elevation, radii, type scale and verdict/chart vocabulary, in light + dark. Import this and every app shares an identical visual language.
2. **Components** (`@curvgroup/design-system`) — the actual reusable UI: `Card` today; `DataTable`, `Tabs`, `PageNav`, headings, filters next. Apps *use* these instead of hand-rolling their own.
3. **Skills & docs** (`skills/`, `docs/`) — the *rules* that carry taste: `docs/design-system.md` (the north star) and the `motion-system` Claude Code skill. These guide how anyone (human or agent) builds and extends any OS.

> Parts + rules together. The component library makes everyone use the same parts; the skills make everyone build with the same taste.

---

## Consuming it in an OS app

**1. Install** (resolves from GitHub Packages — see `.npmrc`):

```bash
npm install @curvgroup/design-system
```

**2. Import the theme** in your app's global stylesheet, *after* Tailwind, and tell Tailwind v4 to scan the package for classes:

```css
/* app/globals.css */
@import "tailwindcss";
@import "@curvgroup/design-system/theme.css";
@source "../node_modules/@curvgroup/design-system/dist";
```

**3. Use the components:**

```tsx
import { Card, cn } from "@curvgroup/design-system";

export function Example() {
  return <Card className="p-5">Same card, every OS.</Card>;
}
```

That's it — colors, dark mode, elevation and radii now match Revenue OS exactly, and the components are the same ones.

---

## Home kit

One shared set of Home page pieces for every OS: `CountText`, `MonthClock`, `HomePanel`, `PanelLink`, `HomePanelNote`, the row classes and the dark pulse surface. Full reference and tokens: [`docs/home.md`](docs/home.md).

```tsx
import { MonthClock, HomePanel, PanelLink, HOME_FEED_ROW } from "@curvgroup/design-system/home";
```

```css
@import "@curvgroup/design-system/home.css";
```

It stands alone like the mobile entry. React is its only import, it uses no Tailwind classes, and colors come from the app's existing tokens with fallbacks. To vendor it, copy these into `vendor/curv-design-system/`:

```
dist/home.js  dist/home.d.ts  dist/home-client.js  dist/home-client.d.ts  home.css
```

Then add the `"./home"` and `"./home.css"` entries to the vendored `package.json` exports. Leave `dist/index.js` alone.

---

## Staying up to date (how changes propagate)

The package is **versioned**. When a component or token changes here and a new version is published, **Renovate** (configured in each OS repo) automatically opens a "bump `@curvgroup/design-system`" PR in every app. CI runs; you merge.

- **Non-breaking** changes (restyles, tweaks) → safe to **auto-merge**. Effectively automatic.
- **Breaking** changes → a **major** version bump; the PR waits for a human so one change can't silently break every app at once.

You never hand-copy anything between repos. Change it once here, and it flows out.

---

## Adding a component

1. Build it in `src/components/`, using `cn()` and the shared tokens (never raw hex).
2. Export it from `src/index.ts`.
3. Add it to the **enforcement registry** so `eslint-config-curv` starts flagging hand-rolled copies of it in the apps (the rule only fires for components that exist here — see the design-review setup).
4. Document it (Storybook + a line in `docs/design-system.md`).
5. Publish a new version → the apps get their update PRs.

The rule of thumb: if you need a variant a shared component doesn't support, **improve the shared component** — don't fork it in an app.

---

## Enforcement — how deviations get caught, not hoped away

Consistency can't rely on everyone remembering the rules. Four layers, strongest
first:

1. **Components** — if it's `AppFrame` / `Sidebar` / `Card`, deviation is
   structurally impossible. Consuming apps never rebuild a cradle or a sidebar,
   so that whole class of mistake disappears.
2. **`@curvgroup/design-system/eslint`** — mechanical, deterministic, fails CI.
   Bans `uppercase` / `tracking-wider`, `rounded-xl`+ (too round), and raw hex in
   `className`. Wire it into an app's `eslint.config.js`:
   ```js
   import curv from "@curvgroup/design-system/eslint";
   export default [ ...curv /*, your app rules */ ];
   ```
3. **`skills/curv-ui`** — a Claude Code skill that forces "read `design-system.md`
   first, use the shared components" *before* any UI is written.
4. **`agents/design-review`** — a review agent for the taste-level things lint
   can't see: clutter, weak hierarchy, hand-rolled copies of shared components.

Layers 1–2 are machine-enforced; 3–4 keep humans and agents honest.

## What lives here

```
theme.css                  shared Tailwind v4 tokens (light + dark)
home.css                   the Home kit's pulse surface, panels and month clock (docs/home.md)
src/                       components + the cn() helper
site/                      the "OS Design System" showcase (npm run dev → :6006)
eslint/                    the shared ESLint config + design-language plugin
skills/curv-ui/            Claude Code skill: read-first + use-the-components
skills/motion-system/      Claude Code skill: motion & interaction rules
.claude/skills/            symlinks → skills/ so Claude Code auto-loads them here
agents/design-review.md    the design-review agent
docs/design-system.md      the north star — read before building UI
```

Owned by design (Jilles); consumed by every OS team.
