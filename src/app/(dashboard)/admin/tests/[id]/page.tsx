import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { withTenant } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TestBuilder, type QMini } from "@/components/admin/test-builder";

export const metadata = { title: "Edit test" };

export default async function TestEditorPage({ params }: { params: { id: string } }) {
  const user = await requireRole(["OWNER", "ADMIN", "INSTRUCTOR"]);

  const data = await withTenant(user.tenantId, async (tx) => {
    const test = await tx.test.findUnique({
      where: { id: params.id },
      include: { testQuestions: { orderBy: { order: "asc" }, include: { question: true } } },
    });
    if (!test) return null;
    const allQuestions = await tx.question.findMany({ orderBy: { createdAt: "desc" } });
    const courses = await tx.course.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } });
    return { test, allQuestions, courses };
  });

  if (!data?.test) notFound();
  const { test, allQuestions, courses } = data;

  const attachedIds = new Set(test.testQuestions.map((tq) => tq.questionId));
  const attached: QMini[] = test.testQuestions.map((tq) => ({ id: tq.question.id, body: tq.question.body, type: tq.question.type, marks: tq.question.marks }));
  const bank: QMini[] = allQuestions.filter((q) => !attachedIds.has(q.id)).map((q) => ({ id: q.id, body: q.body, type: q.type, marks: q.marks }));

  const startsAtLocal = test.startsAt ? new Date(test.startsAt.getTime() - test.startsAt.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : null;

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <Link href="/admin/tests" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> All tests
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl tracking-tight text-luxe">{test.title}</h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              {test.totalMarks} marks
              {test.negativeMarking && <Badge variant="muted">negative marking</Badge>}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={`/tests/${test.id}`} target="_blank"><ExternalLink className="size-4" /> Preview</Link>
          </Button>
        </div>
      </div>

      <TestBuilder
        testId={test.id}
        test={{
          title: test.title,
          durationMin: Math.round(test.durationSec / 60),
          negativeMarking: test.negativeMarking,
          courseId: test.courseId,
          startsAt: startsAtLocal,
        }}
        attached={attached}
        bank={bank}
        courses={courses}
      />
    </div>
  );
}
