"use client";

import { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import type { MotiVisualState } from "@/lib/types";
import { CANVAS_DPR, MOTI_COLORS } from "@/lib/avatar/constants";
import { MotiCharacter } from "./MotiCharacter";

interface MotiCanvasProps {
  visualState: MotiVisualState;
  reducedMotion: boolean;
  /** True when the scene is offscreen or the tab is hidden — stop animating. */
  paused: boolean;
}

// Pumps a short burst of frames when the frame loop is on demand (reduced motion
// or paused) so damped pose transitions still settle after a state change,
// without leaving a continuous loop running. In the always-on loop this is a
// no-op. Cleans up its animation-frame request.
function DemandFramePump({
  animating,
  stateKey,
}: {
  animating: boolean;
  stateKey: string;
}) {
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    if (animating) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      invalidate();
      if (now - start < 650) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animating, stateKey, invalidate]);

  return null;
}

// The single React Three Fiber Canvas for Moti: transparent background, a fixed
// calm camera (no OrbitControls / no user camera movement), simple warm lighting,
// and a capped device-pixel-ratio. The frame loop runs continuously only when
// the scene is visible and motion is allowed; otherwise it switches to on-demand
// rendering so a hidden panel, a hidden tab, or reduced-motion users do no
// continuous work. This module is imported client-only (ssr: false).
export function MotiCanvas({ visualState, reducedMotion, paused }: MotiCanvasProps) {
  const animating = !paused && !reducedMotion;

  return (
    <Canvas
      dpr={CANVAS_DPR}
      frameloop={animating ? "always" : "demand"}
      camera={{ position: [0, 0.35, 4.6], fov: 30 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[2.5, 3, 3]} intensity={1.15} color="#ffffff" />
      {/* Low-cost warm accent light. */}
      <pointLight position={[-2.5, 0.5, 2]} intensity={0.5} color={MOTI_COLORS.peach} />

      <MotiCharacter visualState={visualState} reducedMotion={reducedMotion} />

      <DemandFramePump animating={animating} stateKey={`${visualState}:${reducedMotion}`} />
    </Canvas>
  );
}
