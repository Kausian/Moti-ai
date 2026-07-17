// Pure conversation helpers shared by the client hook. Framework-free so they
// can be unit-tested without React.

import type {
  ChatSourceInput,
  ConversationHistoryItem,
  ConversationMessage,
  ConversationSource,
  KnowledgeRetrievalResult,
} from "@/lib/types";
import { MAX_HISTORY_ITEMS, MAX_SOURCE_CONTENT_LENGTH } from "./constants";

/**
 * Builds the limited history to send with a request: only complete user/assistant
 * messages (pending and failed ones are excluded), most recent first capped at
 * MAX_HISTORY_ITEMS, preserving order.
 */
export function buildRequestHistory(
  messages: ConversationMessage[],
): ConversationHistoryItem[] {
  return messages
    .filter(
      (message) => message.status === "complete" && message.content.trim().length > 0,
    )
    .slice(-MAX_HISTORY_ITEMS)
    .map((message) => ({ role: message.role, content: message.content }));
}

/** Converts retrieval results into the source payload sent to the server. */
export function toChatSources(
  results: KnowledgeRetrievalResult[],
): ChatSourceInput[] {
  return results.map((result) => ({
    chunkId: result.chunk.id,
    documentId: result.chunk.documentId,
    documentTitle: result.chunk.documentTitle,
    sectionHeading: result.chunk.sectionHeading,
    chunkIndex: result.chunk.chunkIndex,
    content: result.chunk.content.slice(0, MAX_SOURCE_CONTENT_LENGTH),
  }));
}

/**
 * Maps the model's validated `usedSourceIds` back to the sources the client
 * actually sent. Unknown ids are never displayed; duplicates are removed.
 */
export function selectUsedSources(
  sent: ChatSourceInput[],
  usedSourceIds: string[],
): ConversationSource[] {
  const byId = new Map(sent.map((source) => [source.chunkId, source]));
  const seen = new Set<string>();
  const selected: ConversationSource[] = [];

  for (const id of usedSourceIds) {
    if (seen.has(id)) continue;
    const source = byId.get(id);
    if (!source) continue;
    seen.add(id);
    selected.push({
      id: source.chunkId,
      documentId: source.documentId,
      documentTitle: source.documentTitle,
      sectionHeading: source.sectionHeading,
      content: source.content,
      chunkIndex: source.chunkIndex,
    });
  }
  return selected;
}
