import type { NextConfig } from "next";
import { securityHeaders } from "./src/lib/http/security-headers";

const nextConfig: NextConfig = {
  // Baseline security headers on every route (pages and API). See
  // src/lib/http/security-headers.ts for the rationale and the deliberate
  // decision to defer a strict Content-Security-Policy.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders(),
      },
    ];
  },
};

export default nextConfig;
