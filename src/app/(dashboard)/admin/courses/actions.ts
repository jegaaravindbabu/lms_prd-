"use server";

import { revalidatePath } from "next/cache";
import { withTenant } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CONTENT_ROLES } from "@/lib/rbac";
import type { CourseStatus, LessonType, VideoProvider } from "@prisma/client";

// ---------------------------------------------------------------------------
//  Guard — only OWNER / ADMIN / INSTRUCTOR may author content.
// ---------------------------------------------------------------------------
async function contentUser() {
  const user = await getCurrentUser();
  if (!user || !CONTENT_ROLES.includes(user.role)) return null;
  return user;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60) || "course";
}

type Result<T = undefined> = { ok: boolean; error?: string; data?: T };

// ---------------------------------------------------------------------------
//  COURSE
// ---------------------------------------------------------------------------
export async function createCourse(formData: FormData): Promise<Result<{ id: string }>> {
  const user = await contentUser();
  if (!user) return { ok: false, error: "Not authorized." };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "Give the course a title." };

  const id = await withTenant(user.tenantId, async (tx) => {
    // Ensure a unique slug within the tenant.
    const base = slugify(title);
    let slug = base;
    let n = 2;
    while (await tx.course.findUnique({ where: { tenantId_slug: { tenantId: user.tenantId, slug } } })) {
      slug = `${base}-${n++}`;
    }
    const course = await tx.course.create({
      data: {
        tenantId: user.tenantId,
        title,
        slug,
        status: "DRAFT",
        currency: "INR",
        instructorId: user.role === "INSTRUCTOR" ? user.id : undefined,
      },
    });
    return course.id;
  });

  revalidatePath("/admin/courses");
  return { ok: true, data: { id } };
}

export async function updateCourse(id: string, formData: FormData): Promise<Result> {
  const user = await contentUser();
  if (!user) return { ok: false, error: "Not authorized." };

  const priceRaw = String(formData.get("price") ?? "0").replace(/[^0-9.]/g, "");
  const isFree = formData.get("isFree") === "on";

  await withTenant(user.tenantId, (tx) =>
    tx.course.update({
      where: { id },
      data: {
        title: String(formData.get("title") ?? "").trim() || "Untitled course",
        subtitle: (String(formData.get("subtitle") ?? "").trim() || null) as string | null,
        description: (String(formData.get("description") ?? "").trim() || null) as string | null,
        thumbnailUrl: (String(formData.get("thumbnailUrl") ?? "").trim() || null) as string | null,
        price: isFree ? 0 : Number(priceRaw || 0),
        isFree,
      },
    })
  );

  revalidatePath(`/admin/courses/${id}`);
  revalidatePath("/admin/courses");
  return { ok: true };
}

