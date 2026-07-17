import type { ReactNode } from "react";
import {
  IconAlert,
  IconCheckCircle,
  IconInfo,
} from "@/components/ui/icons";

export type NoticeTone = "info" | "success" | "warning" | "error";

// Tone conveyed by icon + border + text, never colour alone.
const TONE: Record<
  NoticeTone,
  { className: string; Icon: typeof IconInfo; role: "status" | "alert" }
> = {
  info: {
    className: "border-status-info/25 bg-status-info-bg text-status-info",
    Icon: IconInfo,
    role: "status",
  },
  success: {
    className: "border-status-success/25 bg-status-success-bg text-status-success",
    Icon: IconCheckCircle,
    role: "status",
  },
  warning: {
    className: "border-status-warning/25 bg-status-warning-bg text-status-warning",
    Icon: IconAlert,
    role: "status",
  },
  error: {
    className: "border-status-error/25 bg-status-error-bg text-status-error",
    Icon: IconAlert,
    role: "alert",
  },
};

interface InlineNoticeProps {
  tone: NoticeTone;
  children: ReactNode;
  className?: string;
  /** When false, no ARIA live role is attached (for static, always-present notes). */
  live?: boolean;
}

// A consistent inline message block for validation, storage, privacy, and status
// notices. Errors announce assertively; other tones announce politely.
export function InlineNotice({
  tone,
  children,
  className,
  live = true,
}: InlineNoticeProps) {
  const { className: toneClass, Icon, role } = TONE[tone];
  return (
    <div
      role={live ? role : undefined}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs leading-5 ${toneClass} ${className ?? ""}`}
    >
      <Icon className="mt-px h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0">{children}</span>
    </div>
  );
}
