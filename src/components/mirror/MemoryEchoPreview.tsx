import { IconClock } from "@/components/ui/icons";

interface MemoryEchoPreviewProps {
  prompt: string;
}

// The Remember step of the loop: one short recall prompt for later review.
// It is deliberately a preview only — Phase 7 does not persist, schedule, or add
// it to the real Memory Echo queue, and the copy says so plainly rather than
// implying a feature that does not exist yet.
export function MemoryEchoPreview({ prompt }: MemoryEchoPreviewProps) {
  return (
    <section
      aria-label="Memory Echo preview"
      className="rounded-xl border border-dashed border-moti-line bg-gradient-to-br from-moti-pink/20 via-moti-peach/15 to-moti-yellow/20 p-3"
    >
      <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-moti-navy-soft">
        <IconClock className="h-3.5 w-3.5" />
        Memory Echo preview
      </p>
      <p className="mt-1.5 break-words text-sm leading-6 text-moti-navy">{prompt}</p>
      <p className="mt-1.5 text-[11px] leading-4 text-moti-navy-soft">
        This review prompt is not scheduled or saved yet.
      </p>
    </section>
  );
}
