"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { MotiVisualState } from "@/lib/types";
import { MOTI_ANIMATION_CONFIG } from "@/lib/avatar/animation-config";
import { MOTI_COLORS, GEOMETRY_SEGMENTS } from "@/lib/avatar/constants";
import { MotiFace } from "./MotiFace";
import { MotiStateEffects } from "./MotiStateEffects";

interface MotiCharacterProps {
  visualState: MotiVisualState;
  reducedMotion: boolean;
}

const damp = THREE.MathUtils.damp;

// The procedural Moti body: a dark-navy rounded core with a warm ivory face,
// two floating hands, and a soft platform shadow. This component owns the body's
// per-frame motion — a gentle float, a state lean, a held head tilt, and the
// explaining nod — interpolating scalar fields toward the current config with
// frame-rate-independent damping (no per-frame object allocation). Under reduced
// motion the oscillation terms are suppressed while the static pose targets
// (lean, tilt, scale) still apply, keeping each state visually distinct.
export function MotiCharacter({ visualState, reducedMotion }: MotiCharacterProps) {
  const config = MOTI_ANIMATION_CONFIG[visualState];

  const rootRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const handsRef = useRef<THREE.Group>(null);

  // Interpolated scalar state — no Vector3/Euler allocation in the frame loop.
  const cur = useRef({ floatAmp: 0.05, lean: 0, tilt: 0, scale: 1, nod: 0 });

  useFrame((state, delta) => {
    const root = rootRef.current;
    const head = headRef.current;
    if (!root || !head) return;

    const c = cur.current;
    c.floatAmp = damp(c.floatAmp, reducedMotion ? 0 : config.floatAmplitude, 6, delta);
    c.lean = damp(c.lean, config.lean, 7, delta);
    c.tilt = damp(c.tilt, config.headTilt, 7, delta);
    c.scale = damp(c.scale, config.bodyScale, 7, delta);
    c.nod = damp(c.nod, reducedMotion ? 0 : config.nodAmplitude, 7, delta);

    const t = state.clock.elapsedTime;
    const float = c.floatAmp === 0 ? 0 : Math.sin(t * config.floatSpeed) * c.floatAmp;
    const nod = c.nod === 0 ? 0 : Math.sin(t * config.nodSpeed) * c.nod;

    root.position.y = float;
    root.rotation.x = c.lean;
    root.scale.setScalar(c.scale);

    head.rotation.z = c.tilt;
    head.rotation.x = nod;

    const hands = handsRef.current;
    if (hands) {
      // A small hand gesture accompanies the explaining nod only.
      hands.children[1].position.y = damp(
        hands.children[1].position.y,
        -0.15 + (nod !== 0 ? Math.abs(nod) * 1.6 : 0),
        8,
        delta,
      );
    }
  });

  return (
    <group>
      <group ref={rootRef}>
      {/* Body core. */}
      <mesh position={[0, -0.15, 0]}>
        <capsuleGeometry args={[0.5, 0.42, 8, GEOMETRY_SEGMENTS.body]} />
        <meshStandardMaterial color={MOTI_COLORS.navy} roughness={0.55} metalness={0.15} />
      </mesh>

      {/* Head group (tilts + nods). */}
      <group ref={headRef} position={[0, 0.62, 0]}>
        <mesh>
          <sphereGeometry args={[0.62, GEOMETRY_SEGMENTS.head, GEOMETRY_SEGMENTS.head]} />
          <meshStandardMaterial color={MOTI_COLORS.navy} roughness={0.5} metalness={0.15} />
        </mesh>
        {/* Warm ivory face plate — a shallow dome with subtle depth. */}
        <mesh position={[0, 0.02, 0.28]} scale={[0.82, 0.92, 0.4]}>
          <sphereGeometry args={[0.5, GEOMETRY_SEGMENTS.head, GEOMETRY_SEGMENTS.head]} />
          <meshStandardMaterial color={MOTI_COLORS.ivory} roughness={0.65} metalness={0.02} />
        </mesh>
        <MotiFace config={config} reducedMotion={reducedMotion} />
      </group>

      {/* Two floating hands. */}
      <group ref={handsRef}>
        {[-0.66, 0.66].map((x) => (
          <mesh key={x} position={[x, -0.15, 0.15]}>
            <sphereGeometry args={[0.15, GEOMETRY_SEGMENTS.body, GEOMETRY_SEGMENTS.body]} />
            <meshStandardMaterial color={MOTI_COLORS.ivory} roughness={0.6} metalness={0.02} />
          </mesh>
        ))}
      </group>

        <MotiStateEffects
          visualState={visualState}
          config={config}
          reducedMotion={reducedMotion}
        />
      </group>

      {/* Soft floor shadow (platform) — grounded, so it does not float with Moti. */}
      <mesh position={[0, -0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.62, GEOMETRY_SEGMENTS.indicator]} />
        <meshBasicMaterial color={MOTI_COLORS.navy} transparent opacity={0.14} />
      </mesh>
    </group>
  );
}
