"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import type { MotiVisualState } from "@/lib/types";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { MotiAvatarFallback } from "./MotiAvatarFallback";
import { MotiAvatarErrorBoundary } from "./MotiAvatarErrorBoundary";

// Client-only WebGL scene. `next/dynamic` with `ssr: false` keeps three.js and
// the Canvas out of server rendering entirely (no window/WebGL access on the
// server) and defers the 3D bundle until the browser needs it. The loading
// state shows the on-brand 2D fallback so there is never a blank area.
const MotiCanvasLazy = dynamic(
  () => import("./MotiCanvas").then((module) => module.MotiCanvas),
  {
    ssr: false,
    loading: () => <MotiAvatarFallback visualState="idle" reducedMotion={false} />,
  },
);

function detectWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl") || canvas.getContext("experimental-webgl")),
    );
  } catch {
    return false;
  }
}

// WebGL support does not change during a session, so detect it once and share it
// via a cached external-store snapshot. `useSyncExternalStore` reports `false`
// during SSR/hydration (so the server renders the fallback) and the real value
// on the client — without a synchronous state update inside an effect.
let webglSupportCache: boolean | null = null;
function getWebGLSnapshot(): boolean {
  if (webglSupportCache === null) webglSupportCache = detectWebGL();
  return webglSupportCache;
}
const subscribeWebGL = () => () => {};

function useWebGLSupported(): boolean {
  return useSyncExternalStore(subscribeWebGL, getWebGLSnapshot, () => false);
}

interface MotiAvatarProps {
  visualState: MotiVisualState;
}

// Orchestrates how Moti is presented: it renders the accessible-but-decorative
// wrapper, decides between the WebGL scene and the 2D fallback (SSR, unknown, or
// unsupported WebGL all show the fallback), and pauses the scene when it is
// offscreen (e.g. a hidden mobile panel) or the tab is hidden. The scene is
// always wrapped in an error boundary so a failure degrades to the fallback
// while the rest of the workspace keeps working.
export function MotiAvatar({ visualState }: MotiAvatarProps) {
  const reducedMotion = useReducedMotion();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const webglSupported = useWebGLSupported();
  const [paused, setPaused] = useState(true);

  // Pause the frame loop whenever the avatar is not actually visible: offscreen
  // (an inactive mobile panel renders it with display:none → not intersecting)
  // or the browser tab is hidden. This avoids continuous work the user cannot see.
  useEffect(() => {
    const element = wrapperRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    let intersecting = false;
    const update = () => setPaused(!(intersecting && !document.hidden));

    const observer = new IntersectionObserver(
      (entries) => {
        intersecting = entries.some((entry) => entry.isIntersecting);
        update();
      },
      { threshold: 0.05 },
    );
    observer.observe(element);
    document.addEventListener("visibilitychange", update);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      role="img"
      aria-label="Moti, your learning assistant"
      className="h-40 w-full sm:h-44"
    >
      {webglSupported ? (
        <MotiAvatarErrorBoundary
          fallback={
            <MotiAvatarFallback visualState={visualState} reducedMotion={reducedMotion} />
          }
        >
          <MotiCanvasLazy
            visualState={visualState}
            reducedMotion={reducedMotion}
            paused={paused}
          />
        </MotiAvatarErrorBoundary>
      ) : (
        <MotiAvatarFallback visualState={visualState} reducedMotion={reducedMotion} />
      )}
    </div>
  );
}
