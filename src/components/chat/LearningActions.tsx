"use client";

import type { ComponentType, SVGProps } from "react";
import type { SuggestedLearningAction } from "@/lib/types";
import {
  IconArrowRight,
  IconBook,
  IconChat,
  IconLightbulb,
} from "@/components/ui/icons";

const ACTION_CONFIG: Record<
  SuggestedLearningAction,
  { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>> }
> = {
  "explain-simply": { label: "Explain simply", Icon: IconChat },
  "give-example": { label: "Give an example", Icon: IconLightbulb },
  "show-source": { label: "Show source", Icon: IconBook },
  "ask-follow-up": { label: "Ask a follow-up", Icon: IconArrowRight },
};

interface LearningActionsProps {
  actions: SuggestedLearningAction[];
  hasSources: boolean;
  disabled: boolean;
  onExplainSimply: () => void;
  onGiveExample: () => void;
  onShowSource: () => void;
  onAskFollowUp: () => void;
}

// Renders the actions Moti suggested for one answer. "show-source" opens a local
// preview and never calls the API, so it stays enabled while a request is
// pending; the others send a grounded follow-up and are disabled while pending.
export function LearningActions({
  actions,
  hasSources,
  disabled,
  onExplainSimply,
  onGiveExample,
  onShowSource,
  onAskFollowUp,
}: LearningActionsProps) {
  const handlers: Record<SuggestedLearningAction, () => void> = {
    "explain-simply": onExplainSimply,
    "give-example": onGiveExample,
    "show-source": onShowSource,
    "ask-follow-up": onAskFollowUp,
  };

  const visible = actions.filter(
    (action) => action !== "show-source" || hasSources,
  );
  if (visible.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Suggested actions"
      className="mt-2 flex flex-wrap items-center gap-1.5"
    >
      {visible.map((action) => {
        const { label, Icon } = ACTION_CONFIG[action];
        const isDisabled = disabled && action !== "show-source";
        return (
          <button
            key={action}
            type="button"
            onClick={handlers[action]}
            disabled={isDisabled}
            className="inline-flex items-center gap-1.5 rounded-full border border-moti-line bg-white px-2.5 py-1 text-xs font-medium text-moti-navy transition-colors hover:border-moti-navy/30 hover:bg-moti-navy/5 focus-visible:border-moti-navy/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Icon className="h-3.5 w-3.5 text-moti-navy-soft" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