export async function setCourseStatus(id: string, status: CourseStatus): Promise<Result> {
  const user = await contentUser();
  if (!user) return { ok: false, error: "Not authorized." };

  await withTenant(user.tenantId, (tx) =>
    tx.course.update({
      where: { id },
      data: { status, publishedAt: status === "PUBLISHED" ? new Date() : undefined },
    })
  );

  revalidatePath(`/admin/courses/${id}`);
  revalidatePath("/admin/courses");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteCourse(id: string): Promise<Result> {
  const user = await contentUser();
  if (!user) return { ok: false, error: "Not authorized." };
  await withTenant(user.tenantId, (tx) => tx.course.delete({ where: { id } }));
  revalidatePath("/admin/courses");
  return { ok: true };
}

// ---------------------------------------------------------------------------
//  SECTION
// ---------------------------------------------------------------------------
export async function createSection(courseId: string, title: string): Promise<Result> {
  const user = await contentUser();
  if (!user) return { ok: false, error: "Not authorized." };
  if (!title.trim()) return { ok: false, error: "Section needs a title." };

  await withTenant(user.tenantId, async (tx) => {
    const count = await tx.section.count({ where: { courseId } });
    await tx.section.create({
      data: { tenantId: user.tenantId, courseId, title: title.trim(), order: count },
    });
  });

  revalidatePath(`/admin/courses/${courseId}`);
  return { ok: true };
}

export async function renameSection(sectionId: string, courseId: string, title: string): Promise<Result> {
  const user = await contentUser();
  if (!user) return { ok: false, error: "Not authorized." };
  await withTenant(user.tenantId, (tx) =>
    tx.section.update({ where: { id: sectionId }, data: { title: title.trim() || "Untitled section" } })
  );
  revalidatePath(`/admin/courses/${courseId}`);
  return { ok: true };
}

export async function deleteSection(sectionId: string, courseId: string): Promise<Result> {
  const user = await contentUser();
  if (!user) return { ok: false, error: "Not authorized." };
  await withTenant(user.tenantId, (tx) => tx.section.delete({ where: { id: sectionId } }));
  revalidatePath(`/admin/courses/${courseId}`);
  return { ok: true };
}

export async function moveSection(sectionId: string, courseId: string, dir: "up" | "down"): Promise<Result> {
  const user = await contentUser();
  if (!user) return { ok: false, error: "Not authorized." };
  await withTenant(user.tenantId, async (tx) => {
    const sections = await tx.section.findMany({ where: { courseId }, orderBy: { order: "asc" } });
    const i = sections.findIndex((s) => s.id === sectionId);
    const j = dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= sections.length) return;
    await tx.section.update({ where: { id: sections[i].id }, data: { order: sections[j].order } });
    await tx.section.update({ where: { id: sections[j].id }, data: { order: sections[i].order } });
  });
  revalidatePath(`/admin/courses/${courseId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
//  LESSON
// ---------------------------------------------------------------------------
export type LessonInput = {
  title: string;
  type: LessonType;
  isPreview: boolean;
  videoProvider?: VideoProvider | null;
  videoId?: string | null;
  durationMin?: number | null;
  contentUrl?: string | null;
  textContent?: string | null;
};

function normalizeLesson(input: LessonInput) {
  const isVideo = input.type === "VIDEO";
  return {
    title: input.title.trim() || "Untitled lesson",
    type: input.type,
    isPreview: !!input.isPreview,
    videoProvider: isVideo ? (input.videoProvider ?? "YOUTUBE") : null,
    videoId: isVideo ? (input.videoId?.trim() || null) : null,
    durationSec: input.durationMin ? Math.round(input.durationMin * 60) : null,
    contentUrl: input.type === "PDF" ? (input.contentUrl?.trim() || null) : null,
    textContent: input.type === "TEXT" ? (input.textContent ?? null) : null,
  };
}

export async function createLesson(courseId: string, sectionId: string, input: LessonInput): Promise<Result> {
  const user = await contentUser();
  if (!user) return { ok: false, error: "Not authorized." };

  await withTenant(user.tenantId, async (tx) => {
    const count = await tx.lesson.count({ where: { sectionId } });
    await tx.lesson.create({
      data: {
        tenantId: user.tenantId,
        courseId, // denormalized
        sectionId,
        order: count,
        ...normalizeLesson(input),
      },
    });
  });

  revalidatePath(`/admin/courses/${courseId}`);
  return { ok: true };
}

export async function updateLesson(lessonId: string, courseId: string, input: LessonInput): Promise<Result> {
  const user = await contentUser();
  if (!user) return { ok: false, error: "Not authorized." };
  await withTenant(user.tenantId, (tx) =>
    tx.lesson.update({ where: { id: lessonId }, data: normalizeLesson(input) })
  );
  revalidatePath(`/admin/courses/${courseId}`);
  return { ok: true };
}

export async function deleteLesson(lessonId: string, courseId: string): Promise<Result> {
  const user = await contentUser();
  if (!user) return { ok: false, error: "Not authorized." };
  await withTenant(user.tenantId, (tx) => tx.lesson.delete({ where: { id: lessonId } }));
  revalidatePath(`/admin/courses/${courseId}`);
  return { ok: true };
}

export async function moveLesson(lessonId: string, sectionId: string, courseId: string, dir: "up" | "down"): Promise<Result> {
  const user = await contentUser();
  if (!user) return { ok: false, error: "Not authorized." };
  await withTenant(user.tenantId, async (tx) => {
    const lessons = await tx.lesson.findMany({ where: { sectionId }, orderBy: { order: "asc" } });
    const i = lessons.findIndex((l) => l.id === lessonId);
    const j = dir === "up" ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= lessons.length) return;
    await tx.lesson.update({ where: { id: lessons[i].id }, data: { order: lessons[j].order } });
    await tx.lesson.update({ where: { id: lessons[j].id }, data: { order: lessons[i].order } });
  });
  revalidatePath(`/admin/courses/${courseId}`);
  return { ok: true };
}
