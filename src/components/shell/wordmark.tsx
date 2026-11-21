import * as React from "react";
import { cn } from "../../lib/cn";

export interface WordmarkProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> {
  /** The app's name without "OS": "sales", "finance", "customs". Shown lowercase; a trailing "OS" is dropped. */
  name: string;
  /** What screen readers hear. Default: the name in title case plus " OS" ("Sales OS"). */
  label?: string;
}

/** "Sales OS", "sales os", "sales" → "sales". */
function baseName(name: string): string {
  return name.trim().replace(/\s*os$/i, "").toLowerCase();
}

/**
 * The OS wordmark for the top bar: the lowercase app name with a superscript "os".
 * 16px / 600, tracking -0.02em; the "os" is 0.55em at 60% white. No bold, no caps.
 * Wrap it in the app's home link: <a href="/"><Wordmark name="sales" /></a>.
 */
export function Wordmark({ name, label, className, ...props }: WordmarkProps) {
  const word = baseName(name);
  const spoken = label ?? `${word.charAt(0).toUpperCase()}${word.slice(1)} OS`;
  return (
    <span
      className={cn(
        "inline-flex items-baseline whitespace-nowrap text-section font-semibold leading-none tracking-[-0.02em] text-topbar-foreground",
        className,
      )}
      {...props}
    >
      <span aria-hidden="true">
        {word}
        {/* top-0: preflight already raises <sup> by 0.5em; vertical-align does it here. */}
        <sup className="top-0 ml-0.5 align-super text-[0.55em] font-semibold leading-none tracking-normal text-topbar-foreground/60">
          os
        </sup>
      </span>
      <span className="sr-only">{spoken}</span>
    </span>
  );
}
