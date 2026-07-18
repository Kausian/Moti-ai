"use client";

import { useMemo, useState } from "react";
import { AppHeader } from "./AppHeader";
import { MobilePanelTabs, type WorkspacePanel } from "./MobilePanelTabs";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { ConversationPanel } from "@/components/chat/ConversationPanel";
import { JourneyPanel } from "@/components/learning/JourneyPanel";
import { SettingsDrawer } from "@/components/settings/SettingsDrawer";
import { useCourseConfiguration } from "@/hooks/useCourseConfiguration";
import { useMotiConversation } from "@/hooks/useMotiConversation";
import { useMotiMirror } from "@/hooks/useMotiMirror";
import { useMotiChallenge } from "@/hooks/useMotiChallenge";
import { useMotiVisualState } from "@/hooks/useMotiVisualState";
import { combineAvatarSignals } from "@/lib/avatar/state-mapping";
import type { LoopStage, MotiLearningLoopStage } from "@/lib/types";
import { LOOP_STAGES, demoCourse } from "@/data/demo-data";

/** The Moti Mirror stage names map onto the displayed learning-loop stages. */
const LOOP_STAGE_LABEL: Record<MotiLearningLoopStage, LoopStage> = {
  think: "Think",
  explain: "Explain",
  correct: "Correct",
  remember: "Remember",
};

// The workspace shell owns presentational UI state (mobile panel + drawer). The
// editable course title and learner level come from the configuration context;
// the rest of the workspace still uses illustrative demo data.
export function LearningWorkspace() {
  const { configuration } = useCourseConfiguration();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<WorkspacePanel>("conversation");

  // The conversation is owned here so both the conversation panel and the 3D
  // Moti assistant read one source of truth; Moti's visual state is derived from
  // real conversation behaviour (pending / error / new answer / composing).
  const conversation = useMotiConversation();
  const mirror = useMotiMirror();
  const challenge = useMotiChallenge();
  const [composerActive, setComposerActive] = useState(false);
  // Memory Echo recall is local-only, but Moti may still listen while typing.
  const [reviewTyping, setReviewTyping] = useState(false);
  const answerCount = useMemo(
    () =>
      conversation.messages.filter(
        (message) => message.role === "assistant" && message.status === "complete",
      ).length,
    [conversation.messages],
  );

  // One priority order governs both the conversation and the teach-back, so a
  // pending evaluation outranks idle/listening while normal chat still works.
  const visualState = useMotiVisualState(
    combineAvatarSignals(
      {
        requestPending: conversation.isPending,
        hasError: conversation.error !== null,
        // Memory Echo typing only ever adds "listening" — it never outranks an
        // active chat, Mirror, or challenge request.
        composing: composerActive || reviewTyping,
        answerCount,
        hasMessages: conversation.messages.length > 0,
      },
      {
        active: mirror.state !== null,
        pending: mirror.state?.pending ?? false,
        hasError: mirror.state?.error != null,
        feedbackCount: mirror.feedbackCount,
        composing: mirror.drafting,
      },
      {
        active: challenge.state !== null,
        pending: challenge.state?.pending ?? false,
        hasError: challenge.state?.error != null,
        answering: challenge.answering,
        resultCount: challenge.resultCount,
        celebrationCount: challenge.celebrationCount,
      },
    ),
  );

  // Moti Mirror is the single source of truth for the learning-loop stage while
  // it is open. A challenge deliberately does NOT drive the loop — it is a focused
  // practice task, not the full Think → Explain → Correct → Remember flow — but it
  // does own the current concept while active.
  const currentStage = mirror.state
    ? LOOP_STAGE_LABEL[mirror.stage]
    : demoCourse.currentStage;
  const currentConcept =
    mirror.state?.conceptTitle ??
    challenge.state?.conceptTitle ??
    demoCourse.currentConcept;

  const visibility = (panel: WorkspacePanel) =>
    activePanel === panel ? "block" : "hidden";

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden lg:h-dvh lg:overflow-hidden">
      <AppHeader
        descriptor={demoCourse.descriptor}
        apiStatus={conversation.apiStatus}
        settingsOpen={settingsOpen}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="border-b border-moti-line bg-moti-surface/60 px-3 py-2 md:hidden">
        <MobilePanelTabs active={activePanel} onChange={setActivePanel} />
      </div>

      <main className="mx-auto w-full max-w-[1400px] min-h-0 flex-1 px-3 py-3 sm:px-4">
        <div className="workspace-grid lg:h-full">
          <div
            id="panel-assistant"
            role="tabpanel"
            aria-labelledby="tab-assistant"
            className={`area-assistant ${visibility("assistant")} md:block lg:min-h-0 lg:overflow-y-auto`}
          >
            <AssistantPanel
              visualState={visualState}
              concept={currentConcept}
              stages={LOOP_STAGES}
              currentStage={currentStage}
            />
          </div>

          <div
            id="panel-conversation"
            role="tabpanel"
            aria-labelledby="tab-conversation"
            className={`area-conversation ${visibility("conversation")} md:block lg:min-h-0`}
          >
            <ConversationPanel
              conversation={conversation}
              mirror={mirror}
              challenge={challenge}
              onComposerActiveChange={setComposerActive}
            />
          </div>

          <div
            id="panel-journey"
            role="tabpanel"
            aria-labelledby="tab-journey"
            className={`area-journey ${visibility("journey")} md:block lg:min-h-0 lg:overflow-y-auto`}
          >
            <JourneyPanel onReviewTypingChange={setReviewTyping} />
          </div>
        </div>
      </main>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
