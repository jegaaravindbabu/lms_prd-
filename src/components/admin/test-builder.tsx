"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Plus, X, ListChecks, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { updateTest, addQuestionToTest, removeQuestionFromTest } from "@/app/(dashboard)/admin/tests/actions";

export type QMini = { id: string; body: string; type: string; marks: number };

export function TestBuilder({
  testId,
  test,
  attached,
  bank,
  courses,
}: {
  testId: string;
  test: { title: string; durationMin: number; negativeMarking: boolean; courseId: string | null; startsAt: string | null };
  attached: QMini[];
  bank: QMini[];
  courses: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState("");

  const filteredBank = bank.filter((q) => q.body.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
      {/* Questions */}
      <section className="order-2 lg:order-1 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-luxe">Questions ({attached.length})</h2>
          {!adding && <Button size="sm" onClick={() => setAdding(true)}><Plus className="size-4" /> Add from bank</Button>}
        </div>

        {adding && (
          <div className="glass space-y-3 rounded-2xl border border-brand/20 p-4">
            <div className="flex items-center justify-between">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search question bank…" className="h-9 pl-9" />
              </div>
              <button onClick={() => setAdding(false)} className="ml-2 text-muted-foreground hover:text-foreground"><X className="size-4" /></button>
            </div>
            <div className="max-h-72 space-y-2 overflow-auto">
              {filteredBank.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No questions available. Add some to the bank first.</p>}
              {filteredBank.map((q) => (
                <div key={q.id} className="flex items-center gap-3 rounded-xl border border-white/8 bg-card/40 px-3 py-2">
                  <span className="flex-1 truncate text-sm text-foreground">{q.body}</span>
                  <Badge variant="muted">{q.marks}m</Badge>
                  <Button size="sm" variant="outline" disabled={pending} onClick={() => start(async () => { await addQuestionToTest(testId, q.id); router.refresh(); })}>Add</Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          {attached.map((q, i) => (
            <div key={q.id} className="glass flex items-center gap-3 rounded-2xl p-4">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/[0.04] text-xs text-muted-foreground">{i + 1}</span>
              <ListChecks className="size-[18px] shrink-0 text-brand" />
              <span className="flex-1 truncate text-sm text-foreground">{q.body}</span>
              <Badge variant="muted">{q.type}</Badge>
              <Badge variant="muted">{q.marks}m</Badge>
              <button onClick={() => start(async () => { await removeQuestionFromTest(testId, q.id); router.refresh(); })} disabled={pending} className="text-muted-foreground hover:text-red-400"><X className="size-4" /></button>
            </div>
          ))}
          {attached.length === 0 && <div className="glass rounded-2xl p-8 text-center text-muted-foreground">No questions yet — add some from your bank.</div>}
        </div>
      </section>

      {/* Details */}
      <aside className="order-1 lg:order-2">
        <div className="glass sticky top-6 rounded-2xl p-6">
          <h2 className="mb-5 font-display text-xl text-luxe">Test settings</h2>
          <form
            action={(fd) =>
              start(async () => {
                setSaved(false);
                const res = await updateTest(testId, fd);
                if (res.ok) { setSaved(true); router.refresh(); setTimeout(() => setSaved(false), 2500); }
              })
            }
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input name="title" defaultValue={test.title} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Duration (min)</Label>
                <Input name="durationMin" defaultValue={String(test.durationMin)} inputMode="numeric" />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" name="negativeMarking" defaultChecked={test.negativeMarking} className="size-4 accent-[hsl(var(--brand))]" />
                  Negative marking
                </label>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Attach to course (optional)</Label>
              <select name="courseId" defaultValue={test.courseId ?? ""} className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-foreground focus-visible:border-brand/60 focus-visible:outline-none">
                <option value="">Standalone</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Starts at (optional)</Label>
              <Input name="startsAt" type="datetime-local" defaultValue={test.startsAt ?? ""} />
            </div>
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : "Save"}</Button>
              {saved && <span className="inline-flex items-center gap-1.5 text-sm text-gold"><Check className="size-4" /> Saved</span>}
            </div>
          </form>
        </div>
      </aside>
    </div>
  );
}
