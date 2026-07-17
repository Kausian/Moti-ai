import { IconTarget } from "@/components/ui/icons";

// An honest empty state. Nothing is seeded: concepts appear only when a learner
// actually completes an activity and chooses to save it, so the Journey always
// reflects real work.
export function LearningProgressEmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-moti-line bg-moti-navy/[0.02] p-3 text-center">
      <span
        aria-hidden
        className="mx-auto grid h-8 w-8 place-items-center rounded-lg bg-moti-navy/5 text-moti-navy-soft"
      >
        <IconTarget className="h-4 w-4" />
      </span>
      <p className="mt-2 text-xs leading-5 text-moti-navy-soft">
        Complete a Moti Mirror or Micro-Challenge, then save the result to begin
        your Mastery Journey.
      </p>
    </div>
  );
}
