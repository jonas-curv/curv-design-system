"use client";

import * as React from "react";
import { cn } from "../../../lib/cn";
import { hasNode, useIsomorphicLayoutEffect } from "./shared";

/** What every phone field says around its control. */
interface MobileFieldText {
  /** The visible label, above the control. Always shown: a placeholder is not a label. */
  label: React.ReactNode;
  /** Help that stays visible under the control: a format, a limit. Read after the label when the control is focused. */
  hint?: React.ReactNode;
  /** What is wrong, under the control. The control becomes invalid (`aria-invalid`), the message is read when it is focused and
   *  announced when it appears (`role="alert"`). Leave it out, or pass nothing, when the value is fine. */
  error?: React.ReactNode;
  /** A class for the box that holds label, control, hint and error (spacing around the whole field). `className` goes to the control. */
  fieldClassName?: string;
}

export interface MobileTextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">, MobileFieldText {}
export interface MobileTextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement>, MobileFieldText {}
export interface MobileDateFieldProps extends Omit<MobileTextFieldProps, "type"> {
  /** Adds a plain "Clear" button to the label row while the field has a value. The app empties its value; an uncontrolled field also
   *  empties itself. If the button had focus (keyboard, screen reader) focus goes back to the field, since the button is gone; after a
   *  tap it does not, because on iOS focusing a date input opens its picker. The row is held while the button is hidden, so nothing moves. */
  onClear?: () => void;
  /** Default "Clear". The button's accessible name is this plus the label ("Clear Due date"), so it says what it clears. */
  clearLabel?: string;
}

/** The ids that tie a field's label, hint and error to its control. An id the app passed is used as is. */
function useFieldIds(idProp: string | undefined, hint: React.ReactNode, error: React.ReactNode, describedBy: string | undefined) {
  const generated = React.useId();
  const id = idProp ?? generated;
  const hasHint = hasNode(hint);
  const hasError = hasNode(error);
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const ids = [describedBy, hasHint && hintId, hasError && errorId].filter(Boolean).join(" ");
  return { id, hintId, errorId, hasHint, hasError, describedBy: ids || undefined };
}

function FieldFrame({ ids, label, labelId, hint, error, fieldClassName, action, children }: MobileFieldText & {
  ids: ReturnType<typeof useFieldIds>; labelId?: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className={cn("curv-mobile-field", fieldClassName)} data-invalid={ids.hasError || undefined}>
      <div className="curv-mobile-field-head" data-action={action !== undefined || undefined}>
        <label id={labelId} className="curv-mobile-field-label" htmlFor={ids.id}>{label}</label>
        {action}
      </div>
      {children}
      {ids.hasHint && <p id={ids.hintId} className="curv-mobile-field-hint">{hint}</p>}
      {ids.hasError && <p id={ids.errorId} className="curv-mobile-field-error" role="alert">{error}</p>}
    </div>
  );
}

const mergeRefs = <T,>(...refs: React.Ref<T>[]) => (node: T | null) => {
  for (const ref of refs) {
    if (typeof ref === "function") ref(node);
    else if (ref) (ref as React.MutableRefObject<T | null>).current = node;
  }
};

/**
 * A single-line phone field: a visible label, a 44px-or-taller control at 17px (16px and up, so iOS does not zoom the page when it
 * is focused), full width, with an optional hint and error wired to it (`aria-describedby`, `aria-invalid`). The ref and every
 * native input prop (`type`, `inputMode`, `autoComplete`, `enterKeyHint`, `value`, …) reach the input; `type` defaults to "text".
 */
export const MobileTextField = React.forwardRef<HTMLInputElement, MobileTextFieldProps>(function MobileTextField(
  { label, hint, error, fieldClassName, id: idProp, type = "text", className, "aria-describedby": describedBy, "aria-invalid": invalid, ...props }, ref,
) {
  const ids = useFieldIds(idProp, hint, error, describedBy);
  return (
    <FieldFrame ids={ids} label={label} hint={hint} error={error} fieldClassName={fieldClassName}>
      <input {...props} ref={ref} id={ids.id} type={type} className={cn("curv-mobile-field-control", className)} aria-invalid={ids.hasError ? true : invalid} aria-describedby={ids.describedBy} />
    </FieldFrame>
  );
});

