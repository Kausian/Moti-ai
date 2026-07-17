import { describe, expect, it } from "vitest";
import type { ConceptProgress, SaveLearningOutcomeInput } from "@/lib/types";
import {
  applyOutcomeToConcept,
  isSuccessfulOutcome,
  masteryRank,
  toPersistedMastery,
  trimEvidence,
} from "./mastery-policy";
import { MAX_EVIDENCE_PER_CONCEPT } from "./constants";

const NOW = new Date("2025-06-01T12:00:00.000Z");

function outcome(
  overrides: Partial<SaveLearningOutcomeInput> = {},
): SaveLearningOutcomeInput {
  return {
    activityId: "act-1",
    activityType: "moti-mirror",
    courseId: "course-1",
    conceptTitle: "AI Hallucinations",
    sourceDocumentId: "doc-1",
    sourceDocumentTitle: "Responsible AI Guide",
    sectionHeading: "AI Hallucinations",
    sourceIds: ["doc-1:chunk:0"],
    masteryRecommendation: "developing",
    ...overrides,
  };
}

function apply(
  existing: ConceptProgress | null,
  input: SaveLearningOutcomeInput,
): ConceptProgress {
  const mastery = toPersistedMastery(input.masteryRecommendation);
  if (!mastery) throw new Error("fixture must be evaluated");
  return applyOutcomeToConcept({
    existing,
    conceptId: "course-1:doc-1:ai-hallucinations",
    outcome: input,
    mastery,
    now: NOW,
    evidenceId: `ev-${input.activityId}`,
  });
}

describe("mastery ranking", () => {
  it("orders exploring < developing < understood", () => {
    expect(masteryRank("exploring")).toBeLessThan(masteryRank("developing"));
    expect(masteryRank("developing")).toBeLessThan(masteryRank("understood"));
  });

  it("never persists a not-evaluated recommendation", () => {
    expect(toPersistedMastery("not-evaluated")).toBeNull();
    expect(toPersistedMastery("understood")).toBe("understood");
  });
});

describe("successful-outcome policy", () => {
  it("counts an understood teach-back as successful", () => {
    expect(
      isSuccessfulOutcome(outcome({ masteryRecommendation: "understood" })),
    ).toBe(true);
    expect(
      isSuccessfulOutcome(outcome({ masteryRecommendation: "developing" })),
    ).toBe(false);
  });

  it("counts only a correct challenge as successful", () => {
    const challenge = (o: Partial<SaveLearningOutcomeInput>) =>
      outcome({ activityType: "micro-challenge", ...o });

    expect(
      isSuccessfulOutcome(
        challenge({ challengeOutcome: "correct", masteryRecommendation: "understood" }),
      ),
    ).toBe(true);
    // A challenge marked understood but not answered correctly is not evidence.
    expect(
      isSuccessfulOutcome(
        challenge({
          challengeOutcome: "partially-correct",
          masteryRecommendation: "understood",
        }),
      ),
    ).toBe(false);
    expect(
      isSuccessfulOutcome(
        challenge({ challengeOutcome: "incorrect", masteryRecommendation: "exploring" }),
      ),
    ).toBe(false);
  });
});

