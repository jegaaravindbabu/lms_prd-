import Link from "next/link";
import { BookOpen, PlayCircle, Users, Pencil, Sparkles } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { withTenant } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { NewCourse } from "@/components/admin/new-course";
import type { CourseStatus } from "@prisma/client";

export const metadata = { title: "Courses" };

const STATUS_VARIANT: Record<CourseStatus, "default" | "gold" | "muted"> = {
  PUBLISHED: "gold",
  DRAFT: "muted",
  ARCHIVED: "muted",
};

export default async function AdminCoursesPage() {
  const user = await requireRole(["OWNER", "ADMIN", "INSTRUCTOR"]);

  const courses = await withTenant(user.tenantId, (tx) =>
    tx.course.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        instructor: { select: { name: true } },
        _count: { select: { enrollments: true, sections: true } },
        sections: { include: { _count: { select: { lessons: true } } } },
      },
    })
  );

  return (
    <div className="space-y-8">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow"><Sparkles className="size-3.5 text-gold" /> Authoring</span>
          <h1 className="mt-3 font-display text-4xl tracking-tight text-luxe">Courses</h1>
          <p className="mt-2 text-muted-foreground">Create, build, and publish your catalog.</p>
        </div>
        <NewCourse />
      </div>

      {courses.length === 0 ? (
        <div className="glass rounded-2xl p-12 text-center">
          <BookOpen className="mx-auto size-10 text-brand" />
          <p className="mt-4 text-muted-foreground">No courses yet. Create your first one above.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/8">
          {courses.map((c, i) => {
            const lessonCount = c.sections.reduce((s, sec) => s + sec._count.lessons, 0);
            return (
              <Link
                key={c.id}
                href={`/admin/courses/${c.id}`}
                className={`flex items-center gap-4 bg-card/40 px-5 py-4 transition-colors hover:bg-white/[0.03] ${i > 0 ? "border-t border-white/6" : ""}`}
              >
                <div className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand/25 to-gold/10">
                  {c.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <BookOpen className="size-5 text-brand" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-display text-base text-foreground">{c.title}</h3>
                    <Badge variant={STATUS_VARIANT[c.status]}>{c.status}</Badge>
                  </div>
                  <p className="mt-0.5 flex items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><PlayCircle className="size-3.5" /> {lessonCount} lessons</span>
                    <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> {c._count.enrollments} enrolled</span>
                    {c.instructor?.name && <span className="hidden sm:inline">· {c.instructor.name}</span>}
                  </p>
                </div>
                <div className="hidden text-right sm:block">
                  <div className="font-display text-foreground">{c.isFree ? "Free" : formatMoney(Number(c.price), c.currency)}</div>
                </div>
                <Pencil className="size-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
