import { expect, test } from "@playwright/test";

// Smoke test: the app opens cleanly with no uncaught page error, the core
// workspace is present, and at most one WebGL <canvas> exists at a time. It does
// not send any AI request, so no interception is needed.

test("application opens with a functional workspace", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const response = await page.goto("/");

  // Baseline security headers are served on the document response.
  const headers = response?.headers() ?? {};
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");

  // The conversation region and composer are the load-bearing UI.
  await expect(
    page.getByRole("region", { name: "Learning conversation" }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Message Moti" })).toBeVisible();

  // The 3D assistant either renders one canvas or falls back to a 2D view — never
  // more than one canvas, and its absence must not block the conversation.
  const canvasCount = await page.locator("canvas").count();
  expect(canvasCount).toBeLessThanOrEqual(1);

  expect(pageErrors).toEqual([]);
});
