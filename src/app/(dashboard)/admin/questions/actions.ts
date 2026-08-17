"use server";

import { revalidatePath } from "next/cache";
import { withTenant } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { CONTENT_ROLES } from "@/lib/rbac";
import type { QuestionType } from "@prisma/client";
import type { Option } from "@/lib/assessment";

async function contentUser() {
  const user = await getCurrentUser();
  if (!user || !CONTENT_ROLES.includes(user.role)) return null;
  return user;
}

export type QuestionInput = {
  subject?: string | null;
  chapter?: string | null;
  type: QuestionType;
  body: string;
  options: Option[];
  correctIds: string[];   // for SINGLE/MULTIPLE/TRUE_FALSE
  numericAnswer?: number | null; // for NUMERIC
  marks: number;
  negativeMarks: number;
  difficulty?: number | null;
  isPyq: boolean;
  year?: number | null;
};

function normalize(input: QuestionInput) {
  const isNumeric = input.type === "NUMERIC";
  const options = isNumeric ? [] : input.options.filter((o) => o.text.trim());
  const correctAnswer = isNumeric
    ? { value: Number(input.numericAnswer ?? 0) }
    : input.correctIds.filter((id) => options.some((o) => o.id === id));

  return {
    subject: input.subject?.trim() || null,
    chapter: input.chapter?.trim() || null,
    type: input.type,
    body: input.body.trim(),
    options: options as unknown as object,
    correctAnswer: correctAnswer as unknown as object,
    marks: Math.max(0, Math.round(input.marks || 1)),
    negativeMarks: Math.max(0, Number(input.negativeMarks || 0)),
    difficulty: input.difficulty ?? null,
    isPyq: !!input.isPyq,
    year: input.year ?? null,
  };
}

export async function createQuestion(input: QuestionInput): Promise<{ ok: boolean; error?: string }> {
  const user = await contentUser();
  if (!user) return { ok: false, error: "Not authorized." };
  if (!input.body.trim()) return { ok: false, error: "Question text is required." };

  await withTenant(user.tenantId, (tx) => tx.question.create({ data: { tenantId: user.tenantId, ...normalize(input) } }));
  revalidatePath("/admin/questions");
  return { ok: true };
}

export async function updateQuestion(id: string, input: QuestionInput): Promise<{ ok: boolean; error?: string }> {
  const user = await contentUser();
  if (!user) return { ok: false, error: "Not authorized." };
  await withTenant(user.tenantId, (tx) => tx.question.update({ where: { id }, data: normalize(input) }));
  revalidatePath("/admin/questions");
  return { ok: true };
}

export async function deleteQuestion(id: string): Promise<{ ok: boolean }> {
  const user = await contentUser();
  if (!user) return { ok: false };
  await withTenant(user.tenantId, (tx) => tx.question.delete({ where: { id } }));
  revalidatePath("/admin/questions");
  return { ok: true };
}
