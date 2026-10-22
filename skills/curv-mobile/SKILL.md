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
3. **Assemble from `@curvgroup/design-system/mobile`.** `MobileTopBar`, `MobileTabBar`, `MobileMenu`, `MobileFlatList`/`MobileListRow`, `MobileSwipeRow`, `MobileActivityCards`, `MobileHeroPanel`, `MobileStageBoard`, `MobileViewToggle`, `MobileKeyValueList`, `MobileGallery`, `MobileSheet`. If one nearly fits, improve it here and bump; never fork it into the app.
4. **Check the fit.** 390, 402 and 440px wide; safe areas; 44px targets; 4.5:1 contrast including grey meta and text on glass; every swipe or long-press has a button equivalent; every icon-only control has an `aria-label`.
5. **Review.** Run the `design-review` agent on the diff, then look at it on an iPhone-size viewport.

Things that are easy to get wrong:

- No bell, no stats line and no menu button in the header. Notifications live in Inbox; the menu lives in the bar.
- No tab strips on phones. A hub's pages are reached from its title (`Development ⌄`); each keeps its own route.
- One status pill per row. Problems go in red inside the meta line.
- Desktop-only areas stay in the menu, dimmed and not tappable.
- A move that changes a record's status asks for confirmation.
