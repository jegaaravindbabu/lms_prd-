"use server";

import { revalidatePath } from "next/cache";
import { withTenant } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isEnrolled } from "@/lib/access";
import { scoreQuestion, rankAndPercentile, type Chosen } from "@/lib/assessment";

/** Begin an attempt. Returns the attemptId to navigate to. */
export async function startAttempt(testId: string): Promise<{ ok: boolean; attemptId?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const test = await withTenant(user.tenantId, (tx) => tx.test.findUnique({ where: { id: testId } }));
  if (!test) return { ok: false, error: "Test not found." };

  // If the test belongs to a course, the student must be enrolled.
  if (test.courseId) {
    const enrolled = await isEnrolled(user.tenantId, user.id, test.courseId);
    if (!enrolled) return { ok: false, error: "Enroll in the course to take this test." };
  }

  const attemptId = await withTenant(user.tenantId, async (tx) => {
    const a = await tx.attempt.create({ data: { tenantId: user.tenantId, testId, userId: user.id } });
    return a.id;
  });

  return { ok: true, attemptId };
}

/** Submit + grade an attempt. Idempotent once submitted. */
export async function submitAttempt(
  attemptId: string,
  answers: Record<string, Chosen>
): Promise<{ ok: boolean; testId?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const result = await withTenant(user.tenantId, async (tx) => {
    const attempt = await tx.attempt.findUnique({ where: { id: attemptId } });
    if (!attempt || attempt.userId !== user.id) return { error: "Attempt not found." as const };
    if (attempt.submittedAt) return { testId: attempt.testId }; // already submitted

    const test = await tx.test.findUnique({
      where: { id: attempt.testId },
      include: { testQuestions: { include: { question: true } } },
    });
    if (!test) return { error: "Test not found." as const };

    let score = 0;
    for (const tq of test.testQuestions) {
      const q = tq.question;
      const chosen = (answers[q.id] ?? null) as Chosen;
      const { correct, awarded } = scoreQuestion(
        { type: q.type, correctAnswer: q.correctAnswer, marks: q.marks, negativeMarks: Number(q.negativeMarks) },
        chosen,
        test.negativeMarking
      );
      score += awarded;
      await tx.response.create({
        data: {
          tenantId: user.tenantId,
          attemptId,
          questionId: q.id,
          chosen: (chosen ?? undefined) as object | undefined,
          isCorrect: chosen == null ? null : correct,
        },
      });
    }
    score = Math.round(score * 100) / 100;

    await tx.attempt.update({ where: { id: attemptId }, data: { submittedAt: new Date(), score } });

    // Rank + percentile among all submitted attempts for this test.
    const submitted = await tx.attempt.findMany({
      where: { testId: attempt.testId, submittedAt: { not: null } },
      select: { score: true },
    });
    const scores = submitted.map((s) => Number(s.score ?? 0));
    const { rank, percentile } = rankAndPercentile(scores, score);
    await tx.attempt.update({ where: { id: attemptId }, data: { rank, percentile } });

    return { testId: attempt.testId };
  });

  if ("error" in result && result.error) return { ok: false, error: result.error };
  revalidatePath("/dashboard/tests");
  return { ok: true, testId: (result as { testId: string }).testId };
}
