"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { MotiAnimationConfig } from "@/lib/avatar/animation-config";
import { MOTI_COLORS, GEOMETRY_SEGMENTS } from "@/lib/avatar/constants";

interface MotiFaceProps {
  config: MotiAnimationConfig;
  reducedMotion: boolean;
}

const damp = THREE.MathUtils.damp;

// Moti's warm ivory face plate with two expressive eyes (each with a small
// highlight) and a gentle smile. The face owns its own frame logic: a smooth,
// deterministic blink and interpolation of eye openness toward the current
// state's target. Under reduced motion the eyes hold a stable, open pose.
export function MotiFace({ config, reducedMotion }: MotiFaceProps) {
  const eyesRef = useRef<THREE.Group>(null);
  const mouthRef = useRef<THREE.Group>(null);
  const openRef = useRef(1);

  useFrame((state, delta) => {
    const eyes = eyesRef.current;
    if (!eyes) return;

    // Ease eye openness toward the state target (attentive vs. concentrated).
    openRef.current = damp(openRef.current, config.eyeOpen, 9, delta);

    // Deterministic blink: a brief close on a fixed cadence, disabled when the
    // user prefers reduced motion so the pose never flickers.
    let blink = 1;
    if (!reducedMotion) {
      const phase = state.clock.elapsedTime % 4.6;
      if (phase < 0.14) blink = Math.max(0.12, Math.cos(phase * 22));
    }
    eyes.scale.y = openRef.current * blink;

    // Restrained smile lift during the explaining nod — never lip sync, just a
    // small warm face-panel motion.
    const mouth = mouthRef.current;
    if (mouth) {
      const lift =
        reducedMotion || config.nodAmplitude === 0
          ? 0
          : Math.sin(state.clock.elapsedTime * config.nodSpeed) * 0.02;
      mouth.position.y = damp(mouth.position.y, -0.12 + lift, 10, delta);
    }
  });

  return (
    <group position={[0, 0.04, 0.46]}>
      <group ref={eyesRef}>
        {[-0.16, 0.16].map((x) => (
          <group key={x} position={[x, 0.06, 0]}>
            <mesh>
              <sphereGeometry args={[0.062, GEOMETRY_SEGMENTS.eye, GEOMETRY_SEGMENTS.eye]} />
              <meshStandardMaterial color={MOTI_COLORS.eye} roughness={0.35} metalness={0.05} />
            </mesh>
            {/* Small catch-light gives the eyes life without realism. */}
            <mesh position={[x > 0 ? -0.02 : 0.02, 0.022, 0.05]}>
              <sphereGeometry args={[0.02, 10, 10]} />
              <meshBasicMaterial color={MOTI_COLORS.eyeHighlight} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Smile: a torus arc kept in the XY plane (facing +Z) and rotated so the
          open arc sits symmetrically at the bottom, reading as a warm smile. */}
      <group ref={mouthRef} position={[0, -0.12, 0.02]} rotation={[0, 0, -Math.PI * 0.86]}>
        <mesh>
          <torusGeometry args={[0.1, 0.022, 10, 24, Math.PI * 0.72]} />
          <meshStandardMaterial color={MOTI_COLORS.eye} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}
