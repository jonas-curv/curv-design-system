import * as React from "react";
import { cn } from "../lib/cn";

const RadioCtx = React.createContext<{
  value?: string;
  onChange?: (v: string) => void;
}>({});

export interface RadioGroupProps {
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

export function RadioGroup({ value, onValueChange, className, children }: RadioGroupProps) {
  return (
    <RadioCtx.Provider value={{ value, onChange: onValueChange }}>
      <div role="radiogroup" className={cn("flex flex-col gap-2", className)}>
        {children}
      </div>
    </RadioCtx.Provider>
  );
}

export interface RadioProps {
  value: string;
  disabled?: boolean;
  id?: string;
  children?: React.ReactNode;
}

export function Radio({ value, disabled, id, children }: RadioProps) {
  const ctx = React.useContext(RadioCtx);
  const checked = ctx.value === value;
  return (
    <label className={cn("inline-flex items-center gap-2 text-body text-foreground", disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer")}>
      <button
        type="button"
        role="radio"
        aria-checked={checked}
        id={id}
        disabled={disabled}
        onClick={() => ctx.onChange?.(value)}
        className={cn(
          "grid size-4 shrink-0 place-items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
          checked ? "border-primary" : "border-border bg-card",
        )}
      >
        {checked && <span className="size-2 rounded-full bg-primary" />}
      </button>
      {children}
    </label>
  );
}
