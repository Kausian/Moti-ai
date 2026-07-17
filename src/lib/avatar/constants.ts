// Focused 3D colour + timing constants for the procedural Moti assistant.
//
// Three.js cannot read CSS custom properties, so the Moti brand palette (defined
// once in globals.css) is mirrored here as plain hex strings for use in
// materials. These are the ONLY place 3D colours are defined — components import
// them rather than scattering raw hex. This module intentionally imports nothing
// from `three`, so the pure state/animation logic (and its tests) never pulls in
// a WebGL dependency.

import type { MotiVisualState } from "@/lib/types";

/** Brand palette mirrored from globals.css `:root` tokens (kept in sync by hand). */
export const MOTI_COLORS = {
  /** Dark navy core body. */
  navy: "#17203a",
  navySoft: "#4a5578",
  /** Warm ivory face surface. */
  ivory: "#fdf6f1",
  pink: "#fbcfe1",
  peach: "#ffd9b7",
  yellow: "#fde9a9",
  /** Warm, non-aggressive accent used for the error pose. */
  warning: "#d98a3d",
  eye: "#17203a",
  eyeHighlight: "#ffffff",
} as const;

/**
 * The learning-indicator glow colour per state. A warm, restrained luminous cue
 * — never neon. Error stays warm amber, not an alarming red.
 */
export const STATE_INDICATOR_COLOR: Record<MotiVisualState, string> = {
  idle: MOTI_COLORS.peach,
  listening: MOTI_COLORS.yellow,
  thinking: MOTI_COLORS.pink,
  explaining: MOTI_COLORS.yellow,
  celebrating: MOTI_COLORS.pink,
  error: MOTI_COLORS.warning,
};

/**
 * How long a successfully completed answer keeps Moti in the `explaining` state
 * before returning to idle. A new request switches to thinking immediately and
 * an error switches to error immediately, both overriding this window.
 */
export const EXPLAINING_DURATION_MS = 3800;

/** Device-pixel-ratio cap for the canvas — keeps the scene light on mobile. */
export const CANVAS_DPR: [number, number] = [1, 1.5];

/** Moderate geometry segment counts — polished but deliberately low-poly. */
export const GEOMETRY_SEGMENTS = {
  head: 32,
  body: 20,
  eye: 16,
  indicator: 40,
} as const;
