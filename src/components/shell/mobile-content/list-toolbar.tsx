"use client";

import * as React from "react";
import { cn } from "../../../lib/cn";
import { ContentLink, FilterIcon, SearchIcon, SortIcon, formatCountValue, hasCount, hasNode, prefersReducedMotion, useIsomorphicLayoutEffect, type MobileContentRenderLink } from "./shared";

export interface MobileToolbarButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> {
  /** What the button does, for screen readers: "Filter projects". Required: the button is an icon. When `count` is above zero the
   *  name gets it appended ("Filter projects (3)"), so the badge, which is hidden from assistive technology, is not lost. */
  label: string;
  /** "filter" and "sort" are the toolbar's own icons; anything else is drawn as given (a 22px `svg`). Default "filter". */
  icon?: "filter" | "sort" | React.ReactNode;
  /** A small badge on the corner, such as the number of filters that are on. Nothing is drawn for 0 or less; above 9 it reads "9+". */
  count?: number;
}

/**
 * The round icon button of `MobileListToolbar` (Sort, Filter), on its own: 48px in the toolbar, 44px in the end slot of
 * `MobileViewChips` and `MobileStageBoard` (`trailing`, `chipsTrailing`), where it sits level with the chips.
 * `type` defaults to "button".
 */
export const MobileToolbarButton = React.forwardRef<HTMLButtonElement, MobileToolbarButtonProps>(function MobileToolbarButton(
  { label, icon = "filter", count, className, type = "button", ...props }, ref,
) {
  const badge = count && count > 0 ? count : 0;
  return (
    <button type={type} className={cn("curv-mobile-toolbar-button", className)} aria-label={badge ? `${label} (${badge})` : label} {...props} ref={ref}>
      {icon === "filter" ? <FilterIcon /> : icon === "sort" ? <SortIcon /> : icon}
      {badge > 0 && <span className="curv-mobile-toolbar-badge" aria-hidden="true">{badge > 9 ? "9+" : badge}</span>}
    </button>
  );
});

export interface MobileListToolbarProps {
  /** Leave it out for a screen whose search lives elsewhere: only the round buttons render, right-aligned. */
  search?: { value: string; onChange: (value: string) => void; placeholder?: string; label: string };
  /** One extra control before Sort and Filter, for the screen's one creating action: a round icon button
   *  (`className="curv-mobile-toolbar-button"`) or a plain `<button>` / `<a>` with text ("New project"),
   *  which the toolbar draws as a 48px pill. Give an icon-only control an `aria-label`. */
  action?: React.ReactNode;
  onSort?: () => void;
  sortLabel?: string;
  onFilter?: () => void;
  filterLabel?: string;
  /** Active filters. Shown as a small badge on the Filter button. */
  filterCount?: number;
  className?: string;
}

/** A search field, an optional action and two round buttons. The one search on a list screen lives here. */
export function MobileListToolbar({ search, action, onSort, sortLabel = "Sort", onFilter, filterLabel = "Filter", filterCount, className }: MobileListToolbarProps) {
  const count = filterCount && filterCount > 0 ? filterCount : 0;
  const hasAction = action != null && action !== false;
  if (!search && !hasAction && !onSort && !onFilter) return null;
  return (
    <div className={cn("curv-mobile-toolbar", className)} data-no-search={search ? undefined : "true"}>
      {search && (
        <label className="curv-mobile-toolbar-search">
          <SearchIcon size={20} />
          <input
            type="search"
            aria-label={search.label}
            placeholder={search.placeholder}
            value={search.value}
            onChange={event => search.onChange(event.target.value)}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
          />
        </label>
      )}
      {hasAction && <span className="curv-mobile-toolbar-action">{action}</span>}
      {onSort && <MobileToolbarButton label={sortLabel} icon="sort" onClick={onSort} />}
      {onFilter && <MobileToolbarButton label={filterLabel} icon="filter" count={count} onClick={onFilter} />}
    </div>
  );
}

export interface MobileViewChipItem {
  id: string;
  label: string;
  /** A number gets thousands separators; a string is shown as given, for a floor when the list is not fully loaded ("12+"). */
  count?: number | string;
  href?: string;
  active?: boolean;
}
export interface MobileViewChipsProps {
  /** Names the group for screen readers: "Saved views". */
  label: string;
  items: MobileViewChipItem[];
  onSelect?: (id: string) => void;
  /** Something at the end of the row, outside the scroller: it does not scroll with the chips. A list puts its round Filter button
   *  here (`MobileToolbarButton`), an editor its "New project", instead of a toolbar row of their own. It is 44px tall to match the chips. */
  trailing?: React.ReactNode;
  renderLink?: MobileContentRenderLink;
  /** On the outermost element: the chip scroller, or the row that holds it and `trailing`. */
  className?: string;
}

/** Saved views as chips that scroll sideways: the same 44px chip as the stage board, the active one dark with white text. */
export function MobileViewChips({ label, items, onSelect, trailing, renderLink, className }: MobileViewChipsProps) {
  const track = React.useRef<HTMLDivElement>(null);
  const first = React.useRef(true);
  const activeId = items.find(item => item.active)?.id;

  // Keep the active chip on screen without ever moving the page itself.
  useIsomorphicLayoutEffect(() => {
    const scroller = track.current;
    const chip = scroller?.querySelector<HTMLElement>("[data-active='true']")?.closest<HTMLElement>(".curv-mobile-view-chip");
    if (!scroller || !chip) return;
    const left = chip.offsetLeft - 16;
    const right = chip.offsetLeft + chip.offsetWidth + 16;
    if (left >= scroller.scrollLeft && right <= scroller.scrollLeft + scroller.clientWidth) { first.current = false; return; }
    const target = Math.max(0, chip.offsetLeft - (scroller.clientWidth - chip.offsetWidth) / 2);
    scroller.scrollTo({ left: target, behavior: first.current || prefersReducedMotion() ? "auto" : "smooth" });
    first.current = false;
  }, [activeId]);

  const slot = hasNode(trailing);
  const chips = (
    <div ref={track} className={cn("curv-mobile-view-chips", !slot && className)} role="group" aria-label={label}>
      {items.map(item => {
        const body = <><span>{item.label}</span>{hasCount(item.count) && <span className="curv-mobile-view-chip-count">{formatCountValue(item.count)}</span>}</>;
        // The same chip the stage board draws (.curv-mobile-chip): a list and its board read as one control.
        const chipClass = "curv-mobile-chip curv-mobile-view-chip";
        return item.href
          ? <ContentLink key={item.id} href={item.href} className={chipClass} aria-current={item.active ? "page" : undefined} renderLink={renderLink}><ChipBody active={item.active}>{body}</ChipBody></ContentLink>
          : <button key={item.id} type="button" className={chipClass} aria-pressed={Boolean(item.active)} onClick={() => onSelect?.(item.id)}><ChipBody active={item.active}>{body}</ChipBody></button>;
      })}
    </div>
  );
  // Without a slot the markup is what it always was: the scroller alone.
  if (!slot) return chips;
  return (
    <div className={cn("curv-mobile-chips-row curv-mobile-view-chips-row", className)}>
      {chips}
      <div className="curv-mobile-chips-trailing">{trailing}</div>
    </div>
  );
}

/** A marker the scroll effect can find; the chip element itself belongs to the app's link renderer. */
function ChipBody({ active, children }: { active?: boolean; children: React.ReactNode }) {
  return <span className="curv-mobile-view-chip-body" data-active={active ? "true" : undefined}>{children}</span>;
}
