"use client";

import type { MotiVisualState } from "@/lib/types";
import { STATE_INDICATOR_COLOR } from "@/lib/avatar/constants";

interface MotiAvatarFallbackProps {
  visualState: MotiVisualState;
  reducedMotion: boolean;
}

// A polished 2D Moti used whenever the WebGL scene is unavailable, still loading,
// or has failed. It is intentionally on-brand (the gradient orb + friendly face)
// and reflects the current state through the learning-indicator colour, so the
// workspace never shows a blank area or a broken-scene message. Motion uses the
// existing brand animation classes, which already honour reduced motion in CSS.
export function MotiAvatarFallback({
  visualState,
  reducedMotion,
}: MotiAvatarFallbackProps) {
  const indicator = STATE_INDICATOR_COLOR[visualState];
  const floatClass = reducedMotion ? "" : "moti-float";
  const haloClass = reducedMotion ? "" : "moti-halo";
  const isThinking = visualState === "thinking";

  return (
    <div aria-hidden className="relative mx-auto grid h-36 w-36 place-items-center">
      <span
        className={`absolute inset-3 rounded-full blur-xl ${haloClass}`}
        style={{ backgroundColor: indicator, opacity: 0.55 }}
      />
      <div
        className={`relative grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-moti-pink via-moti-peach to-moti-yellow shadow-[0_12px_30px_-12px_rgba(23,32,58,0.5)] ${floatClass}`}
      >
        <svg
          viewBox="0 0 64 64"
          className="h-14 w-14 text-moti-navy"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="24" cy="28" r="2.4" fill="currentColor" stroke="none" />
          <circle cx="40" cy="28" r="2.4" fill="currentColor" stroke="none" />
          <path d="M23 38c3 3.4 15 3.4 18 0" />
        </svg>
        {/* State learning-indicator dot. */}
        <span
          className="absolute -bottom-1 h-2.5 w-2.5 rounded-full ring-2 ring-white"
          style={{ backgroundColor: indicator }}
        />
      </div>
      {isThinking && !reducedMotion && (
        <span className="absolute bottom-2 flex gap-1">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="status-dot-pulse h-1.5 w-1.5 rounded-full bg-moti-navy/60"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </span>
      )}
    </div>
  );
}
