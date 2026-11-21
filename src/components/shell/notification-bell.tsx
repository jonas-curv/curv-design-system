"use client";

import * as React from "react";
import { cn } from "../../lib/cn";
import { Popover } from "../popover";

function Bell() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}
function Check() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export interface NotificationItem {
  id: string;
  title: string;
  body?: string;
  /** Preformatted relative time (e.g. "2h ago") — the app owns time formatting. */
  time?: string;
  /** Leading visual — usually a small tinted icon square the app supplies. */
  icon?: React.ReactNode;
  unread?: boolean;
  /** Navigate on click; otherwise pass `onClick`. */
  href?: string;
  onClick?: () => void;
}

/**
 * NotificationBell — the top-bar bell + count badge + inbox popover every OS
 * shares. Rows carry a title/body/time, an unread dot, and (when the handlers
 * are given) hover actions to mark-read and dismiss. Data and polling stay in
 * the app; this owns only the chrome. Use `footer` for a "system signals"
 * section under the inbox (sync health, what's new, …).
 */
export interface NotificationBellProps {
  items: NotificationItem[];
  /** Badge count. Defaults to the number of unread items. */
  unreadCount?: number;
  onMarkAllRead?: () => void;
  onMarkRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
  /** Pinned section below the inbox (e.g. sync health / changelog rows). */
  footer?: React.ReactNode;
  emptyLabel?: string;
  align?: "start" | "center" | "end";
  className?: string;
}

export function NotificationBell({
  items,
  unreadCount,
  onMarkAllRead,
  onMarkRead,
  onDismiss,
  footer,
  emptyLabel = "You're all caught up.",
  align = "end",
  className,
}: NotificationBellProps) {
  const [open, setOpen] = React.useState(false);
  const count = unreadCount ?? items.filter((i) => i.unread).length;

  const trigger = (
    <button
      type="button"
      aria-label={count > 0 ? `Notifications, ${count} unread` : "Notifications"}
      className={cn(
        "relative flex size-9 items-center justify-center rounded-md text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <Bell />
      {count > 0 ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-micro font-semibold tabular-nums text-primary-foreground ring-2 ring-card">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </button>
  );

  const actionBtn =
    "flex size-6 items-center justify-center rounded-md text-muted-foreground/70 transition hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <Popover trigger={trigger} open={open} onOpenChange={setOpen} align={align} sideOffset={8} className="w-[352px] max-w-none p-0">
      <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
        <span className="text-body font-semibold text-foreground">Notifications</span>
        {count > 0 && onMarkAllRead ? (
          <button type="button" onClick={onMarkAllRead} className="text-micro font-medium text-chart hover:underline">
            Mark all read
          </button>
        ) : null}
      </div>

      {items.length > 0 ? (
        <div className="max-h-[320px] overflow-y-auto p-1.5">
          {items.map((n) => {
            const canMark = !!(n.unread && onMarkRead);
            const canDismiss = !!onDismiss;
            const pad = canMark && canDismiss ? "pr-14" : canMark || canDismiss ? "pr-9" : "";
            const rowClass = cn(
              "flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition hover:bg-accent",
              n.unread && "bg-accent/40",
              pad,
            );
            const activate = () => {
              if (n.unread) onMarkRead?.(n.id);
              n.onClick?.();
              setOpen(false);
            };
            const inner = (
              <>
                {n.icon ? <span className="shrink-0">{n.icon}</span> : null}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-body font-medium text-foreground">{n.title}</span>
                    {n.unread ? <span className="size-1.5 shrink-0 rounded-full bg-chart" /> : null}
                  </span>
                  {n.body ? <span className="mt-0.5 line-clamp-2 block text-caption text-muted-foreground">{n.body}</span> : null}
                  {n.time ? <span className="mt-0.5 block text-micro text-muted-foreground/70">{n.time}</span> : null}
                </span>
              </>
            );
            return (
              <div key={n.id} className="group relative">
                {n.href ? (
                  <a href={n.href} onClick={activate} className={rowClass}>{inner}</a>
                ) : (
                  <button type="button" onClick={activate} className={cn(rowClass, "w-full")}>{inner}</button>
                )}
                {canMark || canDismiss ? (
                  <div className="absolute right-1.5 top-1.5 flex items-center gap-0.5">
                    {canMark ? (
                      <button type="button" onClick={() => onMarkRead!(n.id)} aria-label="Mark as read" className={actionBtn}>
                        <Check />
                      </button>
                    ) : null}
                    {canDismiss ? (
                      <button type="button" onClick={() => onDismiss!(n.id)} aria-label="Dismiss" className={actionBtn}>
                        <XIcon />
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="px-3.5 py-8 text-center text-body text-muted-foreground">{emptyLabel}</div>
      )}

      {footer ? <div className="border-t border-border">{footer}</div> : null}
    </Popover>
  );
}
