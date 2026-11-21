# Consuming the design system in a Curv OS

`@curvgroup/design-system` is vendored into each OS app at
`vendor/curv-design-system/`. This is the one-time
**setup** that makes an OS look and behave like the others, plus the checklist to
verify it's wired correctly. Getting this right up front prevents the whole class
of "wrong background / raw colours / hand-rolled shell / it looks broken" drift —
every one of those is a missed step below.

## Quick checklist

- [ ] The whole package vendored by `scripts/vendor.sh` (a `source.json` sits in `vendor/curv-design-system/`), and `package.json` depends on `file:vendor/curv-design-system`
- [ ] `theme.css` imported in the app's global stylesheet, unmodified (registers tokens **and** scans the built output)
- [ ] ESLint config imported (so the guards run — a `bg-neutral-100` must error)
- [ ] The app's own `cn()`, if it has one, extends tailwind-merge with `curvTailwindMergeConfig`
- [ ] Pages use `AppFrame` + `PageContainer` — **no hand-rolled shell**
- [ ] Only semantic tokens and the seven type sizes in `className` — no raw Tailwind palette / hex / `text-[Npx]`

## 1. Vendor the whole package (one script, one version)

Every app runs the same release, desktop and mobile. From a committed checkout
of this repo at the release you want:

```bash
npm run vendor -- /path/to/app        # = bash scripts/vendor.sh /path/to/app
cd /path/to/app && npm install         # package-lock.json picks up the version
git add vendor/curv-design-system package-lock.json
git commit -m "chore: vendor design system vX.Y.Z"
```

The script builds, then makes `<app>/vendor/curv-design-system/` exactly this
release: everything `package.json` `files` lists (`dist` with every entry —
desktop, mobile, home, morph — and their declaration chunks, `theme.css`,
`mobile.css`, `home.css`, `morph.css`, `eslint`, `skills`, `agents`, `docs`), a
`package.json` without scripts or devDependencies, and `source.json` (version,
the commit it was built from, sha256 of every vendored file). Whatever else was
in that folder goes, older `mobile-source.json` / `home-source.json` /
`morph-source.json` manifests included; the app's `node_modules/` and
`.gitignore` there stay. It refuses to run from a tree with uncommitted changes
(`source.json` names HEAD) and re-hashes what landed before it reports success.

The app depends on it as a local package:

```json
"@curvgroup/design-system": "file:vendor/curv-design-system"
```

**Never edit vendored files.** Change the design system here and re-vendor. To
check an app's copy has not drifted from its release:

```bash
bash scripts/vendor.sh --check /path/to/app   # exits 1 on an edited, added or missing file
```

`npm run vendor:mobile -- /path/to/app` (`scripts/vendor-payload.sh`) still
vendors the mobile entry alone and leaves the desktop entry at whatever version
the app had. Use it only for an app that has not moved to the whole package.

## 2. Import the theme (tokens **and** class scanning)

In your global stylesheet (e.g. `app/globals.css`), after Tailwind:

```css
@import "tailwindcss";
@import "@curvgroup/design-system/theme.css";
```

This one import does **two** things:

1. **Registers every token** — `bg-background`, `bg-card`, `bg-muted`,
   `text-foreground`, `border-border`, and the `verdict-*` / `chart-*` families.
   Without them those utilities don't exist, and you'll be tempted to reach for
   raw Tailwind colours (`bg-neutral-100`) — the drift.
2. **Points Tailwind at the design system's built output** — `theme.css` carries
   an `@source` for its own `dist/`, so the components' `className` utilities
   actually **generate**. (No separate `@source` line to add anymore.) Skip the
   theme import and the components render **unstyled** — the classic "why does it
   look broken?" symptom.

## 3. Wire the ESLint config (this is the enforcement)

```js
// eslint.config.js
import curv from "@curvgroup/design-system/eslint";

export default [
  ...curv,
  // …your app's framework rules (Next, React, import order)…
];
```

This is what catches raw palette colours (`bg-neutral-100`), raw hex, uppercase
labels, wide tracking and sizes off the type scale **in CI**, before they reach
a screen. **Without this step, none of the design-language guards run.**
Verify: drop `bg-neutral-100` into any file and run `npm run lint` — it must
error (`curv/no-palette-utility`).

Three presets, one rule set:

| Preset | Import | Severity |
| --- | --- | --- |
| default | `import curv from "@curvgroup/design-system/eslint"` | `no-uppercase-utility`, `no-raw-hex`, `no-palette-utility` error; the 0.5.0 rules `no-arbitrary-text-size` (`text-[13px]` → `text-body`) and `no-wide-tracking` warn |
| migration | `import { migration } from "@curvgroup/design-system/eslint"` | every rule warns — for an app still clearing the older rules |
| strict | `import { strict } from "@curvgroup/design-system/eslint"` | every rule errors — the target once the warnings are gone |

