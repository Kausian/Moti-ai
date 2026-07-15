import type { ComponentType, SVGProps } from "react";
import type { LearningAction } from "@/lib/types";
import {
  IconBook,
  IconChat,
  IconLightbulb,
  IconRepeat,
  IconTarget,
} from "@/components/ui/icons";

const ACTION_ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  "explain-simply": IconChat,
  "give-example": IconLightbulb,
  "challenge-me": IconTarget,
  "teach-it-back": IconRepeat,
  "show-source": IconBook,
};

// Static quick actions. Fully styled for hover / active / focus and a
// disabled-ready state, but not wired to behaviour in this phase.
export function LearningActions({ actions }: { actions: LearningAction[] }) {
  return (
    <div>
      <div role="group" aria-label="Learning actions" className="flex flex-wrap gap-2">
        {actions.map((action) => {
          const Icon = ACTION_ICONS[action.id] ?? IconChat;
          return (
            <button
              key={action.id}
              type="button"
              title={action.hint}
              className="inline-flex items-center gap-1.5 rounded-full border border-moti-line bg-white px-3 py-1.5 text-sm font-medium text-moti-navy transition-colors hover:border-moti-navy/30 hover:bg-moti-navy/5 active:bg-moti-navy/10 focus-visible:border-moti-navy/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon className="h-4 w-4 text-moti-navy-soft" />
              {action.label}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] text-moti-navy-soft">
        Learning actions are visual in this preview phase.
      </p>
    </div>
  );
}
