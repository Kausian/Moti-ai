// Pure, testable class composition for the shared button system (Phase 12).
// Kept dependency-free (no React) so the variant logic can be unit-tested and
// reused by the occasional native <button> that cannot take the component.

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "sm" | "md";

const BASE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium " +
  "transition-colors duration-[var(--transition-fast)] " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "disabled:cursor-not-allowed disabled:opacity-50";

// Minimum comfortable touch targets: md ≈ 40px tall, sm ≈ 34px.
const SIZES: Record<ButtonSize, string> = {
  sm: "min-h-[34px] px-3 py-1.5 text-sm",
  md: "min-h-[40px] px-4 py-2 text-sm",
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-moti-navy text-white hover:bg-moti-navy/90",
  secondary:
    "border border-border-subtle bg-surface-panel text-moti-navy hover:bg-moti-navy/5",
  ghost: "text-moti-navy-soft hover:bg-moti-navy/5 hover:text-moti-navy",
  destructive:
    "border border-status-error/30 bg-status-error-bg text-status-error hover:bg-status-error/10",
};

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  extra?: string,
): string {
  return [BASE, SIZES[size], VARIANTS[variant], extra].filter(Boolean).join(" ");
}