New rules always arrive as warnings in the default preset, so upgrading never
turns CI red; move to `strict` when `npm run lint` shows no `curv/` warnings.
Each warning names the fix (`"text-[12px]": use text-caption`).

**If the app has its own `cn()`** (a `lib/utils.ts` around tailwind-merge),
teach it the type tokens, or it drops `text-body` next to `text-foreground`:

```ts
import { extendTailwindMerge } from "tailwind-merge";
import { curvTailwindMergeConfig } from "@curvgroup/design-system";
const twMerge = extendTailwindMerge(curvTailwindMergeConfig);
```

Or import `cn` from the package.

## 4. Use the shell — never hand-roll it

```tsx
import {
  AppFrame, TopBar, Wordmark, Sidebar, SidebarSection, SidebarItem, SidebarToggle,
  PageContainer, PageToolbar,
} from "@curvgroup/design-system";

<AppFrame
  topBar={
    <TopBar
      logo={<Link href="/"><Wordmark name="sales" /></Link>}
      center={<><Search className="w-full" /><AskButton className="shrink-0" /></>}
      actions={<><Feedback /><Approvals /><NotificationBell … /><AccountMenu … /></>}
    />
  }
  sidebar={
    <Sidebar
      collapsed={rail}                                   // the app keeps it in a cookie
      renderLink={(props) => <Link {...props} />}        // client-side navigation
      footer={<SidebarToggle collapsed={rail} onCollapsedChange={setRail} />}
    >
      <SidebarSection>
        <SidebarItem icon={House} label="Home" href="/" active={path === "/"} />
        <SidebarItem icon={Waves} label="Flow" href="/flow">
          <SidebarItem icon={Inbox} label="Inbox" href="/flow/inbox" badge={unread} />
        </SidebarItem>
      </SidebarSection>
      {/* sections the viewer may see: permissions stay in the app */}
    </Sidebar>
  }
>
  <PageContainer>            {/* or <PageContainer bleed> for a full-width table */}
    <PageToolbar title="Creators" controls={…} actions={…} />
    …page content (mt-4)…
  </PageContainer>
</AppFrame>
```

`AppFrame` owns the content background (`bg-background`), the dark cradle, the
sticky bar, and the sidebar. **Do not** wrap pages in your own
`min-h-screen bg-neutral-100 px-6 py-8` div — that re-implements `PageContainer`
with the wrong colour, and is the exact bug that this doc exists to prevent. If
`AppFrame`/`PageContainer` *almost* fit, improve them **in the design system** —
don't fork a local shell.

## 5. Style through tokens only

`bg-card`, `text-muted-foreground`, `border-border`,
`verdict-{green,amber,red}`, `chart-1…5` — **never** a raw Tailwind palette
utility (`bg-neutral-100`, `text-slate-500`) or a hex value. Step 3 enforces it;
step 2 makes it possible. (See `design-system.md` → *Surface hierarchy* and
*Semantic color* for which token means what.)

## 6. Point Claude Code at the rules

The package ships the **docs and skills**, so once installed they live under
`node_modules/@curvgroup/design-system/`. Before building or changing UI, have
Claude Code:

1. **Read** `@curvgroup/design-system/docs/design-system.md` — the source of truth.
2. Use the **`curv-ui`** skill (taste, shared components, tokens, polish, a11y).
3. For a page **redesign/rebuild**, run **`redesign-brief` first** (decide what the
   page is *for* + a cut-list), then build with `curv-ui`, then run the
   **design-review** agent on the diff.

For a fast *"I need X → use component Y"* lookup, point it at
`@curvgroup/design-system/docs/cheatsheet.md` — a one-page API reference (use-when
+ key props for every export), the anti-"grep the `.d.ts`" doc.

## Updating an already-wired OS

Check out the release here, then re-vendor (step 1):

```bash
npm run vendor -- /path/to/app && (cd /path/to/app && npm install)
git -C /path/to/app add vendor/curv-design-system package-lock.json
git -C /path/to/app commit -m "chore: vendor design system vX.Y.Z"
```

Then tell Claude Code: *"the design system updated to vX.Y.Z — re-read its
`design-system.md` + the `curv-ui`/`redesign-brief` skills and apply the changes."*

**What updates automatically vs. what needs a code change:** improvements baked
into a component you already use apply on install (e.g. a `PageHeader` size
change). *Applying a new rule to a page you already built* — setting a new prop,
restoring a dropped element, moving tabs — is a code change Claude Code makes. The
library can ship a better `DataTable`; it can't decide *your* Name column should
be 300px wide.
