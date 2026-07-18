import { IconSettings } from "@/components/ui/icons";
import { SETTINGS_DRAWER_ID } from "@/components/settings/SettingsDrawer";
import type { ApiStatus } from "@/hooks/useMotiConversation";

interface AppHeaderProps {
  descriptor: string;
  apiStatus: ApiStatus;
  settingsOpen: boolean;
  onOpenSettings: () => void;
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
  descriptor,
  apiStatus,
  settingsOpen,
  onOpenSettings,
}: AppHeaderProps) {
  return (
    <header className="shrink-0 border-b border-moti-line bg-moti-surface/85 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-3 px-3 py-2.5 sm:px-4">
        {/* Left: simple M logo only (text only — no external logo) */}
        <span
          aria-hidden
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-moti-navy text-base font-bold text-white"
        >
          M
        </span>

        {/* Center: centered wordmark lockup */}
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center text-center">
          <p className="text-base font-semibold leading-tight tracking-tight text-moti-navy">
            Moti AI
          </p>
          <p className="hidden truncate max-w-full text-xs text-moti-navy-soft sm:block">
            {descriptor}
          </p>
        </div>

        {/* Right: unchanged (AI status + Settings) */}
        <div className="flex shrink-0 items-center gap-2">
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
    </header>
  );
}
