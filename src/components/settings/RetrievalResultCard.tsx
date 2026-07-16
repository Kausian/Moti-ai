"use client";

import type { KnowledgeRetrievalResult } from "@/lib/types";
import { IconEye } from "@/components/ui/icons";

function formatScore(value: number): string {
  return value.toFixed(2);
}

const BREAKDOWN_ROWS: { key: keyof KnowledgeRetrievalResult["scoreBreakdown"]; label: string }[] =
  [
    { key: "contentScore", label: "Content (BM25)" },
    { key: "titleBoost", label: "Title boost" },
    { key: "headingBoost", label: "Heading boost" },
    { key: "phraseBoost", label: "Phrase boost" },
    { key: "coverageBoost", label: "Coverage boost" },
    { key: "total", label: "Total" },
  ];

interface RetrievalResultCardProps {
  result: KnowledgeRetrievalResult;
  rank: number;
  onPreview: (result: KnowledgeRetrievalResult) => void;
}

export function RetrievalResultCard({
  result,
  rank,
  onPreview,
}: RetrievalResultCardProps) {
  const { chunk, matchedTerms, scoreBreakdown, excerpt, score } = result;

  return (
    <li className="rounded-xl border border-moti-line bg-white p-3">
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-moti-navy text-xs font-semibold text-white"
        >
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-moti-navy">
            {chunk.documentTitle}
          </p>
          <p className="text-xs text-moti-navy-soft">
            {chunk.sectionHeading ? `§ ${chunk.sectionHeading}` : "No section heading"}
            {" · "}Chunk {chunk.chunkIndex + 1}
          </p>
        </div>
        <span
          title="Internal ranking value, not an AI confidence score"
          className="shrink-0 rounded-full bg-moti-navy/5 px-2 py-1 text-xs font-medium text-moti-navy-soft"
        >
          Retrieval score {formatScore(score)}
        </span>
      </div>

      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-moti-navy">
        {excerpt}
      </p>

      {matchedTerms.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wide text-moti-navy-soft">
            Matched
          </span>
          {matchedTerms.map((term) => (
            <span
              key={term}
              className="rounded-full border border-moti-line bg-moti-navy/[0.03] px-2 py-0.5 text-xs font-medium text-moti-navy"
            >
              {term}
            </span>
          ))}
        </div>
      )}

      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
        <details className="min-w-0 flex-1">
          <summary className="cursor-pointer text-xs font-medium text-moti-navy-soft">
            Score breakdown
          </summary>
          <dl className="mt-1.5 rounded-lg bg-moti-navy/[0.03] p-2.5">
            {BREAKDOWN_ROWS.map((row) => (
              <div
                key={row.key}
                className={`flex items-center justify-between py-0.5 text-xs ${
                  row.key === "total"
                    ? "mt-1 border-t border-moti-line pt-1.5 font-semibold text-moti-navy"
                    : "text-moti-navy-soft"
                }`}
              >
                <dt>{row.label}</dt>
                <dd className="font-mono">{formatScore(scoreBreakdown[row.key])}</dd>
              </div>
            ))}
            <p className="mt-1.5 text-[11px] leading-4 text-moti-navy-soft">
              An internal ranking value from local lexical matching — not an AI
              confidence score.
            </p>
          </dl>
        </details>

        <button
          type="button"
          onClick={() => onPreview(result)}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-moti-line px-2.5 py-1.5 text-xs font-medium text-moti-navy transition-colors hover:bg-moti-navy/5 focus-visible:bg-moti-navy/5"
        >
          <IconEye className="h-4 w-4 text-moti-navy-soft" />
          Preview full chunk
        </button>
      </div>
    </li>
  );
}
