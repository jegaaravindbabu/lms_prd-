import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft, PlayCircle, Lock, FileText, Type, ListChecks,
  Clock, CheckCircle2, Sparkles,
} from "lucide-react";
import { getTenant } from "@/lib/tenant";
import { getCurrentUser } from "@/lib/auth";
import { withTenant } from "@/lib/db";
import { isEnrolled } from "@/lib/access";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EnrollButton } from "@/components/learn/enroll-button";
import { CheckoutButton } from "@/components/checkout/checkout-button";
import { formatMoney } from "@/lib/utils";
import type { LessonType } from "@prisma/client";

const LESSON_ICON: Record<LessonType, React.ElementType> = {
  VIDEO: PlayCircle,
  PDF: FileText,
  TEXT: Type,
  QUIZ: ListChecks,
};

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const tenant = await getTenant();
  if (!tenant) return {};
  const course = await withTenant(tenant.id, (tx) =>
    tx.course.findUnique({ where: { tenantId_slug: { tenantId: tenant.id, slug: params.slug } } })
  );
  return { title: course?.title ?? "Course" };
}

export default async function CoursePage({ params }: { params: { slug: string } }) {
  const tenant = await getTenant();
  if (!tenant) redirect("/");
  if (tenant.status !== "ACTIVE") redirect("/not-active");

  const user = await getCurrentUser();

  const course = await withTenant(tenant.id, (tx) =>
    tx.course.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug: params.slug } },
      include: {
        instructor: { select: { name: true } },
        sections: {
          orderBy: { order: "asc" },
          include: { lessons: { orderBy: { order: "asc" } } },
        },
      },
    })
  );

  if (!course || course.status !== "PUBLISHED") notFound();

  const enrolled = user ? await isEnrolled(tenant.id, user.id, course.id) : false;

  const lessons = course.sections.flatMap((s) => s.lessons);
  const totalLessons = lessons.length;
  const previewCount = lessons.filter((l) => l.isPreview).length;
  const totalMinutes = Math.round(lessons.reduce((s, l) => s + (l.durationSec ?? 0), 0) / 60);
  const firstAccessible = lessons.find((l) => l.isPreview) ?? lessons[0];
  const firstLessonHref = firstAccessible ? `/learn/${course.id}/${firstAccessible.id}` : null;

  return (
    <div className="luxe-bg grain relative min-h-screen">
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/"><Logo name={tenant.name} logoUrl={tenant.logoUrl} /></Link>
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> All courses
        </Link>
      </header>

      <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-6 pb-24 pt-6 lg:grid-cols-[1fr_360px]">
        {/* Left: overview + curriculum */}
        <div className="animate-fade-up">
          <span className="eyebrow"><Sparkles className="size-3.5 text-gold" /> Course</span>
          <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight text-luxe sm:text-5xl">{course.title}</h1>
          {course.subtitle && <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{course.subtitle}</p>}

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {course.instructor?.name && <span>Taught by <span className="text-foreground">{course.instructor.name}</span></span>}
            <span className="inline-flex items-center gap-1.5"><PlayCircle className="size-4" /> {totalLessons} lessons</span>
            {totalMinutes > 0 && <span className="inline-flex items-center gap-1.5"><Clock className="size-4" /> {totalMinutes} min</span>}
            {previewCount > 0 && <Badge variant="gold">{previewCount} free preview{previewCount > 1 ? "s" : ""}</Badge>}
          </div>

          {course.description && (
            <div className="mt-8 max-w-2xl">
              <h2 className="font-display text-xl text-luxe">About this course</h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">{course.description}</p>
            </div>
          )}

          {/* Curriculum */}
          <div className="mt-10">
            <h2 className="font-display text-xl text-luxe">Curriculum</h2>
            <div className="mt-5 space-y-6">
              {course.sections.map((section) => (
                <div key={section.id}>
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                    <span>{section.title}</span>
                    <span className="text-xs text-muted-foreground">· {section.lessons.length} lessons</span>
                  </div>
                  <div className="overflow-hidden rounded-2xl border border-white/8 bg-card/40">
                    {section.lessons.map((lesson, i) => {
                      const Icon = LESSON_ICON[lesson.type];
                      const open = lesson.isPreview || enrolled;
                      const href = `/learn/${course.id}/${lesson.id}`;
                      const inner = (
                        <div className={`flex items-center gap-3 px-4 py-3 ${i > 0 ? "border-t border-white/6" : ""} ${open ? "hover:bg-white/[0.03]" : "opacity-70"}`}>
                          <Icon className={`size-[18px] ${open ? "text-brand" : "text-muted-foreground"}`} />
                          <span className="flex-1 text-sm text-foreground">{lesson.title}</span>
                          {lesson.durationSec ? (
                            <span className="text-xs text-muted-foreground">{Math.round(lesson.durationSec / 60)}m</span>
                          ) : null}
                          {lesson.isPreview ? (
                            <Badge variant="gold">Preview</Badge>
                          ) : open ? (
                            <PlayCircle className="size-4 text-muted-foreground" />
                          ) : (
                            <Lock className="size-4 text-muted-foreground" />
                          )}
                        </div>
                      );
                      return open ? (
                        <Link key={lesson.id} href={href}>{inner}</Link>
                      ) : (
                        <div key={lesson.id}>{inner}</div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {course.sections.length === 0 && (
                <p className="text-muted-foreground">Curriculum coming soon.</p>
              )}
            </div>
          </div>
        </div>

        {/* Right: sticky purchase card */}
        <div className="animate-fade-up [animation-delay:100ms]">
          <div className="glass sticky top-6 rounded-3xl p-6">
            <div className="relative mb-5 aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-brand/30 to-gold/10">
              {course.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={course.thumbnailUrl} alt={course.title} className="h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 grid place-items-center"><PlayCircle className="size-12 text-white/80" /></div>
              )}
            </div>

            <div className="mb-5 flex items-baseline gap-2">
              <span className="font-display text-3xl text-luxe">
                {course.isFree ? "Free" : formatMoney(Number(course.price), course.currency)}
              </span>
              {!course.isFree && <span className="text-sm text-muted-foreground">one-time</span>}
            </div>

            {enrolled ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-xl border border-gold/20 bg-gold/5 px-4 py-3 text-sm text-gold">
                  <CheckCircle2 className="size-4" /> You&rsquo;re enrolled
                </div>
                {firstLessonHref && (
                  <Button asChild size="lg" className="w-full">
                    <Link href={firstLessonHref}>Continue learning <PlayCircle className="size-4" /></Link>
                  </Button>
                )}
              </div>
            ) : course.isFree ? (
              <EnrollButton
                courseId={course.id}
                firstLessonHref={firstLessonHref}
                priceLabel="Free"
                isAuthed={!!user}
              />
            ) : (
              <CheckoutButton
                courseId={course.id}
                basePrice={Number(course.price)}
                currency={course.currency}
                isAuthed={!!user}
                firstLessonHref={firstLessonHref}
              />
            )}

            {firstAccessible?.isPreview && !enrolled && (
              <Button asChild variant="outline" size="lg" className="mt-3 w-full">
                <Link href={`/learn/${course.id}/${firstAccessible.id}`}>
                  <PlayCircle className="size-4" /> Watch free preview
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
