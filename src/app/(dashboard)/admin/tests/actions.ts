"use server";

import { revalidatePath } from "next/cache";
import { withTenant } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CONTENT_ROLES } from "@/lib/rbac";

async function contentUser() {
  const user = await getCurrentUser();
  if (!user || !CONTENT_ROLES.includes(user.role)) return null;
  return user;
}

async function recomputeTotal(tx: any, testId: string) {
  const tqs = await tx.testQuestion.findMany({ where: { testId }, include: { question: { select: { marks: true } } } });
  const total = tqs.reduce((s: number, tq: any) => s + (tq.question?.marks ?? 0), 0);
  await tx.test.update({ where: { id: testId }, data: { totalMarks: total } });
}

export async function createTest(formData: FormData): Promise<{ ok: boolean; error?: string; id?: string }> {
  const user = await contentUser();
  if (!user) return { ok: false, error: "Not authorized." };
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "Give the test a title." };

  const id = await withTenant(user.tenantId, async (tx) => {
    const test = await tx.test.create({
      data: { tenantId: user.tenantId, title, durationSec: 1800, totalMarks: 0, negativeMarking: false },
    });
    return test.id;
  });
  revalidatePath("/admin/tests");
  return { ok: true, id };
}

export async function updateTest(id: string, formData: FormData): Promise<{ ok: boolean }> {
  const user = await contentUser();
  if (!user) return { ok: false };
  const durationMin = Number(String(formData.get("durationMin") ?? "30").replace(/[^0-9]/g, "")) || 30;
  const negativeMarking = formData.get("negativeMarking") === "on";
  const courseId = String(formData.get("courseId") ?? "").trim() || null;
  const startsAt = String(formData.get("startsAt") ?? "").trim();

  await withTenant(user.tenantId, (tx) =>
    tx.test.update({
      where: { id },
      data: {
        title: String(formData.get("title") ?? "").trim() || "Untitled test",
        durationSec: durationMin * 60,
        negativeMarking,
        courseId,
        startsAt: startsAt ? new Date(startsAt) : null,
      },
    })
  );
  revalidatePath(`/admin/tests/${id}`);
  revalidatePath("/admin/tests");
  return { ok: true };
}

export async function deleteTest(id: string): Promise<{ ok: boolean }> {
  const user = await contentUser();
  if (!user) return { ok: false };
  await withTenant(user.tenantId, (tx) => tx.test.delete({ where: { id } }));
  revalidatePath("/admin/tests");
  return { ok: true };
}

export async function addQuestionToTest(testId: string, questionId: string): Promise<{ ok: boolean }> {
  const user = await contentUser();
  if (!user) return { ok: false };
  await withTenant(user.tenantId, async (tx) => {
    const exists = await tx.testQuestion.findUnique({ where: { testId_questionId: { testId, questionId } } });
    if (exists) return;
    const count = await tx.testQuestion.count({ where: { testId } });
    await tx.testQuestion.create({ data: { tenantId: user.tenantId, testId, questionId, order: count } });
    await recomputeTotal(tx, testId);
  });
  revalidatePath(`/admin/tests/${testId}`);
  return { ok: true };
}

export async function removeQuestionFromTest(testId: string, questionId: string): Promise<{ ok: boolean }> {
  const user = await contentUser();
  if (!user) return { ok: false };
  await withTenant(user.tenantId, async (tx) => {
    await tx.testQuestion.deleteMany({ where: { testId, questionId } });
    await recomputeTotal(tx, testId);
  });
  revalidatePath(`/admin/tests/${testId}`);
  return { ok: true };
}
