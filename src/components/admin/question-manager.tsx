"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Trash2, Pencil, Check, X, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createQuestion, updateQuestion, deleteQuestion, type QuestionInput } from "@/app/(dashboard)/admin/questions/actions";
import type { QuestionType } from "@prisma/client";
import type { Option } from "@/lib/assessment";

export type QRow = {
  id: string;
  type: QuestionType;
  body: string;
  options: Option[];
  correctIds: string[];
  numericAnswer: number | null;
  marks: number;
  negativeMarks: number;
  subject: string | null;
  chapter: string | null;
  difficulty: number | null;
  isPyq: boolean;
  year: number | null;
};

const LETTERS = "abcdefgh".split("");

export function QuestionManager({ questions }: { questions: QRow[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-luxe">{questions.length} questions</h2>
        {editing !== "new" && <Button onClick={() => setEditing("new")}><Plus className="size-4" /> New question</Button>}
      </div>

      {editing === "new" && <QuestionForm onDone={() => setEditing(null)} onCancel={() => setEditing(null)} />}

      <div className="space-y-3">
        {questions.map((q) =>
          editing === q.id ? (
            <QuestionForm key={q.id} question={q} onDone={() => setEditing(null)} onCancel={() => setEditing(null)} />
          ) : (
            <QuestionRow key={q.id} question={q} onEdit={() => setEditing(q.id)} />
          )
        )}
        {questions.length === 0 && editing !== "new" && (
          <div className="glass rounded-2xl p-10 text-center text-muted-foreground">Your question bank is empty.</div>
        )}
      </div>
    </div>
  );
}

function QuestionRow({ question, onEdit }: { question: QRow; onEdit: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="glass flex items-start gap-3 rounded-2xl p-4">
      <ListChecks className="mt-0.5 size-[18px] shrink-0 text-brand" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">{question.body}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="muted">{question.type}</Badge>
          <Badge variant="muted">{question.marks} mark{question.marks !== 1 ? "s" : ""}</Badge>
          {question.negativeMarks > 0 && <Badge variant="muted">−{question.negativeMarks}</Badge>}
          {question.subject && <span className="text-xs text-muted-foreground">{question.subject}</span>}
          {question.isPyq && <Badge variant="gold">PYQ{question.year ? ` ${question.year}` : ""}</Badge>}
        </div>
      </div>
      <button onClick={onEdit} className="text-muted-foreground hover:text-foreground" title="Edit"><Pencil className="size-4" /></button>
      <button onClick={() => start(async () => { await deleteQuestion(question.id); router.refresh(); })} disabled={pending} className="text-muted-foreground hover:text-red-400" title="Delete"><Trash2 className="size-4" /></button>
    </div>
  );
}

function QuestionForm({ question, onDone, onCancel }: { question?: QRow; onDone: () => void; onCancel: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [type, setType] = useState<QuestionType>(question?.type ?? "SINGLE");
  const [body, setBody] = useState(question?.body ?? "");
  const [subject, setSubject] = useState(question?.subject ?? "");
  const [marks, setMarks] = useState(String(question?.marks ?? 4));
  const [negativeMarks, setNegativeMarks] = useState(String(question?.negativeMarks ?? 1));
  const [isPyq, setIsPyq] = useState(question?.isPyq ?? false);
  const [year, setYear] = useState(question?.year ? String(question.year) : "");

  const [options, setOptions] = useState<Option[]>(
    question && question.options.length ? question.options : [
      { id: "a", text: "" }, { id: "b", text: "" }, { id: "c", text: "" }, { id: "d", text: "" },
    ]
  );
  const [correctIds, setCorrectIds] = useState<string[]>(question?.correctIds ?? []);
  const [numericAnswer, setNumericAnswer] = useState(question?.numericAnswer != null ? String(question.numericAnswer) : "");

  const isNumeric = type === "NUMERIC";
  const isTF = type === "TRUE_FALSE";
  const multi = type === "MULTIPLE";
  const tfOptions: Option[] = [{ id: "true", text: "True" }, { id: "false", text: "False" }];
  const shownOptions = isTF ? tfOptions : options;

  function toggleCorrect(id: string) {
    if (multi) setCorrectIds((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
    else setCorrectIds([id]);
  }
  function setOptionText(id: string, text: string) {
    setOptions((os) => os.map((o) => (o.id === id ? { ...o, text } : o)));
  }
  function addOption() {
    const next = LETTERS[options.length] ?? String(options.length);
    setOptions((os) => [...os, { id: next, text: "" }]);
  }

  function submit() {
    if (!body.trim()) { setError("Enter the question text."); return; }
    if (!isNumeric && correctIds.length === 0) { setError("Mark the correct answer."); return; }
    if (isNumeric && numericAnswer.trim() === "") { setError("Enter the numeric answer."); return; }
    setError(null);

    const input: QuestionInput = {
      subject: subject || null,
      chapter: null,
      type,
      body,
      options: isTF ? tfOptions : options,
      correctIds: isNumeric ? [] : correctIds,
      numericAnswer: isNumeric ? Number(numericAnswer) : null,
      marks: Number(marks) || 1,
      negativeMarks: Number(negativeMarks) || 0,
      difficulty: null,
      isPyq,
      year: year ? Number(year) : null,
    };
    start(async () => {
      const res = question ? await updateQuestion(question.id, input) : await createQuestion(input);
      if (res.ok) { onDone(); router.refresh(); } else setError(res.error ?? "Could not save.");
    });
  }

  return (
    <div className="glass space-y-4 rounded-2xl border border-brand/20 p-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <div className="space-y-1.5">
          <Label>Type</Label>
          <select value={type} onChange={(e) => { setType(e.target.value as QuestionType); setCorrectIds([]); }} className="h-10 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-foreground focus-visible:border-brand/60 focus-visible:outline-none">
            <option value="SINGLE">Single choice</option>
            <option value="MULTIPLE">Multiple choice</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="NUMERIC">Numeric</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>Marks</Label>
          <Input value={marks} onChange={(e) => setMarks(e.target.value)} inputMode="numeric" className="h-10 w-24" />
        </div>
        <div className="space-y-1.5">
          <Label>Negative</Label>
          <Input value={negativeMarks} onChange={(e) => setNegativeMarks(e.target.value)} inputMode="decimal" className="h-10 w-24" />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Question</Label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={2} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-foreground focus-visible:border-brand/60 focus-visible:outline-none" />
      </div>

      {isNumeric ? (
        <div className="space-y-1.5">
          <Label>Correct numeric answer</Label>
          <Input value={numericAnswer} onChange={(e) => setNumericAnswer(e.target.value)} inputMode="decimal" placeholder="42" className="h-10 max-w-xs" />
        </div>
      ) : (
        <div className="space-y-2">
          <Label>{multi ? "Options (tick all correct)" : "Options (tick the correct one)"}</Label>
          {shownOptions.map((o) => (
            <div key={o.id} className="flex items-center gap-2">
              <button type="button" onClick={() => toggleCorrect(o.id)} className={`grid size-6 shrink-0 place-items-center rounded-${multi ? "md" : "full"} border ${correctIds.includes(o.id) ? "border-gold bg-gold/20 text-gold" : "border-white/15 text-transparent"}`}>
                <Check className="size-3.5" />
              </button>
              {isTF ? (
                <span className="text-sm text-foreground">{o.text}</span>
              ) : (
                <Input value={o.text} onChange={(e) => setOptionText(o.id, e.target.value)} placeholder={`Option ${o.id.toUpperCase()}`} className="h-9" />
              )}
            </div>
          ))}
          {!isTF && options.length < 8 && (
            <button type="button" onClick={addOption} className="text-xs text-muted-foreground hover:text-foreground"><Plus className="mr-1 inline size-3.5" />Add option</button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <div className="space-y-1.5">
          <Label>Subject</Label>
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Physics" className="h-9 w-40" />
        </div>
        <label className="mt-5 flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={isPyq} onChange={(e) => setIsPyq(e.target.checked)} className="size-4 accent-[hsl(var(--brand))]" /> PYQ
        </label>
        {isPyq && (
          <div className="space-y-1.5">
            <Label>Year</Label>
            <Input value={year} onChange={(e) => setYear(e.target.value)} inputMode="numeric" placeholder="2024" className="h-9 w-28" />
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-white/8 pt-4">
        <Button onClick={submit} disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : question ? "Save question" : "Add question"}</Button>
        <button type="button" onClick={onCancel} className="text-sm text-muted-foreground hover:text-foreground"><X className="mr-1 inline size-4" />Cancel</button>
        {error && <span className="text-sm text-red-400">{error}</span>}
      </div>
    </div>
  );
}
