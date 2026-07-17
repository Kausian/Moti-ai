"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

// SSR and the first client render report `false` so markup is deterministic.
function getServerSnapshot(): boolean {
  return false;
}

/**
 * Observes the user's `prefers-reduced-motion` setting in the browser via
 * `useSyncExternalStore`, so it stays live (the media-query listener is
 * subscribed and cleaned up by React) without synchronous state updates.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
