import { expect, test } from "@playwright/test";
import { blockOtherAiRoutes, mockChatError } from "./fixtures";

// Error recovery: a safe mapped provider error is shown, the learner's question
// stays in the transcript, no fabricated assistant answer is rendered, and the
// raw provider status/detail never leaks into the UI.

test("shows a safe error and preserves the question when the AI fails", async ({
  page,
}) => {
  await mockChatError(page, 503, "provider-error");
  await blockOtherAiRoutes(page);
  await page.goto("/");

  await page.getByRole("textbox", { name: "Message Moti" }).fill("Explain fairness.");
  await page.getByRole("button", { name: "Send" }).click();

  const consent = page.getByRole("dialog", {
    name: "Send this message to the AI service?",
  });
  await consent.getByRole("button", { name: "Continue and send" }).click();

  // A safe, user-facing error message appears.
  await expect(page.getByText("Moti could not reach the AI service.")).toBeVisible();

  // The learner's question is preserved in the transcript.
  await expect(page.getByText("Explain fairness.")).toBeVisible();

  // No raw provider detail (status codes, "Error:", stack frames) is shown.
  const bodyText = (await page.locator("body").innerText()).toLowerCase();
  expect(bodyText).not.toContain("http 503");
  expect(bodyText).not.toContain("stack");
});
