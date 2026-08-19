import Link from "next/link";
import { ArrowRight, GraduationCap, CheckCircle2, Trophy } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import { withTenant } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Progress" };

export default async function ProgressPage() {
  const user = await requireUser();

  const { enrollments, completedIds } = await withTenant(user.tenantId, async (tx) => {
    const enrollments = await tx.enrollment.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      include: {
        course: {
          include: {
            instructor: { select: { name: true } },
            sections: { include: { lessons: { select: { id: true } } } },
          },
        },
      },
      orderBy: { enrolledAt: "desc" },
    });
    const progress = await tx.progress.findMany({
      where: { userId: user.id, completed: true },
      select: { lessonId: true },
    });
    return { enrollments, completedIds: new Set(progress.map((p) => p.lessonId)) };
  });

  // Per-course completion.
  const rows = enrollments.map(({ course }) => {
    const lessonIds = course.sections.flatMap((s) => s.lessons.map((l) => l.id));
    const total = lessonIds.length;
    const done = lessonIds.filter((id) => completedIds.has(id)).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { id: course.id, title: course.title, instructor: course.instructor?.name ?? null, total, done, pct };
  });

  const totalLessons = rows.reduce((s, r) => s + r.total, 0);
  const totalDone = rows.reduce((s, r) => s + r.done, 0);
  const overallPct = totalLessons ? Math.round((totalDone / totalLessons) * 100) : 0;
  const coursesCompleted = rows.filter((r) => r.total > 0 && r.pct === 100).length;

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <span className="eyebrow"><GraduationCap className="size-3.5 text-gold" /> Your learning</span>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-luxe">Progress</h1>
        <p className="mt-2 text-muted-foreground">How far you&rsquo;ve come across every course you&rsquo;re enrolled in.</p>
      </div>

      {enrollments.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="text-muted-foreground">You haven&rsquo;t enrolled in any courses yet.</p>
          <Button asChild className="mt-5"><Link href="/">Browse the catalog <ArrowRight className="size-4" /></Link></Button>
        </div>
      ) : (
        <>
          {/* Overall summary */}
          <div className="glass rounded-2xl p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="eyebrow">Overall</span>
                <p className="mt-2 font-display text-3xl text-luxe">{overallPct}% complete</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {totalDone} of {totalLessons} lessons done · {coursesCompleted} course{coursesCompleted === 1 ? "" : "s"} finished
                </p>
              </div>
              {overallPct === 100 && totalLessons > 0 && (
                <Badge variant="gold"><Trophy className="size-3.5" /> All caught up</Badge>
              )}
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
              <div className="h-full rounded-full bg-brand shadow-[0_0_12px_hsl(var(--brand))]" style={{ width: `${overallPct}%` }} />
            </div>
          </div>

          {/* Per-course rows */}
          <div className="glass overflow-hidden rounded-2xl">
            {rows.map((r, i) => (
              <Link
                key={r.id}
                href={`/learn/${r.id}`}
                className={`flex items-center gap-5 px-5 py-4 transition-colors hover:bg-white/[0.03] ${i > 0 ? "border-t border-white/6" : ""}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-display text-base text-foreground">{r.title}</h3>
                    {r.total > 0 && r.pct === 100 && (
                      <CheckCircle2 className="size-4 shrink-0 text-gold" />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {r.instructor ? `with ${r.instructor} · ` : ""}{r.done}/{r.total} lessons
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${r.pct}%` }} />
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <span className="font-display text-lg text-luxe">{r.pct}%</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
