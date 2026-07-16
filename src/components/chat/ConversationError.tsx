import type { ChatErrorPayload } from "@/lib/types";
import { IconAlert } from "@/components/ui/icons";

interface ConversationErrorProps {
  error: ChatErrorPayload;
  canRetry: boolean;
  onRetry: () => void;
}

export function ConversationError({ error, canRetry, onRetry }: ConversationErrorProps) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center gap-2 rounded-lg bg-moti-danger-bg px-3 py-2 text-xs"
    >
      <IconAlert className="h-4 w-4 shrink-0 text-moti-danger" />
      <span className="min-w-0 flex-1 font-medium text-moti-danger">
        {error.message}
      </span>
      {canRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md bg-moti-danger px-2.5 py-1 text-xs font-medium text-white transition-opacity hover:opacity-90"
        >
          Retry
        </button>
      )}
    </div>
  );
}
