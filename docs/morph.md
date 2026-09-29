# Morph kit

`MorphStack` is a one-line summary over a stack of faces ("Sam and 4 others are waiting") that opens in place into the list it summarises. The faces travel from the stack into their rows, each row carries its own actions, and a row that leaves slides out while the rest close up. Closing reverses it. Use it where a count used to send people to another page: approvals waiting on you, a burst of same-type notifications, access requests.

```tsx
import { MorphStack, MorphStackButton, MorphStackInput, type MorphStackItem } from "@curvgroup/design-system/morph";
```

```css
/* app/globals.css, after Tailwind */
@import "@curvgroup/design-system/morph.css";
```

## Props

- `items: MorphStackItem[]` holds `id`, `label` (also the initials), `avatarUrl`, `initials`, `meta` (same line, muted), `aside` (right-aligned, `asideTone: "hot"` for red), `actions` (your controls), and `href` + `onOpen` to make a row a link.
- `summary` is the collapsed line. Use `<strong>` for the lead and `.morph-muted` / `.morph-hot` spans.
- `title`, `count` (defaults to `items.length`; `null` hides it) and `headerAction` (e.g. a "View all" link) sit in the open header.
- `tone`:
  - `dark` is a floating notice.
  - `island` sits in the dark top bar.
  - `light` is a card.
  - `row` is a row inside a list such as a notifications popover.
- `anchor` (`start | center | end`) is the edge that stays put while the width changes. `overlay` floats the open panel instead of pushing the page down; it is on for every tone but `row`.
- `open` / `defaultOpen` / `onOpenChange`, `onDismiss` (adds × to the line and the header), `clearedLabel` (shown when the list empties; without it the component renders nothing), `maxVisibleRows` (default 6, then the list scrolls), and `linkAs` (e.g. `next/link`).
- `MorphStackButton` (`variant: primary | secondary | ghost`) and `MorphStackInput` (e.g. a decline reason) match the tone.

Remove an item from `items` to act on it; the row animates out. Removing the last one closes the panel and shows `clearedLabel`.

## Motion

280ms open, 200ms close, 180ms row exit, ease-out `cubic-bezier(0.22, 1, 0.36, 1)`, no bounce, 18ms stagger between faces. The morph is a FLIP on the Web Animations API in the component, so the kit needs no motion library. The row exit and the content fade are CSS in `morph.css`. Under `prefers-reduced-motion`, and in a hidden tab, nothing moves: the panel swaps and the content fades.

## Accessibility

The collapsed line is a real `<button>` with `aria-expanded`. Opening moves focus to the header's collapse button, and closing returns it. Esc closes. The panel is a `region` labelled by its title. Faces are `aria-hidden`; the label carries the name.

## Vendoring into an app

The entry stands alone. It imports React only and never touches `dist/index.js`, the mobile files or the home kit. Copy these into `vendor/curv-design-system/`:

```
dist/morph.js  dist/morph.d.ts  morph.css
```

Then add the `"./morph"` and `"./morph.css"` entries to the vendored `package.json` exports, and record the source commit and sha256s in `morph-source.json` (same shape as `home-source.json`). Leave `dist/index.js` alone.
