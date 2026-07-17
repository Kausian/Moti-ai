import { IconBook, IconSettings, IconSignal } from "@/components/ui/icons";
import { SETTINGS_DRAWER_ID } from "@/components/settings/SettingsDrawer";
import type { ApiStatus } from "@/hooks/useMotiConversation";

interface AppHeaderProps {
  courseTitle: string;
  learnerLevelLabel: string;
  descriptor: string;
  apiStatus: ApiStatus;
  settingsOpen: boolean;
  onOpenSettings: () => void;
}

function LevelPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-moti-yellow/50 px-2.5 py-1 text-xs font-medium text-moti-navy">
      <IconSignal className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

// High-level AI availability, conveyed by a dot + text label (never colour alone).
// The specific model name is intentionally not shown here (see Settings).
const AI_STATUS: Record<ApiStatus, { label: string; dot: string; text: string }> = {
  unknown: { label: "AI ready", dot: "bg-moti-navy-soft/50", text: "text-text-secondary" },
  ready: { label: "AI ready", dot: "bg-status-success", text: "text-text-secondary" },
  "not-configured": {
    label: "AI not configured",
    dot: "bg-status-warning",
    text: "text-text-secondary",
  },
  "limit-reached": {
    label: "Usage limit reached",
    dot: "bg-status-warning",
    text: "text-text-secondary",
  },
  unavailable: {
    label: "AI unavailable",
    dot: "bg-status-error",
    text: "text-text-secondary",
  },
};

function AiStatusPill({ status }: { status: ApiStatus }) {
  const { label, dot, text } = AI_STATUS[status];
  return (
    <span
      className={`hidden items-center gap-1.5 rounded-full border border-border-subtle bg-surface-panel px-2.5 py-1 text-xs font-medium sm:inline-flex ${text}`}
      title={label}
    >
      <span aria-hidden className={`h-2 w-2 rounded-full ${dot}`} />
      <span>{label}</span>
    </span>
  );
}

export function AppHeader({
  courseTitle,
  learnerLevelLabel,
  descriptor,
  apiStatus,
  settingsOpen,
  onOpenSettings,
}: AppHeaderProps) {
  return (
    <header className="shrink-0 border-b border-moti-line bg-moti-surface/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-3 px-3 py-2.5 sm:px-4">
        {/* Wordmark (text only — no external logo) */}
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            aria-hidden
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-moti-navy text-base font-bold text-white"
          >
            M
          </span>
          <div className="min-w-0">
            <p className="text-base font-semibold leading-tight tracking-tight text-moti-navy">
              Moti AI
            </p>
            <p className="hidden truncate text-xs text-moti-navy-soft sm:block">
              {descriptor}
            </p>
          </div>
        </div>

        {/* Current course + learner level (inline on tablet/desktop) */}
        <div className="mx-auto hidden min-w-0 items-center gap-3 md:flex">
          <span className="flex min-w-0 items-center gap-2 text-sm text-moti-navy-soft">
            <IconBook className="h-4 w-4 shrink-0 text-moti-navy-soft" />
            <span className="truncate font-medium text-moti-navy">{courseTitle}</span>
          </span>
          <LevelPill label={learnerLevelLabel} />
        </div>

        {/* Actions */}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <AiStatusPill status={apiStatus} />
          <button
            type="button"
            onClick={onOpenSettings}
            aria-haspopup="dialog"
            aria-expanded={settingsOpen}
            aria-controls={SETTINGS_DRAWER_ID}
            className="inline-flex items-center gap-1.5 rounded-lg bg-moti-navy px-2.5 py-2 text-sm font-medium text-white transition-colors hover:bg-moti-navy/90 focus-visible:bg-moti-navy/90"
          >
            <IconSettings className="h-4 w-4" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </div>
      </div>

      {/* Current course + level on mobile (compact second row) */}
      <div className="flex items-center gap-2 border-t border-moti-line px-3 py-2 md:hidden">
        <IconBook className="h-4 w-4 shrink-0 text-moti-navy-soft" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-moti-navy">
          {courseTitle}
        </span>
        <LevelPill label={learnerLevelLabel} />
      </div>
    </header>
  );
}
