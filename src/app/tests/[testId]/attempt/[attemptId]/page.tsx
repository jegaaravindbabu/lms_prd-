import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/rbac";
import { withTenant } from "@/lib/db";
import { TestRunner } from "@/components/tests/test-runner";
import type { Option, SafeQuestion } from "@/lib/assessment";

export const metadata = { title: "Attempt" };

export default async function AttemptPage({ params }: { params: { testId: string; attemptId: string } }) {
  const user = await requireUser();

  const data = await withTenant(user.tenantId, async (tx) => {
    const attempt = await tx.attempt.findUnique({ where: { id: params.attemptId } });
    if (!attempt || attempt.userId !== user.id || attempt.testId !== params.testId) return null;
    const test = await tx.test.findUnique({
      where: { id: params.testId },
      include: { testQuestions: { orderBy: { order: "asc" }, include: { question: true } } },
    });
    return { attempt, test };
  });

  if (!data?.attempt || !data.test) notFound();
  if (data.attempt.submittedAt) redirect(`/tests/${params.testId}/result/${params.attemptId}`);

  // Sanitize — correct answers NEVER go to the browser during the attempt.
  const questions: SafeQuestion[] = data.test.testQuestions.map((tq) => {
    const q = tq.question;
    return {
      id: q.id,
      type: q.type,
      body: q.body,
      options: (Array.isArray(q.options) ? q.options : []) as unknown as Option[],
      marks: q.marks,
      negativeMarks: Number(q.negativeMarks),
      subject: q.subject,
    };
  });

  return (
    <TestRunner
      attemptId={data.attempt.id}
      testId={data.test.id}
      title={data.test.title}
      durationSec={data.test.durationSec}
      startedAtMs={data.attempt.startedAt.getTime()}
      questions={questions}
      negativeMarking={data.test.negativeMarking}
    />
  );
}
