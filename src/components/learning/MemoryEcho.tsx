import type { ReviewItem, ReviewTiming } from "@/lib/types";
import { IconClock } from "@/components/ui/icons";

const TIMING_CONFIG: Record<ReviewTiming, { label: string; className: string }> = {
  due: { label: "Due now", className: "text-moti-exploring bg-moti-exploring-bg" },
  later: { label: "Later", className: "text-moti-navy-soft bg-moti-navy/5" },
};

function ReviewGroup({ title, items }: { title: string; items: ReviewItem[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-moti-navy-soft">
        {title}
      </p>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => {
          const timing = TIMING_CONFIG[item.timing];
          return (
            <li
              key={item.id}
              className="rounded-xl border border-moti-line bg-white p-3"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${timing.className}`}
                >
                  <IconClock className="h-3 w-3" />
                  {timing.label}
                </span>
                <span className="truncate text-[11px] text-moti-navy-soft">
                  {item.concept}
                </span>
              </div>
              <p className="text-sm leading-5 text-moti-navy">{item.prompt}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function MemoryEcho({ items }: { items: ReviewItem[] }) {
  const due = items.filter((item) => item.timing === "due");
  const later = items.filter((item) => item.timing === "later");

  return (
    <section
      aria-label="Memory Echo review queue"
      className="rounded-2xl border border-moti-line bg-moti-surface p-4 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-moti-navy/5 text-moti-navy">
          <IconClock className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-semibold text-moti-navy">Memory Echo</h2>
      </div>
      <p className="mt-1.5 text-xs leading-5 text-moti-navy-soft">
        Memory Echo brings concepts back for review just as they start to fade,
        so they stick for longer.
      </p>
      <div className="mt-3 flex flex-col gap-3">
        <ReviewGroup title="Due now" items={due} />
        <ReviewGroup title="Review later" items={later} />
      </div>
    </section>
  );
}
