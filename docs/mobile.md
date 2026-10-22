# Curv mobile playbook

How every Curv OS works on a phone. Product OS was the first full pass (October 2026, design canvas "Product OS Mobile"); the rules below are what that work, Shopify's admin app and Asana's board taught us. Follow them for any OS and the phone layer is mostly assembly.

This is the mobile extension of the existing design system, not a separate theme or data layer. Desktop styling and reporting semantics stay with their existing components.

## Adoption

Import components from `@curvgroup/design-system/mobile` and import `@curvgroup/design-system/mobile.css` once after existing application styles. Consume a pinned build of this source; do not copy components into app folders. The `curv-mobile` skill in this package points agents here.

The mobile entry is a client module (it ships with `"use client"`), so the top bar and tab bar can be mounted from a layout. Navigation components take `renderLink(item, props)` and content components take `renderLink(props)`; both prop objects carry `href`, so one adapter body serves both: spread the props onto the app's router link (`<Link {...props} />`), including `aria-current`.

## The rules

### 1. Every screen earns its place, or it goes

A phone does a few jobs well. Before building, write the cut list:

- **Merge** screens that answer the same question (a hub's Home and Board become one screen; a bell, header approvals and a module inbox become one Inbox; a Family page becomes a section header in its list; a SKU page becomes a sheet over its Line).
- **Delete** what the phone does not need: tab strips, filter rows, group-by toggles, per-page search boxes (one search lives in the bar), export, bulk checkboxes, destructive buttons next to status.
- **Keep** every route and URL. Deleting from the phone never deletes from desktop, and links from Slack or email must still open.

Count it. Product OS went from 12 screens and 27 tabs to 5 screens and no tabs for its two main jobs.

### 2. The phone does the work, not just shows it

A phone layer is the mobile version of the work, not a read-only report. Wherever people act on a record on desktop, the phone offers the same everyday actions in place: move a project to another stage, mark a milestone or action item done, change an owner or a date, post an update with an @mention, add a sample photo, approve, reply, request a SKU. Writes reuse the desktop's server actions and permission checks, never a phone-only path. A change to a record's status asks for confirmation; everything else saves directly and shows a visible success or failure. Only rare, bulk or destructive operations (exports, bulk edits, deleting a record) stay on desktop.

### 3. Real data, same sources

Mockups and builds use the OS's real records, photos and numbers. A phone layer binds the same loaders the desktop page uses; it never recalculates a metric, and a failed or capped read shows `MobileNotice`, never a zero. Every figure says its period ("Revenue, last 30 days").

### 4. One quiet black header

`MobileTopBar`: the fixed black top bar holds the page title and at most one trailing control (for example the List | Board toggle). Nothing else: no stats line, no bell, no menu button.

- **The title is the switcher.** A hub with several pages shows its own name, `Development ⌄` or `Products ⌄`, on every one of those pages; tapping it lists the hub's pages with the current one marked. Each page keeps its own route. This replaces tab strips on phones. A page with no phone layout yet is left out of the switcher and dimmed in the menu (rule 6) instead of opening a desktop screen inside the phone frame.
- **Records** show a back chevron only. The record's own title sits at the top of the content.
- Content sits on a sheet with 18px rounded top corners over the black bar.

### 5. One bar, always in the same place

`MobileTabBar` is a floating glass bar 24px above the bottom safe area, with 12px gutters:

- **Search** is its own 62px circle on the left.
- **The pill** holds at most five icon-only destinations: Home, up to two core jobs, Inbox, Menu. A sixth would shrink targets below 44px at 360px wide, so the component keeps five and warns in development about the rest; everything else lives in the menu. Labels live in `aria-label`. The active item gets a soft bubble and a heavier icon. Inbox carries the unread badge. Notifications live in Inbox; there is no bell.
- **Records swap the pill** for the one thing that page is for: a composer ("Add an update") with a camera button on a project, "Request a SKU" on a product, "Reply" and "Done" on an inbox item. The left circle becomes the hub's icon and goes back.
- **Search mode** turns the pill into the search field, down where the thumb is, with a close circle.
- **Sheets cover the bar.** The sheet's one primary button does the work; the close control and Escape dismiss it.
- **Scrolling down** shrinks the bar to the current hub and Search; scrolling up or a tap restores it. **The keyboard** hides it.
- Glass is a web treatment (backdrop blur), not the iOS API. Reduced transparency, increased contrast and forced colors get the solid surface.

### 6. The menu shows everything, dims what the phone can't do

`MobileMenu` is full screen and dark, opened from the bar. Large rows with icons, groups that expand (`Products ⌄` → Catalog, Reviews, SKU requests), the unread count on Inbox. Areas with no phone layout stay in the list **dimmed and not tappable** rather than hidden, so people know they exist. The account pill (avatar, OS name, switch OS) and the close button sit at the bottom, within thumb reach.

### 7. Lists are flat and one line deep

`MobileFlatList` + `MobileListRow`, modelled on Shopify's product list:

- A 48px thumbnail with a hairline border (a neutral placeholder when there is no photo), the name (may wrap to two lines), **one** meta line, **one** status pill on the right.
- Problems are written **inside the meta line** with `MobileException` ("0 sellable" in red; `tone="warning"` for amber, such as short cover), not as extra badges. Everything that is not a problem stays plain grey.
- Status pills (`MobileStatusPill`, which rows also use) speak the record's own vocabulary (Healthy, Low stock, Overstock, Launching) with fixed tones: positive, critical, warning (amber, e.g. At risk), info, special, neutral. One word means one tone everywhere: "At risk" is the amber warning pill in lists, on boards and on the record header alike.
- Hairlines inset to the text, no cards around rows. About eight rows fit on a phone screen.
- Every list on a phone uses the same header: `MobileListToolbar` (round Sort and Filter, an optional `action` such as "New project", and an in-list filter field only for long lists people narrow in place, like a catalog; never a second global search), then `MobileViewChips` for saved views as plain text chips with counts. No extra summary or clear rows: Reset lives in the filter sheet. Filter sheets follow one recipe: choices apply as they are tapped and the sheet ends with one "Show N" button.

### 8. Inbox rows are one line; tap opens, swipe acts

Project or record name and time on the first line, the first line of the real message in grey on the second, cut off by the layout. An unread dot. `MobileSwipeRow` reveals at most two actions (Reply, Done); every swipe action is also reachable without swiping (a button in the opened item and an accessible actions menu). Approvals are a single row with an inline Approve button. Tapping opens the full item: the record it belongs to at the top, the full message, recent history, and Reply / Done in the bar.

### 9. Details: pages for primary records, sheets for secondary ones

A primary record (a project, a product Line) is one long page with sections, never a tab strip. A secondary record reached from it (a SKU from its Line) opens as `MobileSheet` over the page. Section order on a product page: photos you can swipe (`MobileGallery`), sales history, money for the period, unit cost (FOB, last paid, landed), factory and open POs, then children. Key figures use `MobileKeyValueList`; the period is in the section header.

### 10. Home: the story, then what needs you

The landing screen (`/` on a phone) continues the black header into `MobileHeroPanel`: KPI chips that select the series, one chart with its comparison as a dashed line, and at most two dark buttons. Below it, `MobileActivityCards` ("Here's what needs you": counts that are jobs, each a link), then one insight card that names a real record. The desktop KPI wall stays on desktop.

### 11. Boards: one column at a time, and a List | Board toggle

`MobileStageBoard`, modelled on Asana's phone board: one column at full width with the next one peeking 50px from the right, scroll-snap between columns, stage chips with counts to jump. Cards are small: a cover photo only when one exists, title, owner avatar, date (red when late), a health badge only when not on track. Long-press lifts a card to move it; every card also has a "Move to…" action that opens a sheet of columns, and a move that changes a record's status asks for confirmation. A hub that has a board offers `MobileViewToggle` (List | Board) in the top bar. Both views share the stage chips and keep the person's place when switching; the choice lives in the URL.

## Fit and finish

- Design at 390 × 844 and check at 402 × 874 (iPhone Pro size) and 440 × 956 (Pro Max). Respect the top and bottom safe areas; nothing interactive in the rounded corners.
- Touch targets at least 44px. Body text 15–17px, titles 22–24px, Inter, tabular numbers for figures. Use the components' own buttons and sheets rather than per-site size overrides.
- Phone surfaces are light in both themes and carry their own ink until the package ships a complete dark mobile palette. Do not remap `--curv-mobile-*` tokens to an app's dark tokens.
- Text contrast 4.5:1, including grey meta lines and text on glass.
- Every icon-only control has an `aria-label`. Swipe and long-press always have a button equivalent.
- Offline and restored states come from the bar; no service worker, no cached business data, no queued writes. A restored connection is not proof of a refresh.
- No shared mobile component fetches data or grants access. Apps pass permission-filtered destinations.

## Checklist for an OS

1. Screenshot today's phone screens at 390px (signed in, real data).
2. List the two or three jobs people do on a phone. They become the bar.
3. Write the cut list (merge, delete, keep) and count screens and tabs before and after.
4. Mock it with real data, then build from this package's components only.
5. Run the design-review agent, then check on an iPhone-size viewport.

## Components

| Component | Use |
| --- | --- |
| `MobileTopBar` | Black header: title switcher, back, one trailing control |
| `MobileSurface` | The content sheet under the top bar: rounded top, room for the tab bar |
| `MobileTabBar` | The glass bar: search circle, icon pill, record actions, search mode, shrink on scroll |
| `MobileMenu`, `MobileMenuBody` | Full-screen dark menu: groups, dimmed rows, account and close at the bottom (the body without the dialog, for tests and embedding) |
| `MobileViewToggle` | List / Board switch for the top bar |
| `MobileFlatList`, `MobileListSection`, `MobileListRow`, `MobileException` | Flat lists with thumbnail, one meta line, one status pill; section headings; red problem text inside the meta line |
| `MobileStatusPill` | The status pill on its own, for record headers and sheets |
| `MobileListToolbar`, `MobileViewChips` | Sort, filter, one action, an optional in-list filter field; saved views |
| `MobileMoveSheet` | "Move to…" stage picker shared by boards, rows and record actions |
| `MobileChartCard` | White card with a section heading around a light chart |
| `MobileSwipeRow` | Up to two swipe actions with accessible equivalents |
| `MobileActivityCards` | Horizontal count cards that link to work |
| `MobileHeroPanel`, `MobileHeroAction` | Dark Home panel: KPI chips, one chart, up to two dark buttons |
| `MobileStageBoard` | One-column board with peek, stage chips and move |
| `MobileKeyValueList` | Settings-style figures with sub-lines |
| `MobileGallery` | Swipeable photos with pager and thumbnails |
| `MobileSheet`, `MobileSearchSurface`, `MobileNotice`, `MobileChart` | Existing: sheets, search, visible failures, charts |
| `MobileBottomNav`, `MobileMoreMenu`, `MobileHeader` | Earlier dock, More sheet and header; kept for OSes not yet moved |

## Glass navigation

The bar uses a restrained translucent surface with native CSS backdrop blur. This is a web treatment, not the iOS Liquid Glass API. Content cards, forms, sheets and financial figures remain opaque. Browsers without backdrop-filter receive the solid surface; reduced transparency, increased contrast and forced colors disable the effect. No animated filters or additional rendering dependencies.
