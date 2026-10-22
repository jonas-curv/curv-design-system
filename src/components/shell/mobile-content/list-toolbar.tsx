"use client";

import * as React from "react";
import { cn } from "../../../lib/cn";
import { ContentLink, FilterIcon, SearchIcon, SortIcon, formatCount, prefersReducedMotion, useIsomorphicLayoutEffect, type MobileContentRenderLink } from "./shared";

export interface MobileListToolbarProps {
  search: { value: string; onChange: (value: string) => void; placeholder?: string; label: string };
  onSort?: () => void;
  sortLabel?: string;
  onFilter?: () => void;
  filterLabel?: string;
  /** Active filters. Shown as a small badge on the Filter button. */
  filterCount?: number;
  className?: string;
}

/** A search field and two round buttons. The one search on a list screen lives here. */
export function MobileListToolbar({ search, onSort, sortLabel = "Sort", onFilter, filterLabel = "Filter", filterCount, className }: MobileListToolbarProps) {
  const count = filterCount && filterCount > 0 ? filterCount : 0;
  return (
    <div className={cn("curv-mobile-toolbar", className)}>
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
      {onSort && <button type="button" className="curv-mobile-toolbar-button" aria-label={sortLabel} onClick={onSort}><SortIcon /></button>}
      {onFilter && (
        <button type="button" className="curv-mobile-toolbar-button" aria-label={count ? `${filterLabel} (${count})` : filterLabel} onClick={onFilter}>
          <FilterIcon />
          {count > 0 && <span className="curv-mobile-toolbar-badge" aria-hidden="true">{count > 9 ? "9+" : count}</span>}
        </button>
      )}
    </div>
  );
}

export interface MobileViewChipItem {
  id: string;
  label: string;
  count?: number;
  href?: string;
  active?: boolean;
}
export interface MobileViewChipsProps {
  /** Names the group for screen readers: "Saved views". */
  label: string;
  items: MobileViewChipItem[];
  onSelect?: (id: string) => void;
  renderLink?: MobileContentRenderLink;
  className?: string;
}

/** Saved views as plain text chips that scroll sideways. The active one sits on a grey pill. */
export function MobileViewChips({ label, items, onSelect, renderLink, className }: MobileViewChipsProps) {
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

  return (
    <div ref={track} className={cn("curv-mobile-view-chips", className)} role="group" aria-label={label}>
      {items.map(item => {
        const body = <><span>{item.label}</span>{item.count != null && <span className="curv-mobile-view-chip-count">{formatCount(item.count)}</span>}</>;
        const chipClass = "curv-mobile-view-chip";
        return item.href
          ? <ContentLink key={item.id} href={item.href} className={chipClass} aria-current={item.active ? "page" : undefined} renderLink={renderLink}><ChipBody active={item.active}>{body}</ChipBody></ContentLink>
          : <button key={item.id} type="button" className={chipClass} aria-pressed={Boolean(item.active)} onClick={() => onSelect?.(item.id)}><ChipBody active={item.active}>{body}</ChipBody></button>;
      })}
    </div>
  );
}

/** A marker the scroll effect can find; the chip element itself belongs to the app's link renderer. */
function ChipBody({ active, children }: { active?: boolean; children: React.ReactNode }) {
  return <span className="curv-mobile-view-chip-body" data-active={active ? "true" : undefined}>{children}</span>;
}
