import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Clock, ListChecks, AlertTriangle, ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import { getTenant } from "@/lib/tenant";
import { withTenant } from "@/lib/db";
import { isEnrolled } from "@/lib/access";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StartButton } from "@/components/tests/start-button";

export const metadata = { title: "Test" };

export default async function TestIntroPage({ params }: { params: { testId: string } }) {
  const user = await requireUser();
  const tenant = await getTenant();

  const test = await withTenant(user.tenantId, (tx) =>
    tx.test.findUnique({
      where: { id: params.testId },
      include: { course: { select: { title: true, slug: true } }, _count: { select: { testQuestions: true } } },
    })
  );
  if (!test) notFound();

  const locked = test.courseId ? !(await isEnrolled(user.tenantId, user.id, test.courseId)) : false;

  return (
    <div className="luxe-bg grain relative min-h-screen">
      <header className="relative z-20 mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/dashboard/tests"><Logo name={tenant?.name ?? "Academy"} logoUrl={tenant?.logoUrl} /></Link>
        <Link href="/dashboard/tests" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-4" /> Tests</Link>
      </header>

      <main className="relative z-10 mx-auto max-w-2xl px-6 py-10">
        <div className="glass animate-fade-up rounded-3xl p-8">
          <span className="eyebrow"><ListChecks className="size-3.5 text-gold" /> Assessment</span>
          <h1 className="mt-4 font-display text-4xl tracking-tight text-luxe">{test.title}</h1>
          {test.course?.title && <p className="mt-2 text-muted-foreground">Part of {test.course.title}</p>}

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Fact icon={ListChecks} label="Questions" value={String(test._count.testQuestions)} />
            <Fact icon={Clock} label="Duration" value={`${Math.round(test.durationSec / 60)} min`} />
            <Fact icon={ShieldCheck} label="Total marks" value={String(test.totalMarks)} />
          </div>

          <div className="mt-8 space-y-3 rounded-2xl border border-white/8 bg-white/[0.02] p-5 text-sm text-muted-foreground">
            <p className="flex items-center gap-2 text-foreground"><AlertTriangle className="size-4 text-gold" /> Before you begin</p>
            <ul className="space-y-1.5">
              <li>• The timer starts as soon as you click Start and auto-submits at zero.</li>
              <li>• {test.negativeMarking ? "Negative marking is ON — wrong answers lose marks." : "No negative marking."}</li>
              <li>• You can move between questions freely before submitting.</li>
            </ul>
          </div>

          <div className="mt-8">
            {locked ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">You need to enroll in the course to take this test.</p>
                {test.course?.slug && <Button asChild><Link href={`/courses/${test.course.slug}`}>Go to course</Link></Button>}
              </div>
            ) : test._count.testQuestions === 0 ? (
              <p className="text-sm text-muted-foreground">This test has no questions yet.</p>
            ) : (
              <StartButton testId={test.id} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Fact({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-center">
      <Icon className="mx-auto size-5 text-brand" />
      <div className="mt-2 font-display text-xl text-luxe">{value}</div>
      <div className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
