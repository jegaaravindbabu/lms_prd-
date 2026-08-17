import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { withTenant } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { CourseDetailsForm } from "@/components/admin/course-details-form";
import { PublishControls } from "@/components/admin/publish-controls";
import { CurriculumEditor, type EditorSection } from "@/components/admin/curriculum-editor";
import type { CourseStatus } from "@prisma/client";

export const metadata = { title: "Edit course" };

const STATUS_VARIANT: Record<CourseStatus, "default" | "gold" | "muted"> = {
  PUBLISHED: "gold", DRAFT: "muted", ARCHIVED: "muted",
};

export default async function CourseEditorPage({ params }: { params: { id: string } }) {
  const user = await requireRole(["OWNER", "ADMIN", "INSTRUCTOR"]);

  const course = await withTenant(user.tenantId, (tx) =>
    tx.course.findUnique({
      where: { id: params.id },
      include: {
        sections: {
          orderBy: { order: "asc" },
          include: { lessons: { orderBy: { order: "asc" } } },
        },
      },
    })
  );

  if (!course) notFound();

  const sections: EditorSection[] = course.sections.map((s) => ({
    id: s.id,
    title: s.title,
    lessons: s.lessons.map((l) => ({
      id: l.id,
      title: l.title,
      type: l.type,
      isPreview: l.isPreview,
      videoProvider: l.videoProvider,
      videoId: l.videoId,
      durationSec: l.durationSec,
      contentUrl: l.contentUrl,
      textContent: l.textContent,
    })),
  }));

  const lessonCount = sections.reduce((n, s) => n + s.lessons.length, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="animate-fade-up">
        <Link href="/admin/courses" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> All courses
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl tracking-tight text-luxe">{course.title}</h1>
              <Badge variant={STATUS_VARIANT[course.status]}>{course.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{lessonCount} lessons · /{course.slug}</p>
          </div>
          <PublishControls
            courseId={course.id}
            slug={course.slug}
            status={course.status}
            canPublish={lessonCount > 0}
          />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Curriculum */}
        <section className="order-2 lg:order-1">
          <div className="mb-4 flex items-center gap-2">
            <Layers className="size-5 text-brand" />
            <h2 className="font-display text-xl text-luxe">Curriculum</h2>
          </div>
          <CurriculumEditor courseId={course.id} sections={sections} />
        </section>

        {/* Details */}
        <aside className="order-1 lg:order-2">
          <div className="glass sticky top-6 rounded-2xl p-6">
            <h2 className="mb-5 font-display text-xl text-luxe">Details</h2>
            <CourseDetailsForm
              course={{
                id: course.id,
                title: course.title,
                subtitle: course.subtitle,
                description: course.description,
                thumbnailUrl: course.thumbnailUrl,
                price: String(course.price),
                currency: course.currency,
                isFree: course.isFree,
              }}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
