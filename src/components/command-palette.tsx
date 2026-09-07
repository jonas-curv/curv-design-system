"use client";

import * as React from "react";
import { Dialog as D } from "@base-ui/react/dialog";
import { cn } from "../lib/cn";

/**
 * CommandPalette (⌘K) — the global search/jump modal every OS mounts once. A
 * base-ui Dialog (focus trap, Escape, backdrop, focus restore) wrapping a
 * filtered, keyboard-navigable list. Controlled via `open`/`onOpenChange`;
 * registers the ⌘K / Ctrl-K shortcut itself unless `shortcut={false}`.
 */
export interface CommandItem {
  id: string;
  label: string;
  /** Section header this item groups under (rendered in list order). */
  group?: string;
  /** Extra search terms (not shown). */
  keywords?: string;
  /** Leading icon. */
  icon?: React.ReactNode;
  /** Right-aligned context, e.g. the section name. */
  hint?: string;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
  /** Shown (under "Recent") when the query is empty — recently visited pages /
   *  records. Falls back to `items` if omitted. */
  recents?: CommandItem[];
  placeholder?: string;
  emptyLabel?: string;
  /** Register a global ⌘K / Ctrl-K toggle. Default true. */
  shortcut?: boolean;
}

export function CommandPalette({
  open,
  onOpenChange,
  items,
  recents,
  placeholder = "Search pages, orders, customers…",
  emptyLabel = "No results.",
  shortcut = true,
}: CommandPaletteProps) {
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const listRef = React.useRef<HTMLDivElement>(null);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    // Empty query → recents (grouped under "Recent"), or the full list.
    if (!q) {
      return recents?.length ? recents.map((it) => ({ ...it, group: it.group ?? "Recent" })) : items;
    }
    return items.filter((it) => `${it.label} ${it.keywords ?? ""} ${it.hint ?? ""}`.toLowerCase().includes(q));
  }, [items, recents, query]);

  // Global ⌘K / Ctrl-K toggle.
  React.useEffect(() => {
    if (!shortcut) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut, open, onOpenChange]);

  // Reset on open; keep the highlight in range as results shrink.
  React.useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
    }
  }, [open]);
  React.useEffect(() => {
    setActive((a) => Math.min(a, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  // Keep the active row in view.
  React.useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-cmd-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const select = (item?: CommandItem) => {
    if (!item) return;
    onOpenChange(false);
    item.onSelect();
  };

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (filtered.length ? (a + 1) % filtered.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (filtered.length ? (a - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      select(filtered[active]);
    }
  };

  let lastGroup: string | undefined;

  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Backdrop className="fixed inset-0 z-50 bg-overlay transition-opacity duration-200 data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
        <D.Popup
          initialFocus={false}
          className={cn(
            "fixed left-1/2 top-[max(0.5rem,env(safe-area-inset-top))] sm:top-[14vh] z-50 flex max-h-[calc(100dvh-1rem)] sm:max-h-[70vh] w-[36rem] max-w-[calc(100vw-2rem)] origin-top -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg outline-none",
            "transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] data-[ending-style]:duration-150",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 motion-safe:data-[starting-style]:scale-[0.98] motion-safe:data-[ending-style]:scale-[0.98]",
          )}
        >
          <D.Title className="sr-only">Search</D.Title>
          <D.Close className="min-h-11 px-4 text-right text-[13px] sm:hidden">Close</D.Close>
          {/* search row */}
          <div className="flex items-center gap-2.5 border-b border-border px-4">
            <span className="text-muted-foreground/70" aria-hidden>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
            </span>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder={placeholder}
              role="combobox"
              aria-expanded
              aria-controls="command-list"
              aria-activedescendant={filtered[active] ? `command-item-${active}` : undefined}
              className="h-12 w-full bg-transparent text-base sm:text-[14px] text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
            />
          </div>

          {/* results */}
          <div ref={listRef} id="command-list" role="listbox" className="min-h-0 flex-1 overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="px-2 py-8 text-center text-[13px] text-muted-foreground">{emptyLabel}</div>
            ) : (
              filtered.map((it, i) => {
                const header = it.group && it.group !== lastGroup ? it.group : null;
                lastGroup = it.group;
                const isActive = i === active;
                return (
                  <React.Fragment key={it.id}>
                    {header && <div className="px-2 pb-1 pt-2 text-[11px] font-medium text-muted-foreground">{header}</div>}
                    <div
                      id={`command-item-${i}`}
                      data-cmd-index={i}
                      role="option"
                      aria-selected={isActive}
                      onClick={() => select(it)}
                      onMouseMove={() => setActive(i)}
                      className={cn(
                        "flex min-h-11 sm:min-h-0 cursor-default items-center gap-2.5 rounded-md px-2 py-2 text-[13px]",
                        isActive ? "bg-accent text-foreground" : "text-popover-foreground",
                      )}
                    >
                      {it.icon && <span className="grid size-4 shrink-0 place-items-center text-muted-foreground">{it.icon}</span>}
                      <span className="flex-1 truncate">{it.label}</span>
                      {it.hint && <span className="shrink-0 text-[12px] text-muted-foreground">{it.hint}</span>}
                    </div>
                  </React.Fragment>
                );
              })
            )}
          </div>
        </D.Popup>
      </D.Portal>
    </D.Root>
  );
}
