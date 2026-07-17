"use client";

import type { ChallengeOption as ChallengeOptionModel } from "@/lib/types";

interface ChallengeOptionProps {
  option: ChallengeOptionModel;
  name: string;
  checked: boolean;
  disabled: boolean;
  onSelect: (optionId: string) => void;
}

// One answer option, backed by a real radio input so keyboard and screen-reader
// behaviour comes from the platform rather than being re-implemented. The option
// text is plain text — no Markdown or HTML is interpreted.
export function ChallengeOption({
  option,
  name,
  checked,
  disabled,
  onSelect,
}: ChallengeOptionProps) {
  return (
    <label
      className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 transition-colors ${
        checked
          ? "border-moti-navy/40 bg-moti-navy/[0.04]"
          : "border-moti-line bg-white hover:border-moti-navy/25"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <input
        type="radio"
        name={name}
        value={option.id}
        checked={checked}
        disabled={disabled}
        onChange={() => onSelect(option.id)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-moti-navy"
      />
      <span className="min-w-0 break-words text-sm leading-6 text-moti-navy">
        {option.text}
      </span>
    </label>
  );
}
