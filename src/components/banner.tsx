import * as React from "react";
import { cn } from "../lib/cn";

/**
 * Banner — a rare, persistent page-level status callout ("Sample data", "Needs
 * Ops pricing", a disconnected source). Semantic variant drives a WHISPER tint
 * of the hue + a matching hairline border + a coloured icon (Geist/Polaris
 * pattern) — not a loud wash, not a left accent stripe. Max one per view.
 */
export type BannerVariant = "info" | "warning" | "success" | "danger";

export interface BannerProps {
  variant?: BannerVariant;
  /** Override the default variant icon. Pass `null` to hide it. */
  icon?: React.ReactNode;
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Right-aligned actions (a button, a link). */
  actions?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
}

// A WHISPER tint of the hue (~7%) + a matching hairline border + a coloured
// icon — the Geist/Polaris/Chatbase pattern. Not a loud verdict wash (the thing
// design-system.md actually bans), and not the AI-cliché left accent stripe.
// Info stays neutral. See design-system.md → Semantic color.
const VARIANT: Record<BannerVariant, { box: string; icon: string }> = {
  info: { box: "border-border bg-muted/50", icon: "text-muted-foreground" },
  warning: { box: "border-verdict-amber/25 bg-verdict-amber/[0.07]", icon: "text-verdict-amber" },
  success: { box: "border-verdict-green/25 bg-verdict-green/[0.07]", icon: "text-verdict-green" },
  danger: { box: "border-verdict-red/25 bg-verdict-red/[0.07]", icon: "text-verdict-red" },
};

function DefaultIcon({ variant }: { variant: BannerVariant }) {
  const common = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (variant === "success") return <svg {...common}><path d="M20 6 9 17l-5-5" /></svg>;
  if (variant === "danger") return <svg {...common}><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6M9 9l6 6" /></svg>;
  if (variant === "warning") return <svg {...common}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>;
}

export function Banner({ variant = "info", icon, title, children, actions, onDismiss, className }: BannerProps) {
  const v = VARIANT[variant];
  return (
    <div role="status" className={cn("flex items-start gap-3 rounded-lg border p-3 text-body", v.box, className)}>
      {icon !== null && (
        <span className={cn("mt-px shrink-0", v.icon)}>{icon ?? <DefaultIcon variant={variant} />}</span>
      )}
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium text-foreground text-pretty">{title}</p>}
        {children && <div className={cn("text-muted-foreground text-pretty", title && "mt-0.5")}>{children}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="-my-1 -mr-1 shrink-0 rounded p-1 text-muted-foreground/70 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      )}
    </div>
  );
}
