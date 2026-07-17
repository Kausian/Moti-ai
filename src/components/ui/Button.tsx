import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  buttonClass,
  type ButtonSize,
  type ButtonVariant,
} from "./button-styles";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shown in place of children while a request is in flight (no layout shift). */
  loading?: boolean;
  loadingLabel?: string;
  children: ReactNode;
}

// Shared button. Always a real <button> (never a clickable div), with a visible
// focus ring, a comfortable touch target, and a clear disabled/loading state.
// The loading label keeps the button width stable rather than swapping content
// for a bare spinner.
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingLabel,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClass(variant, size, className)}
      {...rest}
    >
      {loading ? (loadingLabel ?? children) : children}
    </button>
  );
}
