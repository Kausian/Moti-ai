import type { ReactNode } from "react";

interface SectionHeaderProps {
  /** Small uppercase eyebrow label (e.g. "Current concept", "Learning loop"). */
  eyebrow: string;
  /** Optional trailing content (a badge, a count, an action). */
  trailing?: ReactNode;
  className?: string;
}

// One consistent style for the small uppercase eyebrow labels that recur across
// the assistant, mirror, challenge, journey, and settings panels. Standardised at
// a readable size (11px + tracking) rather than the 10px used in a few places.
export function SectionHeader({ eyebrow, trailing, className }: SectionHeaderProps) {
  return (
    <div className={`flex items-center justify-between gap-2 ${className ?? ""}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
        {eyebrow}
      </p>
      {trailing}
    </div>
  );
}
