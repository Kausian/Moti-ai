import type { ReactNode } from "react";
import { IconAlert } from "@/components/ui/icons";

export const inputClass =
  "w-full rounded-lg border border-moti-line bg-white px-3 py-2 text-sm text-moti-navy placeholder:text-moti-navy-soft/70 focus:border-moti-navy/40 focus:outline-none";

export const inputInvalidClass = "border-moti-danger focus:border-moti-danger";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-moti-navy">
        {label}
        {required && (
          <span className="text-moti-danger" aria-hidden>
            {" *"}
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          className="flex items-center gap-1 text-xs font-medium text-moti-danger"
        >
          <IconAlert className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-moti-navy-soft">{hint}</p>
      ) : null}
    </div>
  );
}
