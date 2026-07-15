import type { ComponentType, SVGProps } from "react";
import type { MasteryStatus } from "@/lib/types";
import { IconCheckCircle, IconCompass, IconTrend } from "@/components/ui/icons";

// A mastery indicator never relies on colour alone: it always pairs a status
// colour with an icon and a text label.
const STATUS_CONFIG: Record<
  MasteryStatus,
  { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>>; className: string }
> = {
  exploring: {
    label: "Exploring",
    Icon: IconCompass,
    className: "text-moti-exploring bg-moti-exploring-bg border-moti-exploring/25",
  },
  developing: {
    label: "Developing",
    Icon: IconTrend,
    className: "text-moti-developing bg-moti-developing-bg border-moti-developing/25",
  },
  understood: {
    label: "Understood",
    Icon: IconCheckCircle,
    className: "text-moti-understood bg-moti-understood-bg border-moti-understood/25",
  },
};

interface MasteryBadgeProps {
  status: MasteryStatus;
  className?: string;
}

export function MasteryBadge({ status, className }: MasteryBadgeProps) {
  const { label, Icon, className: statusClassName } = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${statusClassName} ${className ?? ""}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
