"use client";

import * as React from "react";
import { cn } from "../../../lib/cn";
import { hasNode, type MobileGutter } from "./shared";

export interface MobileCardProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  /** The element: a `section` (default; a landmark when it has a title), an `article` for something that stands alone, or a plain `div`. */
  as?: "section" | "article" | "div";
  /** A heading above the card in the same 14px grey as every section heading. Say the period if it holds figures. */
  title?: React.ReactNode;
  /** The level of the title's heading, 2 to 4. Default 2; use 3 inside a section that already has a 2. */
  headingLevel?: 2 | 3 | 4;
  /** A short note at the right of the title: "as of 9:41". */
  trailing?: React.ReactNode;
  /** Side gutters of the card. `none` for a parent that already pads its content. Default: the 16px every rounded block ships with. */
  gutter?: MobileGutter;
}

/**
 * The phone card: a white block with 18px corners, the design system's 0.5px ring and 16px of padding, under an optional section
 * heading. It is the frame `MobileChartCard` draws around a chart, for anything else: text, a form, a few controls. Like every phone
 * surface it stays light under the dark theme, and the desktop tokens its content reads (`--card`, `--foreground`, …) are pinned to
 * light values inside it. Native attributes and the ref go to the outer element.
 */
export const MobileCard = React.forwardRef<HTMLElement, MobileCardProps>(function MobileCard(
  { as: Element = "section", title, headingLevel = 2, trailing, gutter, className, children, role, ...props }, ref,
) {
  const id = React.useId();
  const hasTitle = hasNode(title);
  const Heading = `h${headingLevel}` as "h2";
  return (
    <Element
      {...props}
      ref={ref as React.Ref<HTMLDivElement>}
      className={cn("curv-mobile-panel", className)}
      data-gutter={gutter}
      aria-labelledby={hasTitle ? id : props["aria-labelledby"]}
      // A plain div ignores a name, so a titled one is a group; a section or an article already has a role that takes one.
      role={role ?? (Element === "div" && hasTitle ? "group" : undefined)}
    >
      {(hasTitle || hasNode(trailing)) && (
        <div className="curv-mobile-panel-head">
          {hasTitle && <Heading id={id}>{title}</Heading>}
          {hasNode(trailing) && <span className="curv-mobile-panel-trailing">{trailing}</span>}
        </div>
      )}
      <div className="curv-mobile-panel-body">{children}</div>
    </Element>
  );
});
