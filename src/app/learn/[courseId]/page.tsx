import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/rbac";
import { withTenant } from "@/lib/db";
import { isEnrolled } from "@/lib/access";

/** Entry point for a course: jump to the resume lesson, or the first one. */
export default async function LearnCourseIndex({ params }: { params: { courseId: string } }) {
  const user = await requireUser();

  const data = await withTenant(user.tenantId, async (tx) => {
    const course = await tx.course.findUnique({
      where: { id: params.courseId },
      include: { sections: { orderBy: { order: "asc" }, include: { lessons: { orderBy: { order: "asc" } } } } },
    });
    if (!course) return null;
    const progress = await tx.progress.findMany({ where: { userId: user.id } });
    return { course, progress };
  });

  if (!data?.course) notFound();
  const { course, progress } = data;

  const enrolled = await isEnrolled(user.tenantId, user.id, course.id);
  const lessons = course.sections.flatMap((s) => s.lessons);
  const accessible = lessons.filter((l) => l.isPreview || enrolled);
  if (accessible.length === 0) redirect(`/courses/${course.slug}`);

  // Resume: first incomplete accessible lesson, else the first accessible one.
  const completed = new Set(progress.filter((p) => p.completed).map((p) => p.lessonId));
  const resume = accessible.find((l) => !completed.has(l.id)) ?? accessible[0];

  redirect(`/learn/${course.id}/${resume.id}`);
}
