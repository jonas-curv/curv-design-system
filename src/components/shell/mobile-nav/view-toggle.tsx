"use client";
import * as React from "react";
import { cn } from "../../../lib/cn";
import type { MobileNavLinkProps, MobileNavRenderLink } from "./types";

export interface MobileViewToggleOption {
  value: string;
  /** Icon-only control: the label is its accessible name. */
  label: string;
  icon: React.ReactNode;
  /** Give both options an href when the choice lives in the URL. */
  href?: string;
}
export type MobileViewToggleLinkItem = MobileViewToggleOption & { href: string };
export interface MobileViewToggleProps {
  /** Exactly two options (List | Board). Anything past the second is ignored. */
  options: MobileViewToggleOption[];
  value: string;
  onChange?: (value: string) => void;
  renderLink?: MobileNavRenderLink<MobileViewToggleLinkItem>;
  /** dark sits on the black top bar; light sits on a white surface. */
  tone?: "dark" | "light";
  /** Names the pair for assistive technology. */
  label?: string;
  className?: string;
}

/** List | Board for the black top bar. The choice belongs in the URL, so options can be links. */
export function MobileViewToggle({ options, value, onChange, renderLink, tone = "dark", label = "View", className }: MobileViewToggleProps) {
  return <div role="group" aria-label={label} className={cn("curv-mobile-viewtoggle", className)} data-tone={tone}>
    {options.slice(0, 2).map(option => {
      const selected = option.value === value;
      const common = { className: "curv-mobile-viewtoggle-option", "aria-label": option.label, onClick: () => onChange?.(option.value) };
      const icon = <span className="curv-mobile-viewtoggle-icon" aria-hidden="true">{option.icon}</span>;
      if (option.href === undefined) return <button key={option.value} type="button" {...common} aria-pressed={selected}>{icon}</button>;
      const props: MobileNavLinkProps = { href: option.href, ...common, "aria-current": selected ? "page" : undefined, children: icon };
      const item = { ...option, href: option.href };
      return <React.Fragment key={option.value}>{renderLink ? renderLink(item, props) : <a {...props} />}</React.Fragment>;
    })}
  </div>;
}
