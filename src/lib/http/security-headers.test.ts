import { describe, expect, it } from "vitest";
import { securityHeaders } from "./security-headers";

describe("securityHeaders", () => {
  const headers = securityHeaders();
  const byKey = new Map(headers.map((h) => [h.key, h.value]));

  it("sets the expected baseline headers", () => {
    expect(byKey.get("X-Content-Type-Options")).toBe("nosniff");
    expect(byKey.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(byKey.get("X-Frame-Options")).toBe("DENY");
    expect(byKey.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
  });

  it("denies unused device APIs via Permissions-Policy", () => {
    const policy = byKey.get("Permissions-Policy") ?? "";
    for (const feature of ["camera", "microphone", "geolocation", "payment", "usb"]) {
      expect(policy).toContain(`${feature}=()`);
    }
  });

  it("does not add a brittle Content-Security-Policy", () => {
    expect(byKey.has("Content-Security-Policy")).toBe(false);
  });

  it("uses unique header keys", () => {
    expect(new Set(headers.map((h) => h.key)).size).toBe(headers.length);
  });
});
