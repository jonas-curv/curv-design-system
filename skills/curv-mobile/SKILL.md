---
name: curv-mobile
description: >-
  Read before building or changing ANY phone layout in a Curv OS (anything
  under the mobile breakpoint: the bottom bar, the menu, a hub's phone screen,
  a record's phone layer, Inbox, Home on a phone). Carries the mobile playbook:
  cut list first, one quiet black header with a title switcher, one glass bar,
  flat one-line lists, sheets for secondary records, one-column boards with a
  List | Board toggle, and the components that implement them.
---

# Building a phone layout in a Curv OS

Read `docs/mobile.md` in `@curvgroup/design-system` in full before placing a component. It is short. The rules there override older desktop-first habits at the mobile breakpoint.

Then, in order:

1. **Cut list first.** Write what you merge, delete from the phone and keep, with screen and tab counts before and after. Every route keeps working; deleting from the phone never deletes from desktop.
2. **Bind real data.** Use the loaders the desktop page already uses. Never recalculate a metric in the phone layer. A failed or capped read shows `MobileNotice`, never a zero. Say the period on every figure.
3. **Assemble from `@curvgroup/design-system/mobile`.** `MobileTopBar` (+ `MobileTopBarTextAction`), `MobileTabBar`, `MobileMenu`, `MobileFlatList`/`MobileListRow`, `MobileViewChips` (+ `MobileToolbarButton`), `MobileSwipeRow`, `MobileActivityCards`, `MobileHeroPanel`, `MobileStageBoard`, `MobileViewToggle`, `MobileKeyValueList`, `MobileChartCard`, `MobileCard`, `MobileGallery`, `MobileSheet`, `MobileFilterSheet`, `MobileButton`, `MobileOptionList`/`MobileOptionRow`, `MobileTextField`/`MobileTextArea`/`MobileDateField`, `MobileSwitchRow`, `mobileAvatarColor`. If one nearly fits, improve it here and bump; never fork it into the app or paper over it with `!important`.
4. **Check the fit.** 390, 402 and 440px wide; safe areas; 44px targets; 4.5:1 contrast including grey meta and text on glass; every swipe or long-press has a button equivalent; every icon-only control has an `aria-label`.
5. **Review.** Run the `design-review` agent on the diff, then look at it on an iPhone-size viewport.

Things that are easy to get wrong:

- No bell, no stats line and no menu button in the header. Notifications live in Inbox; the menu lives in the bar.
- No tab strips on phones. A hub's pages are reached from its title (`Development ⌄`); each keeps its own route.
- One status pill per row. Problems go in red inside the meta line.
- Filter and picker sheets are `MobileFilterSheet` (`MobileSheet` + `onReset`/`resetVisible` + one `showLabel`/`onShow` footer button) with one `MobileOptionList` per filter as children. Choices apply as tapped; no Apply step, no visible radio or checkbox inputs, no desktop selects. Reset is the sheet's, at the top of the body.
- A list's round Filter button (and an editor's "New project") goes at the end of the chip row: `MobileViewChips` `trailing` / `MobileStageBoard` `chipsTrailing`, a `MobileToolbarButton`. No 72px toolbar row for it. A chip count is a number or a string like `"12+"`.
- Forms: `MobileTextField`, `MobileTextArea`, `MobileDateField` (visible label, 17px so iOS does not zoom, 44px+, `hint` and `error` wired by the package; `onClear` on a date), never the desktop `Input`. On/off settings: `MobileSwitchRow`, never a desktop `Switch` or checkbox.
- Content that is not a list or chart goes in a `MobileCard` (title above, `as` section/article/div). The side gutter is `--curv-mobile-gutter` (public); a block inside a padded parent takes `gutter="none"` instead of a hand-written variable (give a hand-written one a unit: `0px`). A main-block list section takes `headingSize="title"`.
- A server component cannot call anything imported from `@curvgroup/design-system/mobile` (a client module). `mobileAvatarColor` and `mobileButtonClassName` are pure and are also exported from the main entry `@curvgroup/design-system`: import them from there on the server.
- `count` on chips, stage columns and move options is `number | string` now (`"12+"` for a list that is not fully loaded); code that sums or compares them must narrow.
- Filter sheet: pass `resetVisible` (true only while a filter is on) with `onReset`; `showDisabled` and `showPending` act on the footer button.
- Avatars: pass the bare `name` beside the screen-reader `label` of a stage card avatar; the colour is `mobileAvatarColor(name)` (the desktop hues, dark enough for white initials at 4.5:1); stage cards use it by default; a header text action ("Mark all read") is `MobileTopBarTextAction`.
- Buttons and form submits on a phone are `MobileButton` (a link styled as one: `mobileButtonClassName`), never the desktop `Button`.
- Saved-view chips and board stage chips are one 44px chip (grey, chosen = dark with white text). A hero KPI with no series sets `selectable: false`.
- Desktop-only areas stay in the menu, dimmed and not tappable.
- A move that changes a record's status asks for confirmation.
