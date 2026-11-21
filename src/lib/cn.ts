import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/** The seven type-scale sizes theme.css defines (`text-body`, `text-caption`, …). */
export const TYPE_SCALE = ["display", "figure", "title", "section", "body", "caption", "micro"] as const;

/**
 * tailwind-merge does not know the theme's type tokens: left alone it reads
 * `text-body` as a colour and drops it next to `text-foreground`. This teaches
 * it they are font sizes. An app with its own cn() passes the same config:
 * `extendTailwindMerge(curvTailwindMergeConfig)`.
 */
export const curvTailwindMergeConfig = {
  extend: { classGroups: { "font-size": [{ text: [...TYPE_SCALE] }] } },
};

const twMerge = extendTailwindMerge(curvTailwindMergeConfig);

/** Merge Tailwind classes with conflict resolution. The one class-name helper
 *  every component uses, so consumers never re-implement it. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
