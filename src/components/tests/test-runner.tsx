"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Loader2, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitAttempt } from "@/app/tests/actions";
import type { SafeQuestion, Chosen } from "@/lib/assessment";

function fmt(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function TestRunner({
  attemptId,
  testId,
  title,
  durationSec,
  startedAtMs,
  questions,
  negativeMarking,
}: {
  attemptId: string;
  testId: string;
  title: string;
  durationSec: number;
  startedAtMs: number;
  questions: SafeQuestion[];
  negativeMarking: boolean;
}) {
  const router = useRouter();
  const endMs = startedAtMs + durationSec * 1000;
  const [remaining, setRemaining] = useState(Math.max(0, Math.round((endMs - Date.now()) / 1000)));
  const [answers, setAnswers] = useState<Record<string, Chosen>>({});
  const [submitting, setSubmitting] = useState(false);
  const submittedRef = useRef(false);

  const answeredCount = useMemo(
    () => Object.values(answers).filter((a) => a != null && (Array.isArray(a) ? a.length > 0 : Number.isFinite(Number((a as any).value)))).length,
    [answers]
  );

  async function doSubmit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    const res = await submitAttempt(attemptId, answers);
    if (res.ok) router.push(`/tests/${testId}/result/${attemptId}`);
    else { submittedRef.current = false; setSubmitting(false); }
  }

  useEffect(() => {
    const t = setInterval(() => {
      const left = Math.max(0, Math.round((endMs - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) { clearInterval(t); doSubmit(); }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setSingle(qid: string, oid: string) { setAnswers((a) => ({ ...a, [qid]: [oid] })); }
  function toggleMulti(qid: string, oid: string) {
    setAnswers((a) => {
      const cur = new Set((a[qid] as string[]) ?? []);
      cur.has(oid) ? cur.delete(oid) : cur.add(oid);
      return { ...a, [qid]: [...cur] };
    });
  }
  function setNumeric(qid: string, v: string) {
    setAnswers((a) => ({ ...a, [qid]: v.trim() === "" ? null : { value: Number(v) } }));
  }

  const low = remaining <= 60;

  return (
    <div className="luxe-bg grain relative min-h-screen">
      {/* Sticky bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/8 bg-background/80 px-5 backdrop-blur-xl">
        <div className="min-w-0">
          <h1 className="truncate font-display text-lg text-luxe">{title}</h1>
          <p className="text-xs text-muted-foreground">{answeredCount}/{questions.length} answered{negativeMarking ? " · negative marking" : ""}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 rounded-full border px-4 py-1.5 font-display text-lg tabular-nums ${low ? "border-red-500/40 bg-red-500/10 text-red-400" : "border-white/10 text-foreground"}`}>
            <Clock className="size-4" /> {fmt(remaining)}
          </div>
          <Button onClick={doSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <><Send className="size-4" /> Submit</>}
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl space-y-5 px-5 py-8">
        {questions.map((q, i) => {
          const chosen = answers[q.id];
          const chosenSet = new Set(Array.isArray(chosen) ? chosen : []);
          return (
            <div key={q.id} className="glass rounded-2xl p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand/12 text-xs text-brand">{i + 1}</span>
                  {chosenSet.size > 0 || (chosen && !Array.isArray(chosen)) ? <CheckCircle2 className="size-4 text-gold" /> : null}
                </div>
                <span className="text-xs text-muted-foreground">{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
              </div>
              <p className="mt-3 text-foreground">{q.body}</p>

              <div className="mt-4 space-y-2">
                {q.type === "NUMERIC" ? (
                  <Input inputMode="decimal" placeholder="Your answer" onChange={(e) => setNumeric(q.id, e.target.value)} className="max-w-xs" />
                ) : (
                  q.options.map((o) => {
                    const selected = chosenSet.has(o.id);
                    return (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => (q.type === "MULTIPLE" ? toggleMulti(q.id, o.id) : setSingle(q.id, o.id))}
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors ${selected ? "border-brand/60 bg-brand/10 text-foreground" : "border-white/10 text-muted-foreground hover:border-white/20 hover:text-foreground"}`}
                      >
                        <span className={`grid size-5 shrink-0 place-items-center rounded-${q.type === "MULTIPLE" ? "md" : "full"} border ${selected ? "border-brand bg-brand text-white" : "border-white/20"}`}>
                          {selected && <CheckCircle2 className="size-3.5" />}
                        </span>
                        {o.text}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}

        <div className="flex justify-end pt-2">
          <Button size="lg" onClick={doSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <><Send className="size-4" /> Submit test</>}
          </Button>
        </div>
      </main>
    </div>
  );
}
