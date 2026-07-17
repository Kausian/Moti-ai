// State-specific animation targets for the procedural Moti character. Kept as a
// focused configuration of plain finite numbers (no three import) so the values
// are testable and are not scattered as unexplained magic numbers across the
// character mesh. Angles are in radians; positions/scales in local scene units.
//
// The character reads these targets in `useFrame` and interpolates toward them
// with frame-rate-independent damping. Continuous oscillation terms
// (`floatAmplitude`, `indicatorPulseSpeed`, `showThinkingDots`, `showSparkle`)
// are suppressed under reduced motion; the static pose targets still apply so
// every state stays visually distinct without movement.

import type { MotiVisualState } from "@/lib/types";

export interface MotiAnimationConfig {
  /** Amplitude of the gentle vertical float, in scene units. */
  floatAmplitude: number;
  /** Angular speed of the float cycle. */
  floatSpeed: number;
  /** Resting head tilt (z rotation), in radians. */
  headTilt: number;
  /** Forward/backward lean (x rotation) of the whole character, in radians. */
  lean: number;
  /** Overall resting body scale multiplier. */
  bodyScale: number;
  /** Resting scale of the luminous learning indicator ring. */
  indicatorScale: number;
  /** Pulse speed of the learning indicator; 0 means a steady glow. */
  indicatorPulseSpeed: number;
  /** Emissive intensity of the indicator (restrained, never neon). */
  indicatorIntensity: number;
  /** Target eye openness, 1 = fully open. Lowered slightly for a calm error pose. */
  eyeOpen: number;
  /** Amplitude of the explaining "nod" gesture, in radians. 0 disables it. */
  nodAmplitude: number;
  /** Speed of the explaining nod. */
  nodSpeed: number;
  /** Show the three lightweight thinking dots. */
  showThinkingDots: boolean;
  /** Show the restrained celebrating sparkle. */
  showSparkle: boolean;
}

const IDLE: MotiAnimationConfig = {
  floatAmplitude: 0.05,
  floatSpeed: 1.1,
  headTilt: 0,
  lean: 0,
  bodyScale: 1,
  indicatorScale: 1,
  indicatorPulseSpeed: 1.2,
  indicatorIntensity: 0.35,
  eyeOpen: 1,
  nodAmplitude: 0,
  nodSpeed: 0,
  showThinkingDots: false,
  showSparkle: false,
};

export const MOTI_ANIMATION_CONFIG: Record<MotiVisualState, MotiAnimationConfig> = {
  idle: IDLE,
  listening: {
    ...IDLE,
    floatAmplitude: 0.035,
    lean: 0.12, // leans gently toward the learner
    indicatorScale: 1.08,
    indicatorPulseSpeed: 1.8,
    indicatorIntensity: 0.5,
    eyeOpen: 1.06, // wider, more attentive eyes
  },
  thinking: {
    ...IDLE,
    floatAmplitude: 0.03,
    headTilt: 0.22, // slow, held head tilt
    floatSpeed: 0.8,
    indicatorScale: 1,
    indicatorPulseSpeed: 2.6,
    indicatorIntensity: 0.55,
    eyeOpen: 0.82, // concentrated
    showThinkingDots: true,
  },
  explaining: {
    ...IDLE,
    floatAmplitude: 0.045,
    indicatorScale: 1.1,
    indicatorPulseSpeed: 1.6,
    indicatorIntensity: 0.6,
    eyeOpen: 1,
    nodAmplitude: 0.06, // subtle warm nod
    nodSpeed: 3.2,
  },
  celebrating: {
    ...IDLE,
    floatAmplitude: 0.12, // a short, contained positive bounce
    floatSpeed: 3.4,
    indicatorScale: 1.15,
    indicatorPulseSpeed: 3,
    indicatorIntensity: 0.7,
    eyeOpen: 1.1,
    showSparkle: true,
  },
  error: {
    ...IDLE,
    floatAmplitude: 0.02,
    floatSpeed: 0.7,
    lean: -0.1, // slightly lowered, calmer pose
    headTilt: -0.12,
    bodyScale: 0.98,
    indicatorScale: 0.92,
    indicatorPulseSpeed: 0, // steady, no alarming flashing
    indicatorIntensity: 0.4,
    eyeOpen: 0.9,
  },
};
