"use client";

import * as React from "react";
import { Menu as M } from "@base-ui/react/menu";
import { cn } from "../lib/cn";

/**
 * Dropdown menu (base-ui) — a trigger + a portalled, origin-aware popup of
 * actions. Matches the Select surface: `rounded-lg` popover, items highlight on
 * `bg-accent`. Compose with <MenuItem> / <MenuSeparator> / <MenuLabel>.
 *
 * The canonical trigger is the toolbar chrome (design-system.md → Dropdown
 * menus): `<Button variant="outline">` + trailing muted ChevronDown, with
 * `data-[popup-open]:bg-accent` — not a gray secondary button.
 *
 * <Menu trigger={<Button variant="outline" className="data-[popup-open]:bg-accent">Actions <ChevronDown … /></Button>}>
 *   <MenuItem onClick={edit}>Edit</MenuItem>
 *   <MenuSeparator />
 *   <MenuItem destructive onClick={remove}>Delete</MenuItem>
 * </Menu>
 */
export interface MenuProps {
  /** The trigger — a single focusable element. */
  trigger: React.ReactElement;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  sideOffset?: number;
}

export function Menu({
  trigger,
  children,
  side = "bottom",
  align = "start",
  sideOffset = 6,
}: MenuProps) {
  return (
    <M.Root>
      <M.Trigger render={trigger} />
      <M.Portal>
        <M.Positioner side={side} align={align} sideOffset={sideOffset} className="z-50">
          <M.Popup
            className={cn(
              "min-w-[10rem] max-h-[min(24rem,var(--available-height))] origin-[var(--transform-origin)] overflow-y-auto rounded-lg border border-border bg-popover p-1 text-body text-popover-foreground shadow-lg outline-none",
              "transition-[transform,opacity] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]",
              "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[ending-style]:duration-100",
              "motion-safe:data-[starting-style]:scale-95 motion-safe:data-[ending-style]:scale-95",
            )}
          >
            {children}
          </M.Popup>
        </M.Positioner>
      </M.Portal>
    </M.Root>
  );
}

export interface MenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /** Style + semantics for a destructive action (delete, remove). */
  destructive?: boolean;
  /** Optional leading icon. */
  icon?: React.ReactNode;
  /** Optional trailing shortcut hint, e.g. "⌘E". */
  shortcut?: string;
}

export function MenuItem({
  children,
  onClick,
  disabled,
  destructive,
  icon,
  shortcut,
}: MenuItemProps) {
  return (
    <M.Item
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex cursor-default select-none items-center gap-2 rounded px-2 py-1.5 outline-none transition-colors",
        "data-[highlighted]:bg-accent data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        destructive
          ? "text-destructive data-[highlighted]:bg-destructive/10"
          : "text-popover-foreground",
      )}
    >
      {icon ? <span className="grid size-4 shrink-0 place-items-center">{icon}</span> : null}
      <span className="flex-1 truncate">{children}</span>
      {shortcut ? (
        <span className="ml-4 text-micro tabular-nums text-muted-foreground">{shortcut}</span>
      ) : null}
    </M.Item>
  );
}

/**
 * A hairline between menu groups. Deliberately a plain div: base-ui@1.6 ships
 * no Menu.Separator part, and its GroupLabel throws outside a Menu.Group (which
 * is why MenuLabel is a plain div too). Don't "upgrade" these to base-ui parts
 * without checking those constraints. `-mx-1` cancels the popup's p-1 so the
 * line runs edge-to-edge; role="separator" keeps the ARIA menu pattern intact.
 */
export function MenuSeparator() {
  return <div role="separator" className="my-1 -mx-1 h-px bg-border" />;
}

export function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2 py-1 text-micro font-medium text-muted-foreground">{children}</div>
  );
}
