import Link from "next/link";
import { ClipboardList, Clock, Lock, Trophy, ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import { withTenant } from "@/lib/db";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Tests" };

export default async function StudentTestsPage() {
  const user = await requireUser();

  const { tests, attempts, enrolledCourseIds } = await withTenant(user.tenantId, async (tx) => {
    const tests = await tx.test.findMany({
      orderBy: { createdAt: "desc" },
      include: { course: { select: { title: true } }, _count: { select: { testQuestions: true } } },
    });
    const attempts = await tx.attempt.findMany({ where: { userId: user.id, submittedAt: { not: null } } });
    const enrollments = await tx.enrollment.findMany({ where: { userId: user.id, status: "ACTIVE" }, select: { courseId: true } });
    return { tests, attempts, enrolledCourseIds: new Set(enrollments.map((e) => e.courseId)) };
  });

  const bestByTest = new Map<string, number>();
  const countByTest = new Map<string, number>();
  for (const a of attempts) {
    const s = Number(a.score ?? 0);
    bestByTest.set(a.testId, Math.max(bestByTest.get(a.testId) ?? -Infinity, s));
    countByTest.set(a.testId, (countByTest.get(a.testId) ?? 0) + 1);
  }

  const visible = tests.filter((t) => t._count.testQuestions > 0);

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <span className="eyebrow">Assessments</span>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-luxe">Tests</h1>
        <p className="mt-2 text-muted-foreground">Practice and full-length exams.</p>
      </div>

      {visible.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-muted-foreground">No tests available yet.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((t) => {
            const locked = t.courseId ? !enrolledCourseIds.has(t.courseId) : false;
            const best = bestByTest.get(t.id);
            const count = countByTest.get(t.id) ?? 0;
            return (
              <Link key={t.id} href={`/tests/${t.id}`} className="group glass rounded-2xl p-5 transition-transform hover:-translate-y-1">
                <div className="flex items-start justify-between">
                  <span className="grid size-11 place-items-center rounded-xl bg-brand/12 ring-1 ring-inset ring-white/10"><ClipboardList className="size-5 text-brand" /></span>
                  {locked ? <Lock className="size-4 text-muted-foreground" /> : count > 0 ? <Badge variant="gold"><Trophy className="size-3.5" /> {best}/{t.totalMarks}</Badge> : <Badge variant="muted">New</Badge>}
                </div>
                <h3 className="mt-4 font-display text-lg text-foreground">{t.title}</h3>
                <p className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{t._count.testQuestions} Q · {t.totalMarks} marks</span>
                  <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {Math.round(t.durationSec / 60)}m</span>
                </p>
                {t.course?.title && <p className="mt-2 text-xs text-muted-foreground">{t.course.title}</p>}
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{count > 0 ? `${count} attempt${count > 1 ? "s" : ""}` : "Not attempted"}</span>
                  <span className="text-muted-foreground transition-colors group-hover:text-foreground">{locked ? "Enroll to unlock" : "Start"} <ArrowRight className="ml-0.5 inline size-4" /></span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
