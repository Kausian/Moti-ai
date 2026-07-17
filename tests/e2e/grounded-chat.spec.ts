import { expect, test } from "@playwright/test";
import {
  GROUNDED_ANSWER,
  blockOtherAiRoutes,
  mockChatSuccess,
} from "./fixtures";

// Grounded chat happy path with a mocked /api/chat. Covers the consent gate, the
// send flow, and that exactly one grounded answer is rendered (no duplicate).

test("sends a question and shows a single grounded answer after consent", async ({
  page,
}) => {
  await mockChatSuccess(page);
  await blockOtherAiRoutes(page);
  await page.goto("/");

  const composer = page.getByRole("textbox", { name: "Message Moti" });
  await composer.fill("What is responsible AI?");
  await page.getByRole("button", { name: "Send" }).click();

  // First send in a session opens the consent dialog.
  const consent = page.getByRole("dialog", {
    name: "Send this message to the AI service?",
  });
  await expect(consent).toBeVisible();
  await consent.getByRole("button", { name: "Continue and send" }).click();

  // The grounded answer appears exactly once as a visible message paragraph.
  // (The same text is mirrored once in an sr-only aria-live region for screen
  // readers, so we scope to the rendered <p> rather than all text nodes.)
  const answer = page.locator("p", { hasText: GROUNDED_ANSWER.answer });
  await expect(answer).toHaveCount(1);
  await expect(answer).toBeVisible();

  // The learner's question is echoed in the transcript.
  await expect(page.getByText("What is responsible AI?")).toBeVisible();
});
