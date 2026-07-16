// A small, explicit English stop-word list. Deliberately conservative: it holds
// common function words that carry little search meaning, and intentionally
// excludes content words like "make", "clear", "use", or "prompt" that learners
// legitimately search for.

export const STOP_WORDS: ReadonlySet<string> = new Set([
  "a", "an", "the",
  "and", "or", "but", "nor", "so", "yet",
  "if", "then", "else", "because", "while", "although",
  "of", "to", "in", "on", "for", "with", "as", "at", "by", "from",
  "into", "onto", "about", "over", "under", "between", "through",
  "is", "am", "are", "was", "were", "be", "been", "being",
  "do", "does", "did", "done",
  "have", "has", "had",
  "it", "its", "this", "that", "these", "those",
  "i", "you", "he", "she", "they", "we", "me", "him", "her", "them", "us",
  "my", "your", "his", "their", "our",
  "what", "which", "who", "whom", "whose", "when", "where", "why", "how",
  "can", "could", "should", "would", "will", "shall", "may", "might", "must",
  "not", "no", "yes",
  "there", "here", "than", "too", "very", "just", "also",
  "some", "any", "all", "each", "more", "most", "such", "own",
]);

export function isStopWord(term: string): boolean {
  return STOP_WORDS.has(term);
}
