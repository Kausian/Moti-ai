import type { ReactNode } from "react";
import type { MotiMirror } from "@/lib/types";
import { MasteryBadge } from "@/components/ui/MasteryBadge";
import { SourceChip } from "./SourceChip";
import {
  IconAlert,
  IconArrowRight,
  IconCheck,
  IconSparkles,
} from "@/components/ui/icons";

type RowTone = "understood" | "exploring" | "navy";

const TONE_CLASS: Record<RowTone, string> = {
  understood: "bg-moti-understood-bg text-moti-understood",
  exploring: "bg-moti-exploring-bg text-moti-exploring",
  navy: "bg-moti-navy/5 text-moti-navy",
};

function MirrorRow({
  tone,
  label,
  icon,
  children,
}: {
  tone: RowTone;
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-2.5">
      <span
        className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${TONE_CLASS[tone]}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-moti-navy-soft">
          {label}
        </p>
        <p className="text-sm leading-6 text-moti-navy">{children}</p>
      </div>
    </div>
  );
}

// Reusable teach-back feedback card. Wording is supportive and specific, with
// no fabricated confidence percentages.
export function MotiMirrorCard({ mirror }: { mirror: MotiMirror }) {
  return (
    <div className="rounded-2xl border border-moti-line bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-moti-navy text-white">
          <IconSparkles className="h-3.5 w-3.5" />
        </span>
        <span className="text-sm font-semibold text-moti-navy">Moti Mirror</span>
        <span className="text-xs text-moti-navy-soft">Teach-back feedback</span>
      </div>

      <div className="flex flex-col gap-3">
        <MirrorRow
          tone="understood"
          label="Correct understanding"
          icon={<IconCheck className="h-4 w-4" />}
        >
          {mirror.recognised}
        </MirrorRow>
        <MirrorRow
          tone="exploring"
          label="Missing or incorrect idea"
          icon={<IconAlert className="h-4 w-4" />}
        >
          {mirror.misconception}
        </MirrorRow>
        <MirrorRow
          tone="navy"
          label="Better explanation"
          icon={<IconSparkles className="h-4 w-4" />}
        >
          {mirror.correction}
        </MirrorRow>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-moti-line pt-3">
        <div className="flex min-w-0 flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-moti-navy-soft">
            Supporting source
          </span>
          <SourceChip source={mirror.source} />
        </div>
        <div className="flex flex-col items-start gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-moti-navy-soft">
            Mastery status
          </span>
          <MasteryBadge status={mirror.mastery} />
        </div>
      </div>

      <div className="mt-3 flex items-start gap-2 rounded-xl bg-moti-navy/[0.04] p-3">
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-moti-navy text-white">
          <IconArrowRight className="h-3.5 w-3.5" />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-moti-navy-soft">
            Recommended next action
          </p>
          <p className="text-sm leading-6 text-moti-navy">{mirror.nextAction}</p>
        </div>
      </div>
    </div>
  );
}
