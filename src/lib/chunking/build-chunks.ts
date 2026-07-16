// Builds chunks across all active documents. Each document is chunked in
// isolation, so chunk ids and indices never collide between documents.

import type { KnowledgeChunk, KnowledgeDocument } from "@/lib/types";
import { chunkDocument } from "./chunk-document";

export function buildChunks(documents: KnowledgeDocument[]): KnowledgeChunk[] {
  return documents.flatMap((document) => chunkDocument(document));
}
