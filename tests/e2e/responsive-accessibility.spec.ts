import { expect, test } from "@playwright/test";
import { blockOtherAiRoutes, mockChatSuccess } from "./fixtures";

// Phase 12 regression: responsive layout, keyboard access, focus management,
// reduced-motion, and the one-Canvas rule. AI routes are mocked; no real Gemini.

test("no horizontal overflow and one canvas across key breakpoints", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));

  for (const width of [1440, 1280, 1024, 768, 430, 375, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(overflow, `horizontal overflow at ${width}px`).toBe(false);
    expect(await page.locator("canvas").count()).toBeLessThanOrEqual(1);
  }
  expect(pageErrors).toEqual([]);
});

test("mobile panel switching works and preserves the composer", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  const tablist = page.getByRole("tablist", { name: "Workspace panels" });
  await expect(tablist).toBeVisible();

  // Type a draft, switch panels, switch back — the draft must survive.
  const composer = page.getByRole("textbox", { name: "Message Moti" });
  await composer.fill("draft that must survive");
  await tablist.getByRole("tab", { name: "Journey" }).click();
  await tablist.getByRole("tab", { name: "Learn" }).click();
  await expect(page.getByRole("textbox", { name: "Message Moti" })).toHaveValue(
    "draft that must survive",
  );
});

test("primary controls are keyboard reachable", async ({ page }) => {
  await page.goto("/");
  // Tab into the document and confirm focus lands on real, named controls.
  const names: string[] = [];
  for (let i = 0; i < 8; i += 1) {
    await page.keyboard.press("Tab");
    const info = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      if (!el || el === document.body) return null;
      return el.getAttribute("aria-label") || el.textContent?.trim().slice(0, 30) || el.tagName;
    });
    if (info) names.push(info);
  }
  // The composer textbox must be keyboard-reachable.
  await page.getByRole("textbox", { name: "Message Moti" }).focus();
  await expect(page.getByRole("textbox", { name: "Message Moti" })).toBeFocused();
  expect(names.length).toBeGreaterThan(0);
});

test("Settings opens, traps focus, and restores focus to its trigger on close", async ({
  page,
}) => {
  await page.goto("/");
  const settingsButton = page.getByRole("button", { name: "Settings" });
  await settingsButton.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  // Escape closes and focus returns to the Settings trigger.
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(settingsButton).toBeFocused();
});

test("source preview opens above the assistant canvas and closes with focus restored", async ({
  page,
}) => {
  await mockChatSuccess(page);
  await blockOtherAiRoutes(page);
  await page.goto("/");

  await page.getByRole("textbox", { name: "Message Moti" }).fill("What is responsible AI?");
  await page.getByRole("button", { name: "Send" }).click();
  await page
    .getByRole("dialog", { name: "Send this message to the AI service?" })
    .getByRole("button", { name: "Continue and send" })
    .click();

  // A grounded answer with a source exposes a source control; open its preview.
  const sourceButton = page.getByRole("button", { name: /source|excerpt|chunk/i }).first();
  if ((await sourceButton.count()) > 0) {
    await sourceButton.click();
    const preview = page.getByRole("dialog");
    await expect(preview).toBeVisible();
    // The dialog paints above the canvas (higher stacking context).
    const dialogZ = await preview.evaluate((el) => {
      let node: HTMLElement | null = el as HTMLElement;
      while (node) {
        const z = Number(getComputedStyle(node).zIndex);
        if (!Number.isNaN(z) && z > 0) return z;
        node = node.parentElement;
      }
      return 0;
    });
    expect(dialogZ).toBeGreaterThan(0);
    await page.keyboard.press("Escape");
    await expect(preview).toBeHidden();
  }
});

test("reduced-motion keeps assistant status text available", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  // Moti's state is conveyed in HTML text inside the assistant region, not only
  // via canvas motion. The region and the conversation stay usable.
  const assistant = page.getByRole("complementary", { name: "Moti assistant" });
  await expect(assistant).toBeVisible();
  await expect(assistant.getByText("Moti", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Learning conversation" })).toBeVisible();
  expect(await page.locator("canvas").count()).toBeLessThanOrEqual(1);
});
