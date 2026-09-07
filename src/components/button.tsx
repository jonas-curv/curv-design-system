import * as React from "react";
import { cn } from "../lib/cn";

/**
 * The one button. Variants + sizes only — no bespoke buttons per app. Presses
 * with a subtle `scale(0.97)` (see motion-system). Height is fixed per size
 * (default h-9 / 36px), never padding-derived.
 */
type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive";
type ButtonSize = "sm" | "default" | "icon";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline: "border border-border bg-card text-foreground hover:border-foreground/20 hover:bg-accent",
  ghost: "text-foreground hover:bg-accent",
  destructive: "bg-destructive text-white hover:bg-destructive/90",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-11 sm:h-8 gap-1.5 px-2.5 text-[13px]",
  default: "h-11 sm:h-9 gap-1.5 px-3.5 text-[13px]",
  icon: "size-11 sm:size-9",
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Show a spinner and disable, preserving width (the label goes invisible). */
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "default", type = "button", loading = false, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "relative inline-flex items-center justify-center rounded-md font-medium transition-[transform,background-color,border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 grid place-items-center" aria-hidden>
          <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" className="opacity-25" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </span>
      )}
      {/* Keep the label in flow (invisible) so width doesn't jump. */}
      <span className={cn("inline-flex items-center gap-1.5", loading && "invisible")}>{children}</span>
    </button>
  ),
);
Button.displayName = "Button";
