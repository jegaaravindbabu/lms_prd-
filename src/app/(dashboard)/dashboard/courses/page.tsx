import Link from "next/link";
import { ArrowRight, PlayCircle, CheckCircle2 } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import { withTenant } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "My Courses" };

export default async function MyCoursesPage() {
  const user = await requireUser();

  const { enrollments, progress } = await withTenant(user.tenantId, async (tx) => {
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
    const progress = await tx.progress.findMany({ where: { userId: user.id, completed: true } });
    return { enrollments, progress };
  });

  const completedIds = new Set(progress.map((p) => p.lessonId));

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <span className="eyebrow">Library</span>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-luxe">My Courses</h1>
        <p className="mt-2 text-muted-foreground">Everything you&rsquo;re enrolled in.</p>
      </div>

      {enrollments.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center">
          <p className="text-muted-foreground">You haven&rsquo;t enrolled in any courses yet.</p>
          <Button asChild className="mt-5"><Link href="/">Browse the catalog <ArrowRight className="size-4" /></Link></Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {enrollments.map(({ course }) => {
            const lessonIds = course.sections.flatMap((s) => s.lessons.map((l) => l.id));
            const total = lessonIds.length;
            const done = lessonIds.filter((id) => completedIds.has(id)).length;
            const pct = total ? Math.round((done / total) * 100) : 0;
            return (
              <Link key={course.id} href={`/learn/${course.id}`} className="group glass overflow-hidden rounded-2xl p-1 transition-transform hover:-translate-y-1">
                <div className="relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-brand/25 to-gold/10">
                  {course.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center">
                      <PlayCircle className="size-10 text-white/80 transition-transform group-hover:scale-110" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  {pct === 100 ? (
                    <Badge variant="gold" className="mb-2"><CheckCircle2 className="size-3.5" /> Completed</Badge>
                  ) : (
                    <Badge variant="muted" className="mb-2">{pct}% complete</Badge>
                  )}
                  <h3 className="font-display text-base leading-tight text-foreground">{course.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {course.instructor?.name ? `with ${course.instructor.name}` : "Faculty-led"}
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full rounded-full bg-brand shadow-[0_0_10px_hsl(var(--brand))]" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
