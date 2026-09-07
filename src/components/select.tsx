"use client";

import * as React from "react";
import { Select as S } from "@base-ui/react/select";
import { cn } from "../lib/cn";

/**
 * Select — a styled dropdown (base-ui), matching our menus, not the native OS
 * picker. Pass `items` for the option list; the trigger shows the selected label.
 */
export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  items: SelectOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Select({
  items,
  value,
  defaultValue,
  onValueChange,
  placeholder = "Select…",
  disabled,
  id,
  className,
}: SelectProps) {
  return (
    <S.Root
      items={items}
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange ? (v) => onValueChange(v ?? "") : undefined}
      disabled={disabled}
    >
      <S.Trigger
        id={id}
        className={cn(
          "flex h-11 sm:h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-card px-3 text-[13px] text-foreground transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20 disabled:cursor-not-allowed disabled:opacity-50 data-[popup-open]:ring-1 data-[popup-open]:ring-foreground/20",
          className,
        )}
      >
        <S.Value placeholder={placeholder} />
        <S.Icon className="text-muted-foreground">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m6 9 6 6 6-6" />
          </svg>
        </S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Positioner side="bottom" align="start" sideOffset={6} alignItemWithTrigger={false} className="z-50">
          <S.Popup className="max-h-[min(24rem,var(--available-height))] min-w-[var(--anchor-width)] overflow-y-auto rounded-lg border border-border bg-popover p-1 text-[13px] text-popover-foreground shadow-lg outline-none">
            {items.map((it) => (
              <S.Item
                key={it.value}
                value={it.value}
                className="relative flex cursor-default select-none items-center rounded py-1.5 pl-2 pr-8 outline-none transition-colors data-[highlighted]:bg-accent data-[selected]:font-medium"
              >
                <S.ItemText>{it.label}</S.ItemText>
                <S.ItemIndicator className="absolute right-2 inline-flex text-foreground">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </S.ItemIndicator>
              </S.Item>
            ))}
          </S.Popup>
        </S.Positioner>
      </S.Portal>
    </S.Root>
  );
}
