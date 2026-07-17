import { describe, expect, it } from "vitest";
import { MOTI_ANIMATION_CONFIG } from "./animation-config";
import { STATE_INDICATOR_COLOR } from "./constants";
import { VISUAL_STATES } from "./state-mapping";

describe("animation configuration", () => {
  it("provides an animation config for every visual state", () => {
    for (const state of VISUAL_STATES) {
      expect(MOTI_ANIMATION_CONFIG[state]).toBeDefined();
    }
  });

  it("uses only finite numbers for numeric animation values", () => {
    for (const state of VISUAL_STATES) {
      const config = MOTI_ANIMATION_CONFIG[state];
      for (const [key, value] of Object.entries(config)) {
        if (typeof value === "number") {
          expect(Number.isFinite(value), `${state}.${key} must be finite`).toBe(true);
        }
      }
    }
  });

  it("keeps amplitudes and scales non-negative", () => {
    for (const state of VISUAL_STATES) {
      const config = MOTI_ANIMATION_CONFIG[state];
      expect(config.floatAmplitude).toBeGreaterThanOrEqual(0);
      expect(config.indicatorScale).toBeGreaterThan(0);
      expect(config.bodyScale).toBeGreaterThan(0);
      expect(config.eyeOpen).toBeGreaterThan(0);
    }
  });

  it("provides a learning-indicator colour for every visual state", () => {
    for (const state of VISUAL_STATES) {
      expect(STATE_INDICATOR_COLOR[state]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
