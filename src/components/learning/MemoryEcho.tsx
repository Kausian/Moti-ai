"use client";

import { useState } from "react";
import type { MemoryEchoItem } from "@/lib/types";
import { groupMemoryEchoItems } from "@/lib/progress/selectors";
import { IconChevron, IconClock } from "@/components/ui/icons";
import { MemoryEchoItemCard } from "./MemoryEchoItemCard";

interface MemoryEchoProps {
  items: MemoryEchoItem[];
  /** Injected so grouping is deterministic and needs no per-item timers. */
  now: Date;
  onPractise: (item: MemoryEchoItem) => void;
  onReschedule: (item: MemoryEchoItem) => void;
  onRemove: (item: MemoryEchoItem) => void;
}

function Group({
  title,
  items,
  completed,
  now,
  onPractise,
  onReschedule,
  onRemove,
}: {
  title: string;
  items: MemoryEchoItem[];
  completed: boolean;
  now: Date;
  onPractise: (item: MemoryEchoItem) => void;
  onReschedule: (item: MemoryEchoItem) => void;
  onRemove: (item: MemoryEchoItem) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-moti-navy-soft">
        {title}
      </p>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <MemoryEchoItemCard
            key={item.id}
            item={item}
            completed={completed}
            now={now}
            onPractise={() => onPractise(item)}
            onReschedule={() => onReschedule(item)}
            onRemove={() => onRemove(item)}
          />
        ))}
      </ul>
    </div>
  );
}

// The real review queue, derived from persisted items. Completed items are
// collapsed by default so the panel stays compact, but are never auto-deleted.
export function MemoryEcho({
  items,
  now,
  onPractise,
  onReschedule,
  onRemove,
}: MemoryEchoProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const { due, later, completed } = groupMemoryEchoItems(items, now);

  return (
    <section
      aria-label="Memory Echo review queue"
      className="rounded-2xl border border-moti-line bg-moti-surface p-4 shadow-sm"
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="grid h-7 w-7 place-items-center rounded-lg bg-moti-navy/5 text-moti-navy"
        >
          <IconClock className="h-4 w-4" />
        </span>
        <h2 className="text-sm font-semibold text-moti-navy">Memory Echo</h2>
      </div>
      <p className="mt-1.5 text-xs leading-5 text-moti-navy-soft">
        Saved recall prompts come back for review. Timing is a simple prototype
        heuristic, and you decide how each review went.
      </p>

      {items.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-moti-line bg-moti-navy/[0.02] p-3 text-center text-xs leading-5 text-moti-navy-soft">
          No review prompts yet. Save a Moti Mirror or Micro-Challenge result that
          includes one.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-3">
          <Group
            title="Due now"
            items={due}
            completed={false}
            now={now}
            onPractise={onPractise}
            onReschedule={onReschedule}
            onRemove={onRemove}
          />
          <Group
            title="Review later"
            items={later}
            completed={false}
            now={now}
            onPractise={onPractise}
            onReschedule={onReschedule}
            onRemove={onRemove}
          />

          {completed.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowCompleted((open) => !open)}
                aria-expanded={showCompleted}
                className="flex w-full items-center gap-1.5 rounded-lg px-1 py-1 text-[11px] font-semibold uppercase tracking-wide text-moti-navy-soft transition-colors hover:bg-moti-navy/5 focus-visible:bg-moti-navy/5"
              >
                <IconChevron
                  className={`h-3 w-3 transition-transform ${showCompleted ? "rotate-90" : ""}`}
                />
                Completed ({completed.length})
              </button>
              {showCompleted && (
                <div className="mt-1.5">
                  <Group
                    title=""
                    items={completed}
                    completed
                    now={now}
                    onPractise={onPractise}
                    onReschedule={onReschedule}
                    onRemove={onRemove}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
