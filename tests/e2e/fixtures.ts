import type { Page, Route } from "@playwright/test";

// Deterministic fixtures + route interception so the E2E suite never calls the
// real Gemini API. Every /api/** call is intercepted; specs opt into specific
// responses per route.

export const GROUNDED_ANSWER = {
  answer: "Responsible AI means building systems that are fair, accountable, and transparent.",
  responseMode: "grounded" as const,
  usedSourceIds: [] as string[],
  suggestedActions: [] as string[],
};

/** Fulfil a JSON response with no-store, mirroring the real routes. */
export async function fulfilJson(
  route: Route,
  status: number,
  body: unknown,
): Promise<void> {
  await route.fulfill({
    status,
    contentType: "application/json",
    headers: { "cache-control": "no-store" },
    body: JSON.stringify(body),
  });
}

/**
 * Intercept /api/chat with a single grounded answer. The `usedSourceIds` are left
 * empty so the fixture does not depend on which chunks local retrieval selects.
 */
export async function mockChatSuccess(page: Page): Promise<void> {
  await page.route("**/api/chat", async (route) => {
    await fulfilJson(route, 200, { response: GROUNDED_ANSWER });
  });
}

/** Intercept /api/chat with a safe, mapped provider error payload. */
export async function mockChatError(
  page: Page,
  status = 503,
  code = "provider-error",
): Promise<void> {
  await page.route("**/api/chat", async (route) => {
    await fulfilJson(route, status, {
      error: {
        code,
        message: "Moti could not reach the AI service.",
        retryable: true,
      },
    });
  });
}

/** Fail every other AI route hard, so an unexpected real call is impossible. */
export async function blockOtherAiRoutes(page: Page): Promise<void> {
  await page.route("**/api/teach-back", (route) => route.abort());
  await page.route("**/api/challenge/**", (route) => route.abort());
}
