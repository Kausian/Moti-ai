// Pure section splitting. Recognizes Markdown ATX headings (# .. ######) and
// groups the text beneath each heading into a section, preserving exact offsets
// into the original document content. The stored text is never mutated.

export interface DocumentSection {
  /** Heading text with the leading `#`s stripped, when the section has one. */
  heading?: string;
  /** Trimmed body text of the section (a substring of the document content). */
  body: string;
  /** Offset in the original content where `body` begins. */
  bodyStart: number;
}

const HEADING_PATTERN = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/;

interface RawSection {
  heading?: string;
  bodyStart: number;
  bodyEnd: number;
}

export function splitIntoSections(content: string): DocumentSection[] {
  const rawSections: RawSection[] = [];
  let currentHeading: string | undefined;
  let bodyStart = 0;
  let offset = 0;

  const pushSection = (bodyEnd: number) => {
    rawSections.push({ heading: currentHeading, bodyStart, bodyEnd });
  };

  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const lineStart = offset;
    const match = HEADING_PATTERN.exec(line);
    if (match) {
      // Close the section that precedes this heading, then open a new one.
      pushSection(lineStart);
      currentHeading = match[1].trim();
      bodyStart = lineStart + line.length + 1; // start of the line after the heading
    }
    offset += line.length + 1; // +1 for the newline that split() removed
  }
  pushSection(content.length);

  const sections: DocumentSection[] = [];
  for (const raw of rawSections) {
    const rawBody = content.slice(raw.bodyStart, raw.bodyEnd);
    const leadingWhitespace = rawBody.length - rawBody.trimStart().length;
    const body = rawBody.trim();
    if (body.length === 0) continue; // skip headings with no body
    sections.push({
      heading: raw.heading,
      body,
      bodyStart: raw.bodyStart + leadingWhitespace,
    });
  }
  return sections;
}
