"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { MotiVisualState } from "@/lib/types";
import type { MotiAnimationConfig } from "@/lib/avatar/animation-config";
import {
  MOTI_COLORS,
  STATE_INDICATOR_COLOR,
  GEOMETRY_SEGMENTS,
} from "@/lib/avatar/constants";

interface MotiStateEffectsProps {
  visualState: MotiVisualState;
  config: MotiAnimationConfig;
  reducedMotion: boolean;
}

const damp = THREE.MathUtils.damp;

// State cues that are not part of Moti's body: the luminous learning-indicator
// ring below the character, three lightweight thinking dots, and a restrained
// celebrating sparkle. Colours are set imperatively only when the state changes
// (never allocated per frame). Under reduced motion the ring holds a steady glow
// and the dots/sparkle are shown statically, so each state stays distinguishable
// without movement.
export function MotiStateEffects({
  visualState,
  config,
  reducedMotion,
}: MotiStateEffectsProps) {
  const ringRef = useRef<THREE.Mesh>(null);
  const ringMaterialRef = useRef<THREE.MeshStandardMaterial>(null);
  const dotsRef = useRef<THREE.Group>(null);
  const sparkleRef = useRef<THREE.Group>(null);
  const scaleRef = useRef(1);

  // Recolour the indicator only on state change.
  useEffect(() => {
    const material = ringMaterialRef.current;
    if (!material) return;
    const color = STATE_INDICATOR_COLOR[visualState];
    material.color.set(color);
    material.emissive.set(color);
  }, [visualState]);

  useFrame((state, delta) => {
    const ring = ringRef.current;
    const material = ringMaterialRef.current;
    if (ring && material) {
      const pulse =
        reducedMotion || config.indicatorPulseSpeed === 0
          ? 1
          : 1 + Math.sin(state.clock.elapsedTime * config.indicatorPulseSpeed) * 0.06;
      scaleRef.current = damp(scaleRef.current, config.indicatorScale, 8, delta);
      const scale = scaleRef.current * pulse;
      ring.scale.set(scale, scale, scale);
      const targetIntensity =
        config.indicatorIntensity * (reducedMotion ? 1 : pulse);
      material.emissiveIntensity = damp(
        material.emissiveIntensity,
        targetIntensity,
        6,
        delta,
      );
    }

    // Thinking dots: a gentle sequential bob (static under reduced motion).
    const dots = dotsRef.current;
    if (dots && dots.visible && !reducedMotion) {
      dots.children.forEach((dot, i) => {
        dot.position.y = Math.sin(state.clock.elapsedTime * 4 + i * 0.9) * 0.05;
      });
    }

    // Celebrating sparkle: a short contained pulse (static under reduced motion).
    const sparkle = sparkleRef.current;
    if (sparkle && sparkle.visible && !reducedMotion) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.25;
      sparkle.scale.set(s, s, s);
    }
  });

  return (
    <group>
      {/* Learning-indicator ring, laid flat beneath Moti. */}
      <mesh ref={ringRef} position={[0, -0.86, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.66, 0.045, 12, GEOMETRY_SEGMENTS.indicator]} />
        <meshStandardMaterial
          ref={ringMaterialRef}
          color={MOTI_COLORS.peach}
          emissive={MOTI_COLORS.peach}
          emissiveIntensity={0.35}
          roughness={0.5}
          metalness={0.1}
        />
      </mesh>

      <group ref={dotsRef} position={[0, 1.15, 0.2]} visible={config.showThinkingDots}>
        {[-0.14, 0, 0.14].map((x) => (
          <mesh key={x} position={[x, 0, 0]}>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshStandardMaterial
              color={MOTI_COLORS.pink}
              emissive={MOTI_COLORS.pink}
              emissiveIntensity={0.4}
              roughness={0.4}
            />
          </mesh>
        ))}
      </group>

      <group ref={sparkleRef} position={[0, 1.1, 0.2]} visible={config.showSparkle}>
        {[
          [0.32, 0.1, 0],
          [-0.34, 0.02, 0.05],
          [0.05, 0.34, 0.05],
        ].map(([x, y, z]) => (
          <mesh key={`${x}:${y}`} position={[x, y, z]}>
            <sphereGeometry args={[0.04, 8, 8]} />
            <meshBasicMaterial color={MOTI_COLORS.yellow} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
