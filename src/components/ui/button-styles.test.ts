import { describe, expect, it } from "vitest";
import { buttonClass } from "./button-styles";

describe("buttonClass", () => {
  it("includes base, size, and variant classes", () => {
    const cls = buttonClass("primary", "md");
    expect(cls).toContain("inline-flex");
    expect(cls).toContain("min-h-[40px]");
    expect(cls).toContain("bg-moti-navy");
  });

  it("applies the requested variant", () => {
    expect(buttonClass("destructive")).toContain("text-status-error");
    expect(buttonClass("ghost")).toContain("hover:bg-moti-navy/5");
    expect(buttonClass("secondary")).toContain("border-border-subtle");
  });

  it("applies the requested size", () => {
    expect(buttonClass("primary", "sm")).toContain("min-h-[34px]");
    expect(buttonClass("primary", "md")).toContain("min-h-[40px]");
  });

  it("defaults to primary/md", () => {
    expect(buttonClass()).toBe(buttonClass("primary", "md"));
  });

  it("always carries a visible focus ring and disabled affordance", () => {
    const cls = buttonClass();
    expect(cls).toContain("focus-visible:outline-2");
    expect(cls).toContain("disabled:opacity-50");
  });

  it("appends extra classes when provided", () => {
    expect(buttonClass("primary", "md", "w-full")).toContain("w-full");
  });

  it("omits falsy extra classes cleanly", () => {
    expect(buttonClass("primary", "md", undefined)).not.toContain("undefined");
  });
});
