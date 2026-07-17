// The single source of truth for the per-session "first AI request" acknowledgement.
//
// Both the normal conversation and the Moti Mirror teach-back send learner
// content to the same configured Gemini API, so they share one acknowledgement
// and one session key. Once the learner has accepted in this session, neither
// feature asks again — there is deliberately no second consent system.

const SESSION_CONSENT_KEY = "moti-ai:ai-consent:session";

export function hasSessionConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(SESSION_CONSENT_KEY) === "true";
  } catch {
    return false;
  }
}

export function setSessionConsent(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(SESSION_CONSENT_KEY, "true");
  } catch {
    // Session storage may be unavailable (private mode); consent then re-prompts.
  }
}
