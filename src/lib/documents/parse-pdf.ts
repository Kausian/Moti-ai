// Client-side PDF text extraction using pdfjs-dist. This module dynamically
// imports pdfjs so it never runs during server rendering, and configures the
// worker as a same-origin bundled asset (no CDN, no network upload). No OCR:
// scanned / image-only PDFs will produce no text and are rejected upstream.

import { documentError } from "./errors";

let workerConfigured = false;

export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");

  if (!workerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    workerConfigured = true;
  }

  let data: ArrayBuffer;
  try {
    data = await file.arrayBuffer();
  } catch {
    throw documentError("read-failed", `Could not read "${file.name}". Please try again.`);
  }

  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(data) });
  let pdf;
  try {
    pdf = await loadingTask.promise;
  } catch {
    throw documentError(
      "malformed-pdf",
      `"${file.name}" couldn't be opened. It may be corrupted or password-protected.`,
    );
  }

  const pages: string[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();

      let pageText = "";
      for (const item of textContent.items) {
        if ("str" in item) {
          pageText += item.str;
          pageText += item.hasEOL ? "\n" : " ";
        }
      }
      pages.push(pageText);
      page.cleanup();
    }
  } catch {
    throw documentError(
      "malformed-pdf",
      `Something went wrong reading "${file.name}". The PDF may be damaged.`,
    );
  } finally {
    // Releases the document and its worker resources.
    await loadingTask.destroy();
  }

  return pages.join("\n\n");
}
