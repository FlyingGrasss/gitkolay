import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

export const inputClasses = (className?: string): string =>
  cx(
    "block w-full rounded-field border border-line bg-surface px-3 py-2.5 text-base text-ink placeholder:text-muted focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/25 disabled:cursor-not-allowed disabled:bg-subtle disabled:text-muted",
    className,
  );

export const textareaClasses = (className?: string): string =>
  cx(
    "block w-full rounded-field border border-line bg-surface px-3 py-2.5 font-mono text-sm leading-6 text-ink placeholder:text-muted focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus/25 disabled:cursor-not-allowed disabled:bg-subtle disabled:text-muted",
    className,
  );

export const labelClasses = "block text-sm font-medium text-ink";

export const helpClasses = "mt-1.5 text-sm text-muted";

export function FieldError({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  return (
    <p id={id} className="mt-1.5 text-sm font-medium text-danger">
      {children}
    </p>
  );
}
