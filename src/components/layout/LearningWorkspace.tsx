"use client";

import { useState } from "react";
import { AppHeader } from "./AppHeader";
import { MobilePanelTabs, type WorkspacePanel } from "./MobilePanelTabs";
import { AssistantPanel } from "@/components/assistant/AssistantPanel";
import { ConversationPanel } from "@/components/chat/ConversationPanel";
import { JourneyPanel } from "@/components/learning/JourneyPanel";
import { SettingsDrawer } from "@/components/settings/SettingsDrawer";
import { useCourseConfiguration } from "@/hooks/useCourseConfiguration";
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
              status={demoCourse.assistantStatus}
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
            <ConversationPanel />
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
