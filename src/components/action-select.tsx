"use client";

import type { ReactNode } from "react";

/** A select that submits its form when the value changes. */
export function ActionSelect({
  name,
  defaultValue,
  className,
  label,
  children,
}: {
  name: string;
  defaultValue: string;
  className?: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <label>
      <span className="sr-only">{label}</span>
      <select name={name} defaultValue={defaultValue} className={className} onChange={(event) => event.currentTarget.form?.requestSubmit()}>
        {children}
      </select>
    </label>
  );
}
