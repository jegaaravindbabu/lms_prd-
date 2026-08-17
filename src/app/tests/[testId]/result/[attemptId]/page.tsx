import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trophy, Percent, Target, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import { getTenant } from "@/lib/tenant";
import { withTenant } from "@/lib/db";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { isCorrect as gradeCorrect, type Option, type Chosen } from "@/lib/assessment";

export const metadata = { title: "Result" };

export default async function ResultPage({ params }: { params: { testId: string; attemptId: string } }) {
  const user = await requireUser();
  const tenant = await getTenant();

  const data = await withTenant(user.tenantId, async (tx) => {
    const attempt = await tx.attempt.findUnique({
      where: { id: params.attemptId },
      include: { responses: true },
    });
    if (!attempt || attempt.userId !== user.id) return null;
    const test = await tx.test.findUnique({
      where: { id: params.testId },
      include: { testQuestions: { orderBy: { order: "asc" }, include: { question: true } } },
    });
    return { attempt, test };
  });

  if (!data?.attempt || !data.test) notFound();
  const { attempt, test } = data;
  const responseByQ = new Map(attempt.responses.map((r) => [r.questionId, r]));

  const correctCount = attempt.responses.filter((r) => r.isCorrect === true).length;
  const wrongCount = attempt.responses.filter((r) => r.isCorrect === false).length;

  return (
    <div className="luxe-bg grain relative min-h-screen">
      <header className="relative z-20 mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/dashboard/tests"><Logo name={tenant?.name ?? "Academy"} logoUrl={tenant?.logoUrl} /></Link>
        <Link href="/dashboard/tests" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-4" /> Tests</Link>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-6 py-8">
        {/* Score hero */}
        <div className="glass animate-fade-up rounded-3xl p-8 text-center">
          <span className="eyebrow justify-center"><Trophy className="size-3.5 text-gold" /> {test.title}</span>
          <div className="mt-4 font-display text-6xl text-brand-gradient">{Number(attempt.score ?? 0)}<span className="text-2xl text-muted-foreground"> / {test.totalMarks}</span></div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Stat icon={Target} label="Rank" value={attempt.rank ? `#${attempt.rank}` : "—"} />
            <Stat icon={Percent} label="Percentile" value={attempt.percentile != null ? `${Number(attempt.percentile)}` : "—"} />
            <Stat icon={CheckCircle2} label="Correct" value={`${correctCount}/${test.testQuestions.length}`} />
          </div>
        </div>

        {/* Review */}
        <h2 className="mb-4 mt-10 font-display text-xl text-luxe">Review</h2>
        <div className="space-y-4">
          {test.testQuestions.map((tq, i) => {
            const q = tq.question;
            const resp = responseByQ.get(q.id);
            const chosen = (resp?.chosen ?? null) as Chosen;
            const options = (Array.isArray(q.options) ? q.options : []) as unknown as Option[];
            const correctSet = new Set(Array.isArray(q.correctAnswer) ? (q.correctAnswer as string[]).map(String) : []);
            const chosenSet = new Set(Array.isArray(chosen) ? chosen.map(String) : []);
            const answered = resp && resp.isCorrect !== null;
            const state = !answered ? "skipped" : resp!.isCorrect ? "correct" : "wrong";

            return (
              <div key={q.id} className="glass rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="grid size-7 place-items-center rounded-lg bg-white/[0.04] text-xs text-muted-foreground">{i + 1}</span>
                    {state === "correct" && <Badge variant="gold"><CheckCircle2 className="size-3.5" /> +{q.marks}</Badge>}
                    {state === "wrong" && <Badge variant="muted"><XCircle className="size-3.5" /> {test.negativeMarking ? `−${Number(q.negativeMarks)}` : "0"}</Badge>}
                    {state === "skipped" && <Badge variant="muted"><MinusCircle className="size-3.5" /> Skipped</Badge>}
                  </div>
                </div>
                <p className="mt-3 text-foreground">{q.body}</p>

                {q.type === "NUMERIC" ? (
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    <span className="text-muted-foreground">Your answer: <span className="text-foreground">{chosen && typeof chosen === "object" && "value" in chosen ? String((chosen as any).value) : "—"}</span></span>
                    <span className="text-gold">Correct: {q.correctAnswer && typeof q.correctAnswer === "object" ? String((q.correctAnswer as any).value) : "—"}</span>
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {options.map((o) => {
                      const isRight = correctSet.has(o.id);
                      const youPicked = chosenSet.has(o.id);
                      return (
                        <div key={o.id} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${isRight ? "border-gold/40 bg-gold/5 text-foreground" : youPicked ? "border-red-500/40 bg-red-500/5 text-foreground" : "border-white/8 text-muted-foreground"}`}>
                          {isRight ? <CheckCircle2 className="size-4 text-gold" /> : youPicked ? <XCircle className="size-4 text-red-400" /> : <span className="size-4" />}
                          <span className="flex-1">{o.text}</span>
                          {youPicked && <span className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">your pick</span>}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center gap-3">
          <Button asChild variant="outline"><Link href={`/tests/${test.id}`}>Retake</Link></Button>
          <Button asChild><Link href="/dashboard/tests">Back to tests</Link></Button>
        </div>
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
      <Icon className="mx-auto size-5 text-brand" />
      <div className="mt-2 font-display text-2xl text-luxe">{value}</div>
      <div className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
