import type { MasterySummary as Summary } from "@/lib/progress/selectors";
import { IconClock } from "@/components/ui/icons";

interface MasterySummaryProps {
  summary: Summary;
}

// Honest counts only — no percentages, scores, or progress bars implying a
// measured level of ability.
export function MasterySummary({ summary }: MasterySummaryProps) {
  const items: { label: string; value: number }[] = [
    { label: "Exploring", value: summary.exploring },
    { label: "Developing", value: summary.developing },
    { label: "Understood", value: summary.understood },
  ];

  return (
    <div className="rounded-xl border border-moti-line bg-moti-navy/[0.02] p-2.5">
      <dl className="grid grid-cols-3 gap-2 text-center">
        {items.map((item) => (
          <div key={item.label}>
            <dt className="text-[11px] leading-4 text-moti-navy-soft">
              {item.label}
            </dt>
            <dd className="text-base font-semibold text-moti-navy">{item.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t border-moti-line pt-2 text-[11px] text-moti-navy-soft">
        <span>
          {summary.total} concept{summary.total === 1 ? "" : "s"} saved
        </span>
        {summary.needsReview > 0 && (
          <>
            <span aria-hidden>·</span>
            <span className="inline-flex items-center gap-1 font-medium text-moti-exploring">
              <IconClock className="h-3 w-3" />
              {summary.needsReview} needs review
            </span>
          </>
        )}
      </p>
    </div>
  );
}
