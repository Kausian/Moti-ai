"use client";

import type { MemoryEchoItem } from "@/lib/types";
import { formatAbsoluteDate, formatDueLabel } from "@/lib/progress/format-date";
import { IconCheckCircle, IconClock, IconRepeat, IconTrash } from "@/components/ui/icons";

interface MemoryEchoItemCardProps {
  item: MemoryEchoItem;
  completed: boolean;
  now: Date;
  onPractise: () => void;
  onReschedule: () => void;
  onRemove: () => void;
}

// One review card. Timing is always shown as text plus an icon, never colour
// alone, and the prompt renders as plain text.
export function MemoryEchoItemCard({
  item,
  completed,
  now,
  onPractise,
  onReschedule,
  onRemove,
}: MemoryEchoItemCardProps) {
  const action =
    "inline-flex items-center gap-1 rounded-full border border-moti-line bg-white px-2 py-0.5 text-[11px] font-medium text-moti-navy transition-colors hover:border-moti-navy/30 hover:bg-moti-navy/5 focus-visible:border-moti-navy/40";

  return (
    <li className="rounded-xl border border-moti-line bg-white p-3">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${
            completed
              ? "bg-moti-understood-bg text-moti-understood"
              : "bg-moti-navy/5 text-moti-navy-soft"
          }`}
        >
          {completed ? (
            <IconCheckCircle className="h-3 w-3" />
          ) : (
            <IconClock className="h-3 w-3" />
          )}
          {completed
            ? `Completed ${formatAbsoluteDate(item.completedAt ?? item.updatedAt)}`
            : formatDueLabel(item.dueAt, now)}
        </span>
        <span className="min-w-0 truncate text-[11px] text-moti-navy-soft">
          {item.conceptTitle}
        </span>
      </div>

      <p className="break-words text-sm leading-5 text-moti-navy">{item.prompt}</p>

      <p className="mt-1 truncate text-[11px] text-moti-navy-soft">
        {item.sourceDocumentTitle}
        {item.sectionHeading ? ` · ${item.sectionHeading}` : ""}
      </p>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <button type="button" onClick={onPractise} className={action}>
          <IconRepeat className="h-3 w-3 text-moti-navy-soft" />
          {completed ? "Practise again" : "Practise now"}
        </button>
        <button type="button" onClick={onReschedule} className={action}>
          <IconClock className="h-3 w-3 text-moti-navy-soft" />
          Review tomorrow
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove review item for ${item.conceptTitle}`}
          className={action}
        >
          <IconTrash className="h-3 w-3 text-moti-navy-soft" />
          Remove
        </button>
      </div>
    </li>
  );
}
