import * as React from "react";
import { cn } from "../lib/cn";

const FIELD =
  "w-full rounded-md border border-border bg-card text-base sm:text-[13px] text-foreground placeholder:text-muted-foreground/70 transition focus:outline-none focus:ring-1 focus:ring-foreground/20 disabled:cursor-not-allowed disabled:opacity-50";

/** Single-line text input — fixed `h-9` (the toolbar/form control height). */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input ref={ref} type={type} className={cn(FIELD, "h-11 sm:h-9 px-3", className)} {...props} />
  ),
);
Input.displayName = "Input";

/** Multi-line text input. */
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}
export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, rows = 4, ...props }, ref) => (
    <textarea ref={ref} rows={rows} className={cn(FIELD, "min-h-[80px] px-3 py-2 leading-relaxed", className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";
