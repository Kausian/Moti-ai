import type { ConceptProgress } from "@/lib/types";
import { activityLabel } from "@/lib/progress/mastery-policy";
import { formatLastActivity } from "@/lib/progress/format-date";
import { IconAlert, IconClock, IconSource } from "@/components/ui/icons";

interface ConceptProgressCardProps {
  concept: ConceptProgress;
  /** True when the original source document has been removed from the course. */
  sourceMissing: boolean;
  now: Date;
}

// One saved concept. A "Needs review" concept keeps its earned mastery — the flag
// is shown alongside the status, never in place of it, and always as an icon plus
// text rather than colour alone.
export function ConceptProgressCard({
  concept,
  sourceMissing,
  now,
}: ConceptProgressCardProps) {
  return (
    <li className="rounded-xl border border-moti-line bg-white px-3 py-2">
      <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
        <p className="min-w-0 break-words text-sm font-medium text-moti-navy">
          {concept.conceptTitle}
        </p>
        {concept.needsReview && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-moti-exploring-bg px-2 py-0.5 text-[11px] font-medium text-moti-exploring">
            <IconClock className="h-3 w-3" />
            Needs review
          </span>
        )}
      </div>

      <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] text-moti-navy-soft">
        <span>{activityLabel(concept.lastActivityType)}</span>
        <span aria-hidden>·</span>
        <span>
          {concept.activityCount} activit{concept.activityCount === 1 ? "y" : "ies"}
        </span>
        <span aria-hidden>·</span>
        <span>{formatLastActivity(concept.lastActivityAt, now)}</span>
      </p>

      <p className="mt-1 flex items-start gap-1 text-[11px] text-moti-navy-soft">
        <IconSource className="mt-0.5 h-3 w-3 shrink-0" />
        <span className="min-w-0 break-words">
          {concept.sourceDocumentTitle}
          {concept.sectionHeading ? ` · ${concept.sectionHeading}` : ""}
        </span>
      </p>

      {sourceMissing && (
        <p className="mt-1 flex items-start gap-1 text-[11px] leading-4 text-moti-navy-soft">
          <IconAlert className="mt-0.5 h-3 w-3 shrink-0 text-moti-exploring" />
          <span>Original source is no longer in the current course.</span>
        </p>
      )}
    </li>
  );
}
