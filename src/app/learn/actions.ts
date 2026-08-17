"use server";

import { revalidatePath } from "next/cache";
import { withTenant } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { isEnrolled } from "@/lib/access";

/**
 * Enroll the current user in a course.
 *
 * NOTE: real payment/checkout arrives in Phase 3. Until then this grants an
 * ACTIVE enrollment directly (source "manual") so the learning experience can
 * be used end-to-end. Free courses would use this path permanently.
 */
export async function enrollCourse(courseId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const course = await withTenant(user.tenantId, (tx) =>
    tx.course.findUnique({ where: { id: courseId } })
  );
  if (!course || course.status !== "PUBLISHED") {
    return { ok: false, error: "Course not available." };
  }

  await withTenant(user.tenantId, (tx) =>
    tx.enrollment.upsert({
      where: {
        tenantId_userId_courseId: {
          tenantId: user.tenantId,
          userId: user.id,
          courseId,
        },
      },
      update: { status: "ACTIVE" },
      create: {
        tenantId: user.tenantId,
        userId: user.id,
        courseId,
        status: "ACTIVE",
        source: course.isFree ? "free" : "manual",
      },
    })
  );

  revalidatePath(`/courses/${course.slug}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/courses");
  return { ok: true };
}

/** Persist watch progress for a lesson (position + watched seconds). */
export async function saveProgress(input: {
  lessonId: string;
  lastPositionSec: number;
  watchedSeconds: number;
  completed?: boolean;
}): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };

  const lastPositionSec = Math.max(0, Math.floor(input.lastPositionSec || 0));
  const watchedSeconds = Math.max(0, Math.floor(input.watchedSeconds || 0));

  await withTenant(user.tenantId, async (tx) => {
    // Only track progress for lessons the user can actually access.
    const lesson = await tx.lesson.findUnique({ where: { id: input.lessonId } });
    if (!lesson) return;
    const enrolled = await isEnrolled(user.tenantId, user.id, lesson.courseId);
    if (!lesson.isPreview && !enrolled) return;

    const key = {
      tenantId_userId_lessonId: {
        tenantId: user.tenantId,
        userId: user.id,
        lessonId: input.lessonId,
      },
    };
    const existing = await tx.progress.findUnique({ where: key });
    // watchedSeconds is monotonic (the furthest the learner has reached).
    const nextWatched = Math.max(existing?.watchedSeconds ?? 0, watchedSeconds, lastPositionSec);
    const completed = input.completed || existing?.completed || false;

    await tx.progress.upsert({
      where: key,
      update: { lastPositionSec, watchedSeconds: nextWatched, completed },
      create: {
        tenantId: user.tenantId,
        userId: user.id,
        lessonId: input.lessonId,
        lastPositionSec,
        watchedSeconds: nextWatched,
        completed,
      },
    });
  });

  return { ok: true };
}

/** Mark a lesson complete (explicit button or auto at ~end of video). */
export async function markComplete(lessonId: string): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };

  await withTenant(user.tenantId, async (tx) => {
    const lesson = await tx.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) return;
    const enrolled = await isEnrolled(user.tenantId, user.id, lesson.courseId);
    if (!lesson.isPreview && !enrolled) return;

    await tx.progress.upsert({
      where: {
        tenantId_userId_lessonId: { tenantId: user.tenantId, userId: user.id, lessonId },
      },
      update: { completed: true },
      create: {
        tenantId: user.tenantId,
        userId: user.id,
        lessonId,
        completed: true,
      },
    });
  });

  return { ok: true };
}
