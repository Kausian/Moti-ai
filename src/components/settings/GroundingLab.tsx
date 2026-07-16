"use client";

import { useState, type FormEvent } from "react";
import type {
  KnowledgeIndexStats,
  KnowledgeRetrievalResponse,
  KnowledgeRetrievalResult,
} from "@/lib/types";
import { useKnowledgeIndex } from "@/hooks/useKnowledgeIndex";
import { retrieveKnowledge } from "@/lib/retrieval/retrieve-knowledge";
import { MAX_QUERY_LENGTH } from "@/lib/retrieval/constants";
import { IconAlert, IconInfo } from "@/components/ui/icons";
import { inputClass } from "./formPrimitives";
import { RetrievalResultCard } from "./RetrievalResultCard";

interface GroundingLabProps {
  onPreviewChunk: (result: KnowledgeRetrievalResult) => void;
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-moti-line bg-white px-3 py-2">
      <p className="text-sm font-semibold text-moti-navy">{value}</p>
      <p className="text-[11px] text-moti-navy-soft">{label}</p>
    </div>
  );
}

function IndexStats({ stats }: { stats: KnowledgeIndexStats }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <StatTile label="Documents" value={stats.documentCount.toLocaleString("en-US")} />
      <StatTile label="Chunks" value={stats.chunkCount.toLocaleString("en-US")} />
      <StatTile
        label="Indexed characters"
        value={stats.totalIndexedCharacters.toLocaleString("en-US")}
      />
      <StatTile
        label="Avg chunk length"
        value={`${stats.averageChunkLength.toLocaleString("en-US")} chars`}
      />
    </div>
  );
}

function ResultsView({
  response,
  onPreviewChunk,
}: {
  response: KnowledgeRetrievalResponse;
  onPreviewChunk: (result: KnowledgeRetrievalResult) => void;
}) {
  if (response.meaningfulQueryTerms.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-moti-line px-3 py-3 text-sm text-moti-navy-soft">
        That question has no searchable terms — it is only common words. Include a
        specific keyword, such as a topic name.
      </p>
    );
  }

  if (!response.hasRelevantKnowledge) {
    return (
      <div className="rounded-lg border border-moti-line bg-moti-navy/[0.03] px-3 py-3">
        <p className="text-sm font-medium text-moti-navy">
          No relevant source section found.
        </p>
        <p className="mt-1 text-xs leading-5 text-moti-navy-soft">
          Nothing in your material matches this question. With no matching source,
          Moti would tell you it can&apos;t answer from your documents rather than
          guess.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-moti-navy-soft">
        Top {response.results.length} source section
        {response.results.length === 1 ? "" : "s"} for terms:{" "}
        <span className="text-moti-navy">
          {response.meaningfulQueryTerms.join(", ")}
        </span>
      </p>
      <ul className="flex flex-col gap-2">
        {response.results.map((result, index) => (
          <RetrievalResultCard
            key={result.chunk.id}
            result={result}
            rank={index + 1}
            onPreview={onPreviewChunk}
          />
        ))}
      </ul>
    </div>
  );
}

export function GroundingLab({ onPreviewChunk }: GroundingLabProps) {
  const { status, index, error } = useKnowledgeIndex();
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<KnowledgeRetrievalResponse | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const ready = status === "ready" && index !== null;

  const handleTest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setValidationError("Enter a question to test retrieval.");
      setResponse(null);
      return;
    }
    if (trimmed.length > MAX_QUERY_LENGTH) {
      setValidationError(
        `Questions are limited to ${MAX_QUERY_LENGTH} characters. Shorten it and try again.`,
      );
      return;
    }
    if (!index) return;
    setValidationError(null);
    setResponse(retrieveKnowledge(index, trimmed));
  };

  const handleClear = () => {
    setQuery("");
    setResponse(null);
    setValidationError(null);
  };

  return (
    <section aria-label="Grounding Lab" className="flex flex-col gap-4">
      <div>
        <h3 className="text-base font-semibold text-moti-navy">Grounding Lab</h3>
        <p className="mt-1 text-xs leading-5 text-moti-navy-soft">
          Test which source sections Moti would use before an AI response is
          generated. Retrieval runs locally in your browser.
        </p>
        <p className="mt-1.5 flex items-start gap-1.5 text-[11px] leading-4 text-moti-navy-soft">
          <IconInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            No AI is connected yet — this shows the exact source sections a future
            grounded answer would draw from.
          </span>
        </p>
      </div>

      {status === "error" && (
        <p className="flex items-start gap-2 rounded-lg bg-moti-danger-bg px-3 py-2 text-xs font-medium text-moti-danger">
          <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {status === "empty" && (
        <p className="rounded-lg border border-dashed border-moti-line px-3 py-3 text-sm text-moti-navy-soft">
          No knowledge documents to search yet. Add material in the Knowledge tab,
          then return here to test retrieval.
        </p>
      )}

      {ready && index && (
        <>
          <IndexStats stats={index.stats} />

          <form onSubmit={handleTest} className="flex flex-col gap-2">
            <label
              htmlFor="grounding-query"
              className="text-sm font-medium text-moti-navy"
            >
              Learner question
            </label>
            <textarea
              id="grounding-query"
              rows={2}
              value={query}
              maxLength={MAX_QUERY_LENGTH}
              onChange={(event) => {
                setQuery(event.target.value);
                if (validationError) setValidationError(null);
              }}
              placeholder="e.g. What is an AI hallucination?"
              className={`${inputClass} resize-none`}
              aria-invalid={validationError ? true : undefined}
              aria-describedby={validationError ? "grounding-query-error" : undefined}
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] text-moti-navy-soft">
                {query.length}/{MAX_QUERY_LENGTH}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-lg border border-moti-line px-3 py-1.5 text-sm font-medium text-moti-navy-soft transition-colors hover:bg-moti-navy/5 focus-visible:bg-moti-navy/5"
                >
                  Clear
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-moti-navy px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-moti-navy/90 focus-visible:bg-moti-navy/90"
                >
                  Test retrieval
                </button>
              </div>
            </div>
            {validationError && (
              <p
                id="grounding-query-error"
                className="flex items-center gap-1 text-xs font-medium text-moti-danger"
              >
                <IconAlert className="h-3.5 w-3.5 shrink-0" />
                {validationError}
              </p>
            )}
          </form>

          <div aria-live="polite">
            {response && (
              <ResultsView response={response} onPreviewChunk={onPreviewChunk} />
            )}
          </div>
        </>
      )}
    </section>
  );
}
