import * as React from "react";
import { cn } from "../lib/cn";

/**
 * Form field wrapper: a label above the control, and a hint or error below.
 * Error wins over hint; errors are text (colour is not the only signal).
 */
export interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  /** Ties the label to the control (pass the control's id). */
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

export function Field({ label, hint, error, htmlFor, className, children }: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-body font-medium text-foreground">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-caption text-verdict-red">{error}</p>
      ) : hint ? (
        <p className="text-caption text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
