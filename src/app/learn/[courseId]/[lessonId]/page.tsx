import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ArrowRight, FileText, Download, Lock, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import { getTenant } from "@/lib/tenant";
import { withTenant } from "@/lib/db";
import { isEnrolled } from "@/lib/access";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Player } from "@/components/learn/player";
import { MarkComplete } from "@/components/learn/mark-complete";
import { LessonList, type SectionRow } from "@/components/learn/lesson-list";

export const metadata = { title: "Learn" };

export default async function LearnLessonPage({
  params,
}: {
  params: { courseId: string; lessonId: string };
}) {
  const user = await requireUser();
  const tenant = await getTenant();

  const data = await withTenant(user.tenantId, async (tx) => {
    const course = await tx.course.findUnique({
      where: { id: params.courseId },
      include: {
        instructor: { select: { name: true } },
        sections: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } },
      },
    });
    if (!course) return null;
    const progress = await tx.progress.findMany({ where: { userId: user.id } });
    return { course, progress };
  });

  if (!data?.course) notFound();
  const { course, progress } = data;

  const enrolled = await isEnrolled(user.tenantId, user.id, course.id);
  const orderedLessons = course.sections.flatMap((s) => s.lessons);
  const current = orderedLessons.find((l) => l.id === params.lessonId);
  if (!current) notFound();

  // Access gate: preview lessons are open; the rest require enrollment.
  if (!current.isPreview && !enrolled) redirect(`/courses/${course.slug}`);

  const progressByLesson = new Map(progress.map((p) => [p.lessonId, p]));
  const currentProgress = progressByLesson.get(current.id);

  const idx = orderedLessons.findIndex((l) => l.id === current.id);
  const prev = idx > 0 ? orderedLessons[idx - 1] : null;
  const next = idx < orderedLessons.length - 1 ? orderedLessons[idx + 1] : null;
  const nextAccessible = next && (next.isPreview || enrolled) ? next : null;

  const completedCount = orderedLessons.filter((l) => progressByLesson.get(l.id)?.completed).length;
  const pct = orderedLessons.length ? Math.round((completedCount / orderedLessons.length) * 100) : 0;

  const sections: SectionRow[] = course.sections.map((s) => ({
    id: s.id,
    title: s.title,
    lessons: s.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      type: l.type,
      isPreview: l.isPreview,
      durationSec: l.durationSec,
      completed: !!progressByLesson.get(l.id)?.completed,
      locked: !l.isPreview && !enrolled,
    })),
  }));

  return (
    <div className="luxe-bg relative min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/8 bg-background/70 px-5 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <Link href={`/courses/${course.slug}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="size-4" /> <span className="hidden sm:inline">Back to course</span>
          </Link>
          <div className="hidden h-5 w-px bg-white/10 sm:block" />
          <Logo name={tenant?.name ?? "Academy"} logoUrl={tenant?.logoUrl} compact />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">{completedCount}/{orderedLessons.length} done</span>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/8">
            <div className="h-full rounded-full bg-brand shadow-[0_0_10px_hsl(var(--brand))]" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </header>

      <div className="relative z-10 mx-auto grid max-w-7xl gap-8 px-5 py-8 lg:grid-cols-[1fr_340px]">
        {/* Main */}
        <div className="animate-fade-up min-w-0">
          {current.type === "VIDEO" && current.videoProvider && current.videoId ? (
            <Player
              lessonId={current.id}
              provider={current.videoProvider}
              videoId={current.videoId}
              initialPositionSec={currentProgress?.lastPositionSec ?? 0}
            />
          ) : current.type === "PDF" && current.contentUrl ? (
            <div className="glass rounded-2xl p-8 text-center">
              <FileText className="mx-auto size-10 text-brand" />
              <p className="mt-4 text-muted-foreground">This lesson is a PDF resource.</p>
              <Button asChild className="mt-5"><a href={current.contentUrl} target="_blank" rel="noreferrer"><Download className="size-4" /> Open PDF</a></Button>
            </div>
          ) : current.type === "TEXT" ? (
            <div className="glass rounded-2xl p-8">
              <div className="prose prose-invert max-w-none whitespace-pre-wrap text-muted-foreground">
                {current.textContent ?? "No content yet."}
              </div>
            </div>
          ) : (
            <div className="glass grid aspect-video place-items-center rounded-2xl text-muted-foreground">
              <div className="text-center"><Lock className="mx-auto size-8" /><p className="mt-3">Content coming soon.</p></div>
            </div>
          )}

          {/* Lesson meta + actions */}
          <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              {current.isPreview && <Badge variant="gold" className="mb-2">Free preview</Badge>}
              <h1 className="font-display text-2xl tracking-tight text-luxe">{current.title}</h1>
              {course.instructor?.name && (
                <p className="mt-1 text-sm text-muted-foreground">{course.instructor.name}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <MarkComplete lessonId={current.id} initialCompleted={!!currentProgress?.completed} />
              {nextAccessible && (
                <Button asChild>
                  <Link href={`/learn/${course.id}/${nextAccessible.id}`}>Next <ArrowRight className="size-4" /></Link>
                </Button>
              )}
            </div>
          </div>

          {!enrolled && current.isPreview && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gold/20 bg-gold/5 p-5">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Sparkles className="size-4 text-gold" /> Enjoying the preview? Enroll to unlock every lesson.
              </div>
              <Button asChild variant="gold"><Link href={`/courses/${course.slug}`}>Enroll now <ArrowRight className="size-4" /></Link></Button>
            </div>
          )}
        </div>

        {/* Curriculum sidebar */}
        <aside className="animate-fade-up lg:border-l lg:border-white/8 lg:pl-6">
          <h2 className="mb-4 font-display text-lg text-luxe">{course.title}</h2>
          <LessonList courseId={course.id} sections={sections} currentLessonId={current.id} />
        </aside>
      </div>
    </div>
  );
}
