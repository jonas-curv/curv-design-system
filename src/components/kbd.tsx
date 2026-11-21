import * as React from "react";
import { cn } from "../lib/cn";

/**
 * Kbd — a keyboard-key chip (⌘K, ↵, Esc). One treatment everywhere: the command
 * palette shortcut hint, menu accelerators, tooltips. Recessed muted surface so
 * it reads as a key, not a button.
 */
export interface KbdProps extends React.HTMLAttributes<HTMLElement> {}

export function Kbd({ className, children, ...props }: KbdProps) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded border border-border bg-muted px-1 font-sans text-micro font-medium text-muted-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </kbd>
  );
}
