import type { SourceReference } from "@/lib/types";
import { IconSource } from "@/components/ui/icons";

// A compact, informational chip identifying a grounded source. Display-only.
export function SourceChip({ source }: { source: SourceReference }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-moti-line bg-moti-navy/[0.03] px-2.5 py-1 text-xs text-moti-navy-soft">
      <IconSource className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate font-medium text-moti-navy">{source.title}</span>
      <span aria-hidden>·</span>
      <span className="truncate">{source.section}</span>
    </span>
  );
}
