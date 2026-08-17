// ============================================================================
//  Access control for course content
// ----------------------------------------------------------------------------
//  A lesson is viewable when it is a free preview, OR the user has an ACTIVE
//  enrollment in its course. All reads run inside withTenant so RLS applies.
// ============================================================================

import { withTenant } from "@/lib/db";

export async function isEnrolled(
  tenantId: string,
  userId: string,
  courseId: string
): Promise<boolean> {
  const enrollment = await withTenant(tenantId, (tx) =>
    tx.enrollment.findUnique({
      where: { tenantId_userId_courseId: { tenantId, userId, courseId } },
    })
  );
  return !!enrollment && enrollment.status === "ACTIVE";
}

/** Can this (possibly anonymous) user view this lesson? */
export function canViewLesson(
  lesson: { isPreview: boolean },
  enrolled: boolean
): boolean {
  return lesson.isPreview || enrolled;
}
