// Pure, deterministic chunking of a single document into section- and
// paragraph-aware chunks with contextual overlap. Offsets always refer to the
// document's original `content`, which is never mutated.

import type { KnowledgeChunk, KnowledgeDocument } from "@/lib/types";
import {
  CHUNK_OVERLAP,
  MAX_CHUNK_SIZE,
  MIN_TRAILING_CHUNK_SIZE,
  TARGET_CHUNK_SIZE,
} from "./constants";
import { splitIntoSections } from "./split-sections";

interface BodyPiece {
  content: string;
  start: number;
  end: number;
}

function isWhitespace(character: string): boolean {
  return /\s/.test(character);
}

/**
 * Chooses a cut point for a chunk starting at `pos`, preferring paragraph,
 * then line, then sentence, then word boundaries, and never exceeding the hard
 * maximum. Returns an index into `body`.
 */
function findCutPoint(body: string, pos: number): number {
  const hardMax = Math.min(pos + MAX_CHUNK_SIZE, body.length);
  if (hardMax >= body.length) return body.length;

  const minCut = pos + Math.floor(TARGET_CHUNK_SIZE / 2);
  const window = body.slice(pos, hardMax);

  const paragraph = window.lastIndexOf("\n\n");
  if (paragraph >= 0 && pos + paragraph >= minCut) return pos + paragraph;

  const newline = window.lastIndexOf("\n");
  if (newline >= 0 && pos + newline >= minCut) return pos + newline;

  const sentence = Math.max(window.lastIndexOf(". "), window.lastIndexOf(".\n"));
  if (sentence >= 0 && pos + sentence + 1 >= minCut) return pos + sentence + 1;

  const space = window.lastIndexOf(" ");
  if (space >= 0 && pos + space >= minCut) return pos + space;

  return hardMax;
}

/** Moves an index to the nearest following word start, for clean overlap. */
function snapToWordStart(body: string, index: number, lowerBound: number): number {
  let i = Math.max(index, lowerBound);
  while (i > lowerBound && !isWhitespace(body[i - 1])) i -= 1;
  while (i < body.length && isWhitespace(body[i])) i += 1;
  return i;
}

function chunkSectionBody(body: string, bodyStart: number): BodyPiece[] {
  if (body.length <= MAX_CHUNK_SIZE) {
    return [{ content: body, start: bodyStart, end: bodyStart + body.length }];
  }

  const pieces: BodyPiece[] = [];
  let pos = 0;
  while (pos < body.length) {
    let end = findCutPoint(body, pos);
    if (
      body.length - end < MIN_TRAILING_CHUNK_SIZE &&
      body.length - pos <= MAX_CHUNK_SIZE
    ) {
      end = body.length; // absorb a small remainder rather than emit a tiny chunk
    }

    const rawSlice = body.slice(pos, end);
    const leading = rawSlice.length - rawSlice.trimStart().length;
    const trailing = rawSlice.length - rawSlice.trimEnd().length;
    const content = rawSlice.slice(leading, rawSlice.length - trailing);
    if (content.length > 0) {
      pieces.push({
        content,
        start: bodyStart + pos + leading,
        end: bodyStart + end - trailing,
      });
    }

    if (end >= body.length) break;

    let nextPos = snapToWordStart(body, end - CHUNK_OVERLAP, pos + 1);
    if (nextPos <= pos) nextPos = end; // guarantee forward progress
    pos = nextPos;
  }
  return pieces;
}

export function chunkDocument(document: KnowledgeDocument): KnowledgeChunk[] {
  const sections = splitIntoSections(document.content);
  const chunks: KnowledgeChunk[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    for (const piece of chunkSectionBody(section.body, section.bodyStart)) {
      chunks.push({
        id: `${document.id}:chunk:${chunkIndex}`,
        documentId: document.id,
        documentTitle: document.title,
        documentType: document.documentType,
        chunkIndex,
        sectionHeading: section.heading,
        content: piece.content,
        characterStart: piece.start,
        characterEnd: piece.end,
        characterCount: piece.content.length,
      });
      chunkIndex += 1;
    }
  }
  return chunks;
}
