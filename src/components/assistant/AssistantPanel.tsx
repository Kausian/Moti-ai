import type { AssistantStatus, LoopStage } from "@/lib/types";
import { MotiOrb } from "./MotiOrb";
import { IconCheck, IconSparkles } from "@/components/ui/icons";

interface AssistantPanelProps {
  status: AssistantStatus;
  concept: string;
  stages: LoopStage[];
  currentStage: LoopStage;
}

export function AssistantPanel({
  status,
  concept,
  stages,
  currentStage,
}: AssistantPanelProps) {
  const currentIndex = stages.indexOf(currentStage);

  return (
    <aside
      aria-label="Moti assistant"
      className="flex flex-col gap-5 rounded-2xl border border-moti-line bg-moti-surface p-5 shadow-sm lg:min-h-full"
    >
      <div>
        <MotiOrb />
        <div className="mt-3 flex flex-col items-center gap-1.5">
          <p className="text-sm font-semibold text-moti-navy">Moti</p>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-moti-navy/5 px-2.5 py-1 text-xs font-medium text-moti-navy">
            <span
              aria-hidden
              className="status-dot-pulse h-2 w-2 rounded-full bg-moti-navy"
            />
            {status}
          </span>
        </div>
      </div>

      <div className="rounded-xl bg-gradient-to-br from-moti-pink/40 via-moti-peach/30 to-moti-yellow/40 p-3 text-center">
        <p className="text-[11px] font-medium uppercase tracking-wide text-moti-navy-soft">
          Current concept
        </p>
        <p className="mt-0.5 text-sm font-semibold text-moti-navy">{concept}</p>
      </div>

      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-moti-navy-soft">
          Learning loop
        </p>
        <ol className="flex flex-col gap-1.5">
          {stages.map((stage, index) => {
            const state =
              index < currentIndex
                ? "done"
                : index === currentIndex
                  ? "current"
                  : "upcoming";
            return (
              <li
                key={stage}
                aria-current={state === "current" ? "step" : undefined}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm ${
                  state === "current"
                    ? "bg-moti-navy text-white"
                    : "text-moti-navy-soft"
                }`}
              >
                <span
                  aria-hidden
                  className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] ${
                    state === "done"
                      ? "bg-moti-understood-bg text-moti-understood"
                      : state === "current"
                        ? "bg-white/20 text-white"
                        : "border border-moti-line text-moti-navy-soft"
                  }`}
                >
                  {state === "done" ? (
                    <IconCheck className="h-3 w-3" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span className={state === "current" ? "font-semibold" : "font-medium"}>
                  {stage}
                </span>
                {state === "current" && (
                  <span className="ml-auto text-[11px] font-medium uppercase tracking-wide">
                    Now
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <p className="mt-auto flex items-start gap-2 rounded-xl border border-dashed border-moti-line bg-moti-navy/[0.03] p-3 text-xs leading-5 text-moti-navy-soft">
        <IconSparkles className="mt-0.5 h-4 w-4 shrink-0 text-moti-navy-soft" />
        <span>
          The interactive 3D Moti assistant arrives in a later phase. This is a
          visual preview of its place in the workspace.
        </span>
      </p>
    </aside>
  );
}
