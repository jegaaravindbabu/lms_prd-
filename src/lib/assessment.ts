// ============================================================================
//  Assessment grading
// ----------------------------------------------------------------------------
//  Grades a response against a question. Correct answers NEVER reach the client
//  during an attempt — sanitizeQuestion() strips them; grading happens on the
//  server only.
// ============================================================================

import type { QuestionType } from "@prisma/client";

export type Option = { id: string; text: string };

/** A question as sent to the browser during an attempt — no correct answer. */
export type SafeQuestion = {
  id: string;
  type: QuestionType;
  body: string;
  options: Option[];
  marks: number;
  negativeMarks: number;
  subject: string | null;
};

export type Chosen = string[] | { value: number } | null;

function asIdSet(v: unknown): Set<string> {
  if (Array.isArray(v)) return new Set(v.map(String));
  if (typeof v === "string") return new Set([v]);
  return new Set();
}

/** Is the chosen answer correct for this question? */
export function isCorrect(type: QuestionType, correctAnswer: unknown, chosen: Chosen): boolean {
  if (chosen == null) return false;

  switch (type) {
    case "SINGLE":
    case "TRUE_FALSE": {
      const correct = asIdSet(correctAnswer);
      const picked = asIdSet(chosen);
      return picked.size === 1 && [...picked][0] !== undefined && correct.has([...picked][0]);
    }
    case "MULTIPLE": {
      const correct = asIdSet(correctAnswer);
      const picked = asIdSet(chosen);
      if (correct.size !== picked.size) return false;
      for (const c of correct) if (!picked.has(c)) return false;
      return true;
    }
    case "NUMERIC": {
      const target = typeof correctAnswer === "object" && correctAnswer !== null
        ? Number((correctAnswer as { value: unknown }).value)
        : Number(correctAnswer);
      const got = chosen && typeof chosen === "object" && "value" in chosen ? Number((chosen as { value: number }).value) : NaN;
      return Number.isFinite(target) && Number.isFinite(got) && Math.abs(target - got) < 1e-6;
    }
    default:
      return false;
  }
}

/** Marks for one question: full if correct, negative if wrong (when enabled), 0 if blank. */
export function scoreQuestion(
  q: { type: QuestionType; correctAnswer: unknown; marks: number; negativeMarks: number },
  chosen: Chosen,
  negativeMarking: boolean
): { correct: boolean; awarded: number; answered: boolean } {
  const answered =
    chosen != null &&
    ((Array.isArray(chosen) && chosen.length > 0) ||
      (typeof chosen === "object" && "value" in chosen && Number.isFinite(Number(chosen.value))));

  if (!answered) return { correct: false, awarded: 0, answered: false };

  const correct = isCorrect(q.type, q.correctAnswer, chosen);
  if (correct) return { correct: true, awarded: q.marks, answered: true };
  return { correct: false, awarded: negativeMarking ? -Math.abs(q.negativeMarks) : 0, answered: true };
}

/** Rank (1-based) and percentile of `score` among all submitted scores. */
export function rankAndPercentile(allScores: number[], score: number): { rank: number; percentile: number } {
  const total = allScores.length;
  if (total === 0) return { rank: 1, percentile: 100 };
  const better = allScores.filter((s) => s > score).length;
  const atOrBelow = allScores.filter((s) => s <= score).length;
  const rank = better + 1;
  const percentile = Math.round((atOrBelow / total) * 1000) / 10;
  return { rank, percentile };
}
