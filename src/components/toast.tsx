"use client";

import * as React from "react";
import { Toast as Tst } from "@base-ui/react/toast";
import { cn } from "../lib/cn";

/**
 * Toast — transient feedback (base-ui). Mount <ToastProvider> once at the app
 * root, then call the imperative `toast.*` helpers from anywhere. Toasts stack
 * bottom-right, auto-dismiss, pause their timer on a hidden tab, and animate
 * with CSS transitions (not keyframes) so a rapid burst retargets smoothly.
 *
 *   toast.success("Deal confirmed");
 *   toast.error("Couldn't save", { description: "Try again." });
 */
const manager = Tst.createToastManager();

export interface ToastOptions {
  description?: React.ReactNode;
  /** Auto-dismiss after ms (0 keeps it until dismissed). */
  timeout?: number;
  /** A single inline action — the Undo pattern (Linear). Runs, then dismisses. */
  action?: { label: string; onClick: () => void };
}

function add(title: React.ReactNode, type: string, opts?: ToastOptions) {
  const { action, ...rest } = opts ?? {};
  return manager.add({
    title,
    type,
    ...rest,
    actionProps: action ? { children: action.label, onClick: action.onClick } : undefined,
  });
}

export const toast = {
  message: (title: React.ReactNode, opts?: ToastOptions) => add(title, "info", opts),
  success: (title: React.ReactNode, opts?: ToastOptions) => add(title, "success", opts),
  error: (title: React.ReactNode, opts?: ToastOptions) => add(title, "error", opts),
};

const DOT: Record<string, string> = {
  success: "bg-verdict-green",
  error: "bg-destructive",
  info: "bg-muted-foreground",
};

function ToastList() {
  const { toasts } = Tst.useToastManager();
  return toasts.map((t) => (
    <Tst.Root
      key={t.id}
      toast={t}
      swipeDirection="right"
      className={cn(
        "flex items-start gap-2.5 rounded-lg border border-border bg-popover p-3.5 text-popover-foreground shadow-lg outline-none",
        // Transitions (not keyframes): slide in from the right, exit faster.
        "transition-[transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
        "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[ending-style]:duration-150",
        "motion-safe:data-[starting-style]:translate-x-4 motion-safe:data-[ending-style]:translate-x-4",
      )}
    >
      {t.type && DOT[t.type] ? (
        <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", DOT[t.type])} aria-hidden />
      ) : null}
      <div className="min-w-0 flex-1">
        <Tst.Title className="text-body font-medium text-foreground" />
        <Tst.Description className="mt-0.5 text-body leading-relaxed text-muted-foreground" />
      </div>
      {t.actionProps ? (
        <Tst.Action className="shrink-0 self-center rounded-md px-2 py-1 text-body font-medium text-foreground underline-offset-2 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20" />
      ) : null}
      <Tst.Close
        aria-label="Dismiss"
        className="grid size-5 shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </Tst.Close>
    </Tst.Root>
  ));
}

export function ToastProvider({
  children,
  limit = 4,
}: {
  children: React.ReactNode;
  /** Max toasts shown at once; older ones drop out. */
  limit?: number;
}) {
  return (
    <Tst.Provider toastManager={manager} limit={limit}>
      {children}
      <Tst.Viewport className="fixed bottom-4 right-4 z-[60] flex w-[380px] max-w-[calc(100vw-2rem)] flex-col gap-2 outline-none">
        <ToastList />
      </Tst.Viewport>
    </Tst.Provider>
  );
}
