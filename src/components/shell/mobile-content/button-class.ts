import { cn } from "../../../lib/cn";

// Pure: no React and no client-module directive, so the main entry can export it for server components (see src/index.ts).

export type MobileButtonVariant = "primary" | "secondary" | "plain";

/** What styles a phone button, whether it is a `<button>` or a link the app draws as one. */
export interface MobileButtonStyle {
  /** primary: the dark fill of the tab bar's action. secondary: a quiet grey fill. plain: text only. Default "primary". */
  variant?: MobileButtonVariant;
  /** Full width of its container, for a sheet footer or the end of a form. */
  block?: boolean;
}

/**
 * The class names of a phone button, for the one place an app has to draw something else as a button (a router link, say):
 * `<Link className={mobileButtonClassName({ variant: "secondary", block: true })}>`. A link has no disabled or busy state of
 * its own, so use `MobileButton` for anything that submits. A pure function: it can be called from a server component when it is
 * imported from `@curvgroup/design-system` (the `/mobile` entry is a client module, so a function imported from it cannot be).
 */
export function mobileButtonClassName({ variant = "primary", block, className }: MobileButtonStyle & { className?: string } = {}): string {
  return cn("curv-mobile-button", `curv-mobile-button-${variant}`, block && "curv-mobile-button-block", className);
}
