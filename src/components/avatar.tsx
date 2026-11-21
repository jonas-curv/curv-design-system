import * as React from "react";
import { cn } from "../lib/cn";

/**
 * A person, rendered identically everywhere: initials on a colour derived
 * deterministically from the name (so the same person is always the same
 * colour), or an image when `src` is given. Use it in table cells, menus,
 * comments — anywhere a person appears — so people never look hand-rolled.
 */
const SIZES = {
  sm: "size-5 text-micro",
  md: "size-7 text-caption",
  lg: "size-9 text-body",
} as const;

// A small, muted, tasteful palette. Deterministic pick keeps a person's colour
// stable across sessions and surfaces.
const HUES = [212, 158, 24, 280, 340, 42, 190, 262];

function hueFor(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

export interface AvatarProps {
  name: string;
  src?: string;
  size?: keyof typeof SIZES;
  className?: string;
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  return (
    <span
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium text-white",
        SIZES[size],
        className,
      )}
      style={src ? undefined : { backgroundColor: `hsl(${hueFor(name)} 42% 46%)` }}
    >
      {src ? (
        <img src={src} alt={name} className="size-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}

export interface AvatarGroupProps {
  children: React.ReactNode;
  className?: string;
}

/** Overlapping avatars (e.g. a deal team), each ringed in the card colour. */
export function AvatarGroup({ children, className }: AvatarGroupProps) {
  return (
    <div className={cn("flex -space-x-1.5 [&>*]:ring-2 [&>*]:ring-card", className)}>
      {children}
    </div>
  );
}
