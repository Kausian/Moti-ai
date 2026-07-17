import { IconTarget } from "@/components/ui/icons";
import { EmptyState } from "@/components/ui/EmptyState";

// An honest empty state. Nothing is seeded: concepts appear only when a learner
// actually completes an activity and chooses to save it, so the Journey always
// reflects real work.
export function LearningProgressEmptyState() {
  return (
    <EmptyState
      Icon={IconTarget}
      title="No saved progress yet"
      description="Complete a Moti Mirror or Micro-Challenge, then save the result to begin your Mastery Journey."
    />
  );
}
