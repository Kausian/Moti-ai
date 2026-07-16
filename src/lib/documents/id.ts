// Stable client-side ID generation using browser-native crypto where available.
// No UUID package is added just for this.

export function createDocumentId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `doc_${crypto.randomUUID()}`;
  }
  // Fallback for environments without crypto.randomUUID.
  return `doc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
