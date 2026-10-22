import type * as React from "react";

export type MobileBreakpoint = "md" | "lg";

/**
 * What an app spreads onto the element its router renders for a navigation link
 * (`<Link href={item.href} {...props} />`). The shared components own the class,
 * the accessible name and the current-page marker; the app owns the routing.
 */
export interface MobileNavLinkProps {
  /** The destination, so one `(props) => <Link {...props} />` adapter can serve navigation and content components. */
  href: string;
  className: string;
  children: React.ReactNode;
  "aria-current"?: "page";
  "aria-label"?: string;
  "aria-describedby"?: string;
  /** Closes the surface the link sits in (menu, switcher). Always call it from custom handlers too. */
  onClick?: React.MouseEventHandler<HTMLElement>;
  [attribute: `data-${string}`]: string | undefined;
}

export type MobileNavRenderLink<Item> = (item: Item, props: MobileNavLinkProps) => React.ReactNode;
