import type { ComponentType, ReactNode, SVGProps } from "react";

interface EmptyStateProps {
  Icon?: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  description?: string;
  /** Optional action(s) — e.g. a Button. */
  children?: ReactNode;
  className?: string;
}

// A calm, intentional empty state — never a bare "nothing here" placeholder.
// Used where a panel or list can legitimately be empty (no messages, no progress,
// no review items, no documents).
export function EmptyState({
  Icon,
  title,
  description,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-xl border border-dashed border-border-subtle bg-surface-muted/50 px-5 py-8 text-center ${className ?? ""}`}
    >
      {Icon && (
        <span
          aria-hidden
          className="grid h-10 w-10 place-items-center rounded-full bg-surface-panel text-moti-navy-soft shadow-[var(--shadow-1)]"
        >
          <Icon className="h-5 w-5" />
        </span>
      )}
      <p className="text-sm font-semibold text-moti-navy">{title}</p>
      {description && (
        <p className="max-w-xs text-xs leading-5 text-text-secondary">{description}</p>
      )}
      {children && <div className="mt-1">{children}</div>}
    </div>
  );
}
