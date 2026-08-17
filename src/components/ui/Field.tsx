"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

export interface FieldProps {
  label: string;
  helperText?: string;
  errorText?: string;
  required?: boolean;
  className?: string;
  children: (fieldProps: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => React.ReactNode;
}

/**
 * Wires label/helper/error text to the control via aria-describedby +
 * aria-invalid, and renders the control through a render-prop so it works
 * with both Input and Textarea (or any future control) without duplicating
 * this accessibility wiring in each one.
 */
export function Field({ label, helperText, errorText, required, className, children }: FieldProps) {
  const id = React.useId();
  const helperId = `${id}-helper`;
  const errorId = `${id}-error`;
  const describedBy = errorText ? errorId : helperText ? helperId : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-body-sm font-medium text-ink-900">
        {label}
        {required && <span className="text-danger-500"> *</span>}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": !!errorText })}
      {errorText ? (
        <p id={errorId} className="text-body-sm text-danger-500" role="alert">
          {errorText}
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-body-sm text-ink-500">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
