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
import { useMotiVisualState } from "@/hooks/useMotiVisualState";
import type { LearnerLevel } from "@/lib/types";
import {
  LOOP_STAGES,
  demoCourse,
  learningConcepts,
  reviewItems,
} from "@/data/demo-data";

const LEVEL_LABEL: Record<LearnerLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
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
  const [composerActive, setComposerActive] = useState(false);
  const answerCount = useMemo(
    () =>
      conversation.messages.filter(
        (message) => message.role === "assistant" && message.status === "complete",
      ).length,
    [conversation.messages],
  );
  const visualState = useMotiVisualState({
    requestPending: conversation.isPending,
    hasError: conversation.error !== null,
    composing: composerActive,
    answerCount,
    hasMessages: conversation.messages.length > 0,
  });

  const visibility = (panel: WorkspacePanel) =>
    activePanel === panel ? "block" : "hidden";

  return (
    <div className="flex min-h-dvh flex-col overflow-x-hidden lg:h-dvh lg:overflow-hidden">
      <AppHeader
        courseTitle={configuration.courseTitle}
        learnerLevelLabel={LEVEL_LABEL[configuration.learnerLevel]}
        descriptor={demoCourse.descriptor}
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
              concept={demoCourse.currentConcept}
              stages={LOOP_STAGES}
              currentStage={demoCourse.currentStage}
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
              onComposerActiveChange={setComposerActive}
            />
          </div>

          <div
            id="panel-journey"
            role="tabpanel"
            aria-labelledby="tab-journey"
            className={`area-journey ${visibility("journey")} md:block lg:min-h-0 lg:overflow-y-auto`}
          >
            <JourneyPanel concepts={learningConcepts} reviewItems={reviewItems} />
          </div>
        </div>
      </main>

      <SettingsDrawer open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}
