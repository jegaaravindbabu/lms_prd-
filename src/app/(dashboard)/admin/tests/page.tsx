import Link from "next/link";
import { ClipboardList, Clock, Users, Pencil, Sparkles } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { withTenant } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { NewTest } from "@/components/admin/new-test";

export const metadata = { title: "Tests" };

export default async function AdminTestsPage() {
  const user = await requireRole(["OWNER", "ADMIN", "INSTRUCTOR"]);

  const tests = await withTenant(user.tenantId, (tx) =>
    tx.test.findMany({
      orderBy: { createdAt: "desc" },
      include: { course: { select: { title: true } }, _count: { select: { testQuestions: true, attempts: true } } },
    })
  );

  return (
    <div className="space-y-8">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow"><Sparkles className="size-3.5 text-gold" /> Assessments</span>
          <h1 className="mt-3 font-display text-4xl tracking-tight text-luxe">Tests</h1>
          <p className="mt-2 text-muted-foreground">Timed exams built from your question bank.</p>
        </div>
        <NewTest />
      </div>

      {tests.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <ClipboardList className="mx-auto size-10 text-brand" />
          <p className="mt-4 text-muted-foreground">No tests yet. Create one, then add questions.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/8">
          {tests.map((t, i) => (
            <Link key={t.id} href={`/admin/tests/${t.id}`} className={`flex items-center gap-4 bg-card/40 px-5 py-4 transition-colors hover:bg-white/[0.03] ${i > 0 ? "border-t border-white/6" : ""}`}>
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand/12 ring-1 ring-inset ring-white/10"><ClipboardList className="size-5 text-brand" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-display text-base text-foreground">{t.title}</h3>
                  {t.negativeMarking && <Badge variant="muted">−ve marking</Badge>}
                  {t.course?.title && <Badge variant="muted">{t.course.title}</Badge>}
                </div>
                <p className="mt-0.5 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{t._count.testQuestions} questions · {t.totalMarks} marks</span>
                  <span className="inline-flex items-center gap-1"><Clock className="size-3.5" /> {Math.round(t.durationSec / 60)} min</span>
                  <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> {t._count.attempts} attempts</span>
                </p>
              </div>
              <Pencil className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
