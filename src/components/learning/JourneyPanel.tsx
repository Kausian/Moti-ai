import type { LearningConcept, MasteryStatus, ReviewItem } from "@/lib/types";
import { MasteryBadge } from "@/components/ui/MasteryBadge";
import { MemoryEcho } from "./MemoryEcho";
import { IconClock } from "@/components/ui/icons";

const MASTERY_GROUPS: MasteryStatus[] = ["exploring", "developing", "understood"];

function ConceptCard({ concept }: { concept: LearningConcept }) {
  return (
    <li className="rounded-xl border border-moti-line bg-white px-3 py-2">
      <p className="text-sm font-medium text-moti-navy">{concept.name}</p>
      <p className="text-xs leading-5 text-moti-navy-soft">{concept.detail}</p>
    </li>
  );
}

function ConceptGroup({
  status,
  concepts,
}: {
  status: MasteryStatus;
  concepts: LearningConcept[];
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <MasteryBadge status={status} />
        <span className="text-xs text-moti-navy-soft">
          {concepts.length} concept{concepts.length === 1 ? "" : "s"}
        </span>
      </div>
      {concepts.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {concepts.map((concept) => (
            <ConceptCard key={concept.id} concept={concept} />
          ))}
        </ul>
      ) : (
        <p className="px-1 text-xs text-moti-navy-soft">No concepts here yet.</p>
      )}
    </div>
  );
}

interface JourneyPanelProps {
  concepts: LearningConcept[];
  reviewItems: ReviewItem[];
}

export function JourneyPanel({ concepts, reviewItems }: JourneyPanelProps) {
  const reviewReady = concepts.filter((concept) => concept.dueForReview);

  return (
    <aside aria-label="Mastery Journey and review" className="flex flex-col gap-3">
      <section className="rounded-2xl border border-moti-line bg-moti-surface p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-moti-navy">Mastery Journey</h2>
        <p className="mt-0.5 text-xs text-moti-navy-soft">
          Where each concept sits right now — no points or streaks, just progress.
        </p>

        <div className="mt-3 flex flex-col gap-4">
          {MASTERY_GROUPS.map((status) => (
            <ConceptGroup
              key={status}
              status={status}
              concepts={concepts.filter(
                (concept) => concept.status === status && !concept.dueForReview,
              )}
            />
          ))}

          {reviewReady.length > 0 && (
            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-moti-line bg-moti-navy/5 px-2.5 py-1 text-xs font-medium text-moti-navy-soft">
                  <IconClock className="h-3.5 w-3.5" />
                  Ready for review
                </span>
                <span className="text-xs text-moti-navy-soft">
                  {reviewReady.length} concept{reviewReady.length === 1 ? "" : "s"}
                </span>
              </div>
              <ul className="flex flex-col gap-1.5">
                {reviewReady.map((concept) => (
                  <ConceptCard key={concept.id} concept={concept} />
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>

      <MemoryEcho items={reviewItems} />
    </aside>
  );
}
