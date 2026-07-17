// A tiny shared clock, exposed as an external store.
//
// Review grouping ("due now" vs "later") depends on the current time, but the
// current time cannot be read during render: it is impure and would differ
// between the server and the client, causing a hydration mismatch. A cached
// snapshot that only advances when something explicitly ticks it solves both
// problems, and lets `useSyncExternalStore` drive it without setting state
// inside an effect.
//
// The snapshot is a number (not a Date) so React can compare it by value.

/** 0 until the browser subscribes; the epoch renders deterministically on SSR. */
let cachedNow = 0;
const listeners = new Set<() => void>();

/** Advances the clock and re-renders subscribers. */
export function tickClock(): void {
  cachedNow = Date.now();
  for (const listener of listeners) listener();
}

export function subscribeClock(listener: () => void): () => void {
  // The first subscriber pulls the real time; SSR never gets here.
  if (listeners.size === 0) cachedNow = Date.now();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getClockSnapshot(): number {
  return cachedNow;
}

export function getServerClockSnapshot(): number {
  return 0;
}
