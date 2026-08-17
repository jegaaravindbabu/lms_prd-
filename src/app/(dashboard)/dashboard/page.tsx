import Link from "next/link";
import { ArrowRight, BookOpen, Clock, Trophy, PlayCircle } from "lucide-react";
import { requireUser } from "@/lib/rbac";
import { getTenant } from "@/lib/tenant";
import { withTenant } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();
  const tenant = await getTenant();

  const [enrollments, catalog] = await withTenant(user.tenantId, async (tx) => {
    const enrollments = await tx.enrollment.findMany({
      where: { userId: user.id, status: "ACTIVE" },
      include: { course: { include: { instructor: { select: { name: true } } } } },
      orderBy: { enrolledAt: "desc" },
    });
    const enrolledIds = enrollments.map((e) => e.courseId);
    const catalog = await tx.course.findMany({
      where: { status: "PUBLISHED", id: { notIn: enrolledIds.length ? enrolledIds : ["_"] } },
      take: 3,
      orderBy: { publishedAt: "desc" },
    });
    return [enrollments, catalog] as const;
  });

  const firstName = user.name?.split(" ")[0] ?? "there";

  return (
    <div className="space-y-10">
      {/* Greeting */}
      <div className="animate-fade-up">
        <span className="eyebrow">{tenant?.name ?? "Academy"}</span>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-luxe">
          Welcome back, {firstName}.
        </h1>
        <p className="mt-2 text-muted-foreground">Pick up where you left off.</p>
      </div>

      {/* Stat tiles */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile icon={BookOpen} label="Enrolled courses" value={String(enrollments.length)} />
        <StatTile icon={Clock} label="Hours this week" value="6.5" />
        <StatTile icon={Trophy} label="Avg. score" value="—" />
      </div>

      {/* Continue learning */}
      <section>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl text-luxe">Continue learning</h2>
          <Link href="/dashboard/courses" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            All courses <ArrowRight className="ml-1 inline size-4" />
          </Link>
        </div>

        {enrollments.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center">
            <p className="text-muted-foreground">You haven&rsquo;t enrolled in a course yet.</p>
            <Button asChild className="mt-5"><Link href="/">Browse the catalog <ArrowRight className="size-4" /></Link></Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {enrollments.map(({ course }) => (
              <Link key={course.id} href={`/learn/${course.id}`} className="group glass overflow-hidden rounded-2xl p-1 transition-transform hover:-translate-y-1">
                <div className="relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-brand/25 to-gold/10">
                  <div className="absolute inset-0 grid place-items-center">
                    <PlayCircle className="size-10 text-white/80 transition-transform group-hover:scale-110" />
                  </div>
                </div>
                <div className="p-4">
                  <Badge variant="muted" className="mb-2">In progress</Badge>
                  <h3 className="font-display text-base leading-tight text-foreground">{course.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {course.instructor?.name ? `with ${course.instructor.name}` : "Faculty-led"}
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/8">
                    <div className="h-full w-1/3 rounded-full bg-brand shadow-[0_0_10px_hsl(var(--brand))]" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Recommended */}
      {catalog.length > 0 && (
        <section>
          <h2 className="mb-5 font-display text-2xl text-luxe">Recommended for you</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.map((c) => (
              <Link key={c.id} href={`/courses/${c.slug}`} className="group glass rounded-2xl p-5 transition-transform hover:-translate-y-1">
                <h3 className="font-display text-base text-foreground">{c.title}</h3>
                {c.subtitle && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.subtitle}</p>}
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-display text-brand-gradient">
                    {c.isFree ? "Free" : formatMoney(Number(c.price), c.currency)}
                  </span>
                  <ArrowRight className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className="size-4 text-brand" />
      </div>
      <div className="mt-3 font-display text-3xl text-luxe">{value}</div>
    </div>
  );
}
