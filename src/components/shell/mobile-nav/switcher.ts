"use client";
import * as React from "react";

/** A tapped page is shown as current until the route catches up; one that has not by now did not happen. */
const PENDING_MS = 8000;

/**
 * The title switcher both black bars share (`MobileTopBar` and `MobileHeader`): the open state, the page that was just tapped, and the
 * handlers that keep the promise of `MobileNavLinkProps.onClick`: the list closes on the tap itself, in the capture phase, before
 * the app's link sees the click, so an adapter that drops `onClick` still closes it. The list's `li` carries `data-page` (the page's
 * id) and its first child is the link.
 */
export function useTitleSwitcher<Item extends { id: string; active?: boolean }>(pages: readonly Item[] | undefined) {
  const uid = React.useId();
  const listId = `${uid}-pages`;
  const [open, setOpen] = React.useState(false);
  const root = React.useRef<HTMLElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  // The page the person tapped, until the route reports it as the active one. The list closes and the row is current at once, so a
  // slow navigation never leaves the menu open over the old page or the old row marked.
  const [pending, setPending] = React.useState<string | null>(null);
  const activeId = pages?.find(item => item.active)?.id;

  React.useEffect(() => { setPending(null); }, [activeId]);
  React.useEffect(() => {
    if (pending === null) return;
    const timer = window.setTimeout(() => setPending(null), PENDING_MS);
    return () => window.clearTimeout(timer);
  }, [pending]);

  /** Runs in the capture phase on the list, before the app's link sees the click and whatever it forwards of our `onClick`. */
  const choose = (event: React.MouseEvent<HTMLElement>) => {
    // The page link (or whatever the app's adapter renders in its place): a tap on the list's own padding is neither.
    const link = event.target instanceof Element ? event.target.closest<HTMLElement>("li[data-page] > *") : null;
    const row = link?.parentElement;
    if (!row) return;
    setOpen(false);
    // A modified click opens somewhere else; this page is not going anywhere.
    const plain = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    const id = row.dataset.page;
    if (plain && id !== undefined && id !== activeId) setPending(id);
    // Nothing is going to replace this page, and the list that held focus is closing: it goes back to the title instead of the document.
    else trigger.current?.focus();
  };

  React.useEffect(() => {
    if (!open) return;
    const outside = (event: Event) => { if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("focusin", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("focusin", outside); document.removeEventListener("keydown", escape); };
  }, [open]);

  const isCurrent = (item: Item) => (pending !== null ? item.id === pending : Boolean(item.active));
  return { open, setOpen, listId, root, trigger, choose, pending, isCurrent };
}
