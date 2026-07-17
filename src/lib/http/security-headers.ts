// Baseline browser security headers applied to every response by next.config.ts.
//
// These are deliberately conservative and framework-safe: they harden against
// MIME sniffing, referrer leakage, clickjacking, and unwanted device access
// without breaking Next.js hydration, dynamic chunks, React, or the Three.js
// <Canvas>. A strict nonce-based Content-Security-Policy is intentionally NOT
// added here — it cannot be applied cleanly to this prototype's inline
// framework/runtime behaviour, and a brittle CSP that breaks hydration would be
// security theatre. A production CSP is documented as future work.

export interface HttpHeader {
  key: string;
  value: string;
}

export function securityHeaders(): HttpHeader[] {
  return [
    // Never let the browser second-guess a declared Content-Type.
    { key: "X-Content-Type-Options", value: "nosniff" },
    // Send only the origin on cross-origin navigations; full URL same-origin.
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // This app is never meant to be embedded in a frame.
    { key: "X-Frame-Options", value: "DENY" },
    // Deny powerful device APIs the prototype does not use.
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
    // Isolate this browsing context from cross-origin openers.
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}
