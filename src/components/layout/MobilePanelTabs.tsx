import type { ComponentType, SVGProps } from "react";
import { IconChat, IconCompass, IconSparkles } from "@/components/ui/icons";

export type WorkspacePanel = "assistant" | "conversation" | "journey";

const TABS: {
  id: WorkspacePanel;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  controls: string;
}[] = [
  { id: "assistant", label: "Moti", Icon: IconSparkles, controls: "panel-assistant" },
  { id: "conversation", label: "Learn", Icon: IconChat, controls: "panel-conversation" },
  { id: "journey", label: "Journey", Icon: IconCompass, controls: "panel-journey" },
];

interface MobilePanelTabsProps {
  active: WorkspacePanel;
  onChange: (panel: WorkspacePanel) => void;
}

// Segmented control used below the header on mobile to switch between the three
// workspace panels (which sit side by side from tablet width up).
export function MobilePanelTabs({ active, onChange }: MobilePanelTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Workspace panels"
      className="flex gap-1 rounded-xl border border-moti-line bg-moti-surface p-1"
    >
      {TABS.map(({ id, label, Icon, controls }) => {
        const selected = active === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            id={`tab-${id}`}
            aria-selected={selected}
            aria-controls={controls}
            onClick={() => onChange(id)}
            className={`inline-flex min-h-[40px] flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors ${
              selected
                ? "bg-moti-navy text-white shadow-[var(--shadow-1)]"
                : "text-moti-navy-soft hover:bg-moti-navy/5"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