describe("applyOutcomeToConcept", () => {
  it("creates a concept from its first result", () => {
    const concept = apply(null, outcome({ masteryRecommendation: "exploring" }));
    expect(concept.masteryStatus).toBe("exploring");
    expect(concept.needsReview).toBe(false);
    expect(concept.activityCount).toBe(1);
    expect(concept.successfulActivityCount).toBe(0);
    expect(concept.evidence).toHaveLength(1);
    // Deterministic from the injected time.
    expect(concept.lastActivityAt).toBe(NOW.toISOString());
  });

  it("moves exploring up to developing", () => {
    const first = apply(null, outcome({ masteryRecommendation: "exploring" }));
    const next = apply(
      first,
      outcome({ activityId: "act-2", masteryRecommendation: "developing" }),
    );
    expect(next.masteryStatus).toBe("developing");
    expect(next.needsReview).toBe(false);
  });

  it("moves developing up to understood", () => {
    const first = apply(null, outcome({ masteryRecommendation: "developing" }));
    const next = apply(
      first,
      outcome({ activityId: "act-2", masteryRecommendation: "understood" }),
    );
    expect(next.masteryStatus).toBe("understood");
  });

  it("keeps understood after a weaker result, and flags a review instead", () => {
    const first = apply(null, outcome({ masteryRecommendation: "understood" }));
    const next = apply(
      first,
      outcome({ activityId: "act-2", masteryRecommendation: "exploring" }),
    );
    // One weak attempt must not erase demonstrated understanding.
    expect(next.masteryStatus).toBe("understood");
    expect(next.needsReview).toBe(true);
    expect(next.activityCount).toBe(2);
  });

  it("keeps developing after a weaker result, and flags a review", () => {
    const first = apply(null, outcome({ masteryRecommendation: "developing" }));
    const next = apply(
      first,
      outcome({ activityId: "act-2", masteryRecommendation: "exploring" }),
    );
    expect(next.masteryStatus).toBe("developing");
    expect(next.needsReview).toBe(true);
  });

  it("clears needsReview on an equal successful result", () => {
    const first = apply(null, outcome({ masteryRecommendation: "understood" }));
    const weakened = apply(
      first,
      outcome({ activityId: "act-2", masteryRecommendation: "exploring" }),
    );
    expect(weakened.needsReview).toBe(true);

    const recovered = apply(
      weakened,
      outcome({ activityId: "act-3", masteryRecommendation: "understood" }),
    );
    expect(recovered.masteryStatus).toBe("understood");
    expect(recovered.needsReview).toBe(false);
  });

  it("does not clear needsReview on an equal but unsuccessful result", () => {
    const first = apply(null, outcome({ masteryRecommendation: "understood" }));
    const weakened = apply(
      first,
      outcome({ activityId: "act-2", masteryRecommendation: "exploring" }),
    );
    // Equal to the *stored* status would be understood; a developing result is
    // still weaker, so the flag stays.
    const again = apply(
      weakened,
      outcome({ activityId: "act-3", masteryRecommendation: "developing" }),
    );
    expect(again.needsReview).toBe(true);
  });

  it("counts a correct challenge as successful evidence", () => {
    const concept = apply(
      null,
      outcome({
        activityType: "micro-challenge",
        challengeOutcome: "correct",
        masteryRecommendation: "understood",
        attemptNumber: 1,
      }),
    );
    expect(concept.successfulActivityCount).toBe(1);
    expect(concept.lastActivityType).toBe("micro-challenge");
    expect(concept.evidence[0].challengeOutcome).toBe("correct");
    expect(concept.evidence[0].attemptNumber).toBe(1);
  });

  it("increments counts once per applied activity", () => {
    let concept = apply(null, outcome({ activityId: "a" }));
    concept = apply(concept, outcome({ activityId: "b" }));
    concept = apply(concept, outcome({ activityId: "c" }));
    expect(concept.activityCount).toBe(3);
    expect(concept.evidence).toHaveLength(3);
  });

  it("refreshes display metadata from the newest activity", () => {
    const first = apply(null, outcome());
    const next = apply(
      first,
      outcome({
        activityId: "act-2",
        conceptTitle: "AI hallucinations",
        sourceDocumentTitle: "Renamed Guide",
      }),
    );
    expect(next.conceptTitle).toBe("AI hallucinations");
    expect(next.sourceDocumentTitle).toBe("Renamed Guide");
  });

  it("never records a not-evaluated challenge outcome as evidence", () => {
    const concept = apply(
      null,
      outcome({
        activityType: "micro-challenge",
        challengeOutcome: "not-evaluated",
        masteryRecommendation: "exploring",
      }),
    );
    expect(concept.evidence[0].challengeOutcome).toBeUndefined();
  });
});

describe("trimEvidence", () => {
  it("keeps only the most recent entries, newest last", () => {
    const evidence = Array.from({ length: MAX_EVIDENCE_PER_CONCEPT + 5 }, (_, i) => ({
      id: `ev-${i}`,
      activityId: `act-${i}`,
      activityType: "moti-mirror" as const,
      masteryRecommendation: "developing" as const,
      sourceIds: [],
      createdAt: NOW.toISOString(),
    }));

    const trimmed = trimEvidence(evidence);
    expect(trimmed).toHaveLength(MAX_EVIDENCE_PER_CONCEPT);
    expect(trimmed[trimmed.length - 1].id).toBe(
      `ev-${MAX_EVIDENCE_PER_CONCEPT + 4}`,
    );
  });

  it("bounds evidence as activities accumulate", () => {
    let concept = apply(null, outcome({ activityId: "act-0" }));
    for (let i = 1; i < MAX_EVIDENCE_PER_CONCEPT + 4; i += 1) {
      concept = apply(concept, outcome({ activityId: `act-${i}` }));
    }
    expect(concept.evidence.length).toBe(MAX_EVIDENCE_PER_CONCEPT);
    // Counts still reflect every activity, even though evidence is trimmed.
    expect(concept.activityCount).toBe(MAX_EVIDENCE_PER_CONCEPT + 4);
  });
});