/** A multi-line phone field (4 rows unless `rows` says otherwise): the same label, hint, error and 17px text as `MobileTextField`. */
export const MobileTextArea = React.forwardRef<HTMLTextAreaElement, MobileTextAreaProps>(function MobileTextArea(
  { label, hint, error, fieldClassName, id: idProp, rows = 4, className, "aria-describedby": describedBy, "aria-invalid": invalid, ...props }, ref,
) {
  const ids = useFieldIds(idProp, hint, error, describedBy);
  return (
    <FieldFrame ids={ids} label={label} hint={hint} error={error} fieldClassName={fieldClassName}>
      <textarea {...props} ref={ref} id={ids.id} rows={rows} className={cn("curv-mobile-field-control curv-mobile-field-textarea", className)} aria-invalid={ids.hasError ? true : invalid} aria-describedby={ids.describedBy} />
    </FieldFrame>
  );
});

const hasText = (value: unknown) => value != null && String(value) !== "";

/**
 * The browser's own date picker, dressed for a phone: a native `<input type="date">` (so the OS picker opens, with its keyboard and
 * accessibility) at 44px or taller, 17px, full width, under a visible label. `value` is `YYYY-MM-DD`, as for any date input.
 * With `onClear` a plain "Clear" button sits at the end of the label row while there is a value. An uncontrolled field reads the
 * input's real value (after every render, on `input` and `change`, and after its form is reset), so Clear follows a form library
 * that writes through the ref as well as a person typing. A write that causes neither a render nor an event cannot be seen: use
 * a controlled `value` where that matters.
 */
export const MobileDateField = React.forwardRef<HTMLInputElement, MobileDateFieldProps>(function MobileDateField(
  { label, hint, error, fieldClassName, id: idProp, onClear, clearLabel = "Clear", className, "aria-describedby": describedBy, "aria-invalid": invalid, ...props }, ref,
) {
  const ids = useFieldIds(idProp, hint, error, describedBy);
  const input = React.useRef<HTMLInputElement>(null);
  // One ref callback for the life of the field: a form library's own callback ref must not be called again on every render.
  const merged = React.useMemo(() => mergeRefs(input, ref), [ref]);
  const controlled = props.value !== undefined;
  const [filled, setFilled] = React.useState(() => hasText(controlled ? props.value : props.defaultValue));
  const sync = React.useCallback(() => { const control = input.current; if (control) setFilled(control.value !== ""); }, []);
  // An uncontrolled input's value is the DOM's: what was typed, what a form library wrote through the ref, what a reset put back.
  useIsomorphicLayoutEffect(() => { if (!controlled) sync(); });
  React.useEffect(() => {
    const control = input.current;
    if (controlled || !control) return;
    const form = control.form;
    let timer = 0;
    // `reset` is dispatched before the form puts its values back, so look a moment later.
    const afterReset = () => { window.clearTimeout(timer); timer = window.setTimeout(sync, 0); };
    control.addEventListener("input", sync);
    control.addEventListener("change", sync);
    form?.addEventListener("reset", afterReset);
    return () => {
      window.clearTimeout(timer);
      control.removeEventListener("input", sync);
      control.removeEventListener("change", sync);
      form?.removeEventListener("reset", afterReset);
    };
  }, [controlled, sync]);
  const hasValue = controlled ? hasText(props.value) : filled;
  const clearable = onClear !== undefined;
  const textLabel = typeof label === "string";
  const clearId = `${ids.id}-clear`;
  const labelId = `${ids.id}-label`;
  const clear = (
    <button
      type="button"
      id={clearId}
      className="curv-mobile-field-clear"
      // "Clear Due date". A label that is not plain text cannot be put in an aria-label, so the button is named by itself and the label.
      aria-label={textLabel ? `${clearLabel} ${label}` : undefined}
      aria-labelledby={textLabel ? undefined : `${clearId} ${labelId}`}
      onClick={event => {
        // Only a button that has focus loses it when it goes. Focusing the input after a tap would, on iOS, open the picker again.
        const hadFocus = document.activeElement === event.currentTarget;
        const control = input.current;
        if (!controlled && control) { control.value = ""; setFilled(false); }
        onClear?.();
        if (hadFocus) control?.focus();
      }}
    >
      {clearLabel}
    </button>
  );
  return (
    <FieldFrame ids={ids} label={label} labelId={clearable && !textLabel ? labelId : undefined} hint={hint} error={error} fieldClassName={fieldClassName} action={clearable ? (hasValue ? clear : null) : undefined}>
      <input
        {...props}
        ref={merged}
        id={ids.id}
        type="date"
        className={cn("curv-mobile-field-control", className)}
        aria-invalid={ids.hasError ? true : invalid}
        aria-describedby={ids.describedBy}
      />
    </FieldFrame>
  );
});
