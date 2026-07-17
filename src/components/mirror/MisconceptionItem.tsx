import type { MotiMirrorMisconception } from "@/lib/types";
import { IconAlert, IconCheckCircle } from "@/components/ui/icons";

interface MisconceptionItemProps {
  misconception: MotiMirrorMisconception;
}

// One detected misconception: the learner's idea (paraphrased by Moti, never a
// fabricated quote) paired with the source-grounded correction. Rendered as
// plain text — no Markdown or HTML is interpreted.
export function MisconceptionItem({ misconception }: MisconceptionItemProps) {
  return (
    <li className="rounded-lg border border-moti-line bg-moti-navy/[0.02] p-2.5">
      <p className="flex items-start gap-1.5 text-xs leading-5 text-moti-navy-soft">
        <IconAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-moti-exploring" />
        <span className="break-words">{misconception.learnerIdea}</span>
      </p>
      <p className="mt-1.5 flex items-start gap-1.5 text-sm leading-6 text-moti-navy">
        <IconCheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-moti-understood" />
        <span className="break-words">{misconception.correction}</span>
      </p>
    </li>
  );
}
