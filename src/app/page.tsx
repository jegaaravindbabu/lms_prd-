import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  PlayCircle,
  Sparkles,
  ShieldCheck,
  Infinity as InfinityIcon,
  Star,
} from "lucide-react";
import { getTenant } from "@/lib/tenant";
import { withTenant, prismaAdmin } from "@/lib/db";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { PlatformLanding } from "./_platform-landing";
import { DemoHome, type DemoSchool } from "./_demo-home";

export default async function Home() {
  const tenant = await getTenant();

  // No tenant on this host. In demo mode show a school switcher; otherwise the
  // platform marketing page.
  if (!tenant) {
    if (process.env.NEXT_PUBLIC_DEMO === "1") {
      const schools = (await prismaAdmin.tenant.findMany({
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        select: { name: true, subdomain: true, logoUrl: true, primaryColor: true },
      })) as DemoSchool[];
      return <DemoHome schools={schools} />;
    }
    return <PlatformLanding />;
  }

  // Suspended / cancelled schools are blocked.
  if (tenant.status !== "ACTIVE") redirect("/not-active");

  // Featured courses for this school (RLS-scoped).
  const courses = await withTenant(tenant.id, (tx) =>
    tx.course.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { publishedAt: "desc" },
      take: 3,
      include: { instructor: { select: { name: true } } },
    })
  );

  const hero = courses[0];

  return (
    <div className="luxe-bg grain relative min-h-screen overflow-hidden">
      {/* Nav */}
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo name={tenant.name} logoUrl={tenant.logoUrl} />
        <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
          <a href="#courses" className="transition-colors hover:text-foreground">Courses</a>
          <a href="#why" className="transition-colors hover:text-foreground">Why us</a>
          <Link href="/login" className="transition-colors hover:text-foreground">Sign in</Link>
        </nav>
        <Button asChild size="sm" className="hidden md:inline-flex">
          <Link href="/login">Enroll now <ArrowRight className="size-4" /></Link>
        </Button>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-6 pb-24 pt-12 lg:grid-cols-2 lg:pt-20">
        <div className="animate-fade-up">
          <span className="eyebrow">
            <Sparkles className="size-3.5 text-gold" />
            {tenant.name} · Online Academy
          </span>
          <h1 className="mt-6 font-display text-5xl leading-[1.03] tracking-tight text-luxe sm:text-6xl lg:text-7xl">
            Learn like the
            <br />
            <span className="text-brand-gradient">top 1%</span> do.
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
            Cinematic lessons, real exam intelligence, and a path built for
            rank-holders — all under {tenant.name}&rsquo;s roof.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Button asChild size="lg">
              <Link href="/login">Start learning <ArrowRight className="size-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#courses"><PlayCircle className="size-4" /> Watch a free preview</a>
            </Button>
          </div>

          <div className="mt-12 flex items-center gap-8">
            <Stat value="12k+" label="Learners" />
            <div className="h-8 w-px bg-white/10" />
            <Stat value="98%" label="Satisfaction" />
            <div className="h-8 w-px bg-white/10" />
            <Stat value="4.9" label="Avg. rating" icon />
          </div>
        </div>

        {/* Hero card */}
        <div className="animate-fade-up [animation-delay:120ms]">
          <div className="glass relative rounded-3xl p-2">
            <div
              className="relative aspect-[4/3] overflow-hidden rounded-[1.35rem] bg-gradient-to-br from-brand/30 via-transparent to-gold/10"
              style={
                tenant.heroUrl
                  ? { backgroundImage: `url(${tenant.heroUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : undefined
              }
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                {hero ? (
                  <>
                    <Badge variant="gold" className="mb-3">Featured course</Badge>
                    <h3 className="font-display text-2xl leading-tight text-white">{hero.title}</h3>
                    <p className="mt-1 text-sm text-white/70">
                      {hero.instructor?.name ? `with ${hero.instructor.name}` : "Faculty-led"}
                    </p>
                    <div className="mt-4 flex items-center justify-between">
                      <span className="font-display text-xl text-white">
                        {hero.isFree ? "Free" : formatMoney(Number(hero.price), hero.currency)}
                      </span>
                      <Button asChild size="sm" variant="gold">
                        <Link href={`/courses/${hero.slug}`}>Enroll <ArrowRight className="size-4" /></Link>
                      </Button>
                    </div>
                  </>
                ) : (
                  <h3 className="font-display text-2xl text-white">Courses arriving soon.</h3>
                )}
              </div>
              <div className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/20">
                <PlayCircle className="size-8 text-white" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why us */}
      <section id="why" className="relative z-10 mx-auto max-w-6xl px-6 py-16">
        <div className="hairline mb-14" />
        <div className="grid gap-6 md:grid-cols-3">
          <Feature icon={ShieldCheck} title="Private by design" body="Your progress, payments, and data belong to this school alone — sealed at the database layer." />
          <Feature icon={InfinityIcon} title="Lifetime access" body="Buy once, revisit forever. Resume any lesson exactly where you paused." />
          <Feature icon={Sparkles} title="Exam-grade content" body="PYQ-backed lessons and full-length tests engineered for the score you need." />
        </div>
      </section>

      {/* Courses */}
      <section id="courses" className="relative z-10 mx-auto max-w-6xl px-6 py-16">
        <div className="flex items-end justify-between">
          <div>
            <span className="eyebrow"><Sparkles className="size-3.5 text-gold" /> Catalog</span>
            <h2 className="mt-3 font-display text-4xl tracking-tight text-luxe">Signature courses</h2>
          </div>
          <Link href="/login" className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline-flex">
            View all <ArrowRight className="ml-1 inline size-4" />
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.length === 0 && (
            <p className="text-muted-foreground">No published courses yet.</p>
          )}
          {courses.map((c) => (
            <Link
              key={c.id}
              href={`/courses/${c.slug}`}
              className="group glass relative overflow-hidden rounded-2xl p-1 transition-transform duration-500 hover:-translate-y-1"
            >
              <div className="relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-brand/25 to-gold/10">
                {c.thumbnailUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.thumbnailUrl} alt={c.title} className="h-full w-full object-cover" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
              <div className="p-5">
                <h3 className="font-display text-lg leading-tight text-foreground">{c.title}</h3>
                {c.subtitle && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.subtitle}</p>}
                <div className="mt-4 flex items-center justify-between">
                  <span className="font-display text-lg text-brand-gradient">
                    {c.isFree ? "Free" : formatMoney(Number(c.price), c.currency)}
                  </span>
                  <span className="text-sm text-muted-foreground transition-colors group-hover:text-foreground">
                    Enroll <ArrowRight className="ml-0.5 inline size-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 mx-auto max-w-6xl px-6 py-12">
        <div className="hairline mb-8" />
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <Logo name={tenant.name} logoUrl={tenant.logoUrl} compact />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {tenant.name}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label, icon }: { value: string; label: string; icon?: boolean }) {
  return (
    <div>
      <div className="flex items-center gap-1 font-display text-2xl text-foreground">
        {value}
        {icon && <Star className="size-4 fill-gold text-gold" />}
      </div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
    </div>
  );
}

function Feature({ icon: Icon, title, body }: { icon: React.ElementType; title: string; body: string }) {
  return (
    <div className="glass rounded-2xl p-6">
      <span className="grid size-11 place-items-center rounded-xl bg-brand/12 ring-1 ring-inset ring-white/10">
        <Icon className="size-5 text-brand" />
      </span>
      <h3 className="mt-5 font-display text-lg text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
