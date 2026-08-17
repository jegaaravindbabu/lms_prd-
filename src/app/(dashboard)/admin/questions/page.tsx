import { Sparkles } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { withTenant } from "@/lib/db";
import { QuestionManager, type QRow } from "@/components/admin/question-manager";
import type { Option } from "@/lib/assessment";

export const metadata = { title: "Question Bank" };

export default async function QuestionsPage() {
  const user = await requireRole(["OWNER", "ADMIN", "INSTRUCTOR"]);

  const questions = await withTenant(user.tenantId, (tx) =>
    tx.question.findMany({ orderBy: { createdAt: "desc" } })
  );

  const rows: QRow[] = questions.map((q) => {
    const options = (Array.isArray(q.options) ? q.options : []) as unknown as Option[];
    const ca = q.correctAnswer as unknown;
    const isNumeric = q.type === "NUMERIC";
    return {
      id: q.id,
      type: q.type,
      body: q.body,
      options,
      correctIds: !isNumeric && Array.isArray(ca) ? (ca as string[]).map(String) : [],
      numericAnswer: isNumeric && ca && typeof ca === "object" ? Number((ca as { value: unknown }).value) : null,
      marks: q.marks,
      negativeMarks: Number(q.negativeMarks),
      subject: q.subject,
      chapter: q.chapter,
      difficulty: q.difficulty,
      isPyq: q.isPyq,
      year: q.year,
    };
  });

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <span className="eyebrow"><Sparkles className="size-3.5 text-gold" /> Assessments</span>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-luxe">Question Bank</h1>
        <p className="mt-2 text-muted-foreground">Reusable questions you can drop into any test.</p>
      </div>
      <QuestionManager questions={rows} />
    </div>
  );
}
