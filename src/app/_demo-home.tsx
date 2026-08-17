import Link from "next/link";
import { ArrowRight, Building2, ShieldCheck, GraduationCap, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export type DemoSchool = {
  name: string;
  subdomain: string;
  logoUrl: string | null;
  primaryColor: string | null;
};

/**
 * Single-URL demo home: a school switcher. Picking a school sets the
 * demo_tenant cookie (via /api/demo/switch) so the rest of the app renders as
 * that white-labeled school.
 */
export function DemoHome({ schools }: { schools: DemoSchool[] }) {
  return (
    <div className="luxe-bg grain relative min-h-screen overflow-hidden">
      <header className="relative z-20 mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-brand/15 ring-1 ring-inset ring-white/10">
            <Building2 className="size-5 text-brand" />
          </span>
          <span className="font-display text-lg tracking-tight text-luxe">White-Label LMS</span>
        </div>
        <Link href="/platform/login" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Operator console</Link>
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-6 py-14 text-center">
        <Badge variant="gold" className="mx-auto mb-6">Live demo</Badge>
        <h1 className="font-display text-5xl leading-[1.05] tracking-tight text-luxe sm:text-6xl">
          One platform. <span className="text-brand-gradient">Many branded schools.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Pick a school to step inside its fully white-labeled academy. Same codebase, different tenant — sealed from each other at the database.
        </p>

        {/* School cards */}
        <div className="mx-auto mt-12 grid max-w-3xl gap-5 sm:grid-cols-2">
          {schools.map((s) => (
            <a
              key={s.subdomain}
              href={`/api/demo/switch?t=${s.subdomain}`}
              className="group glass relative overflow-hidden rounded-2xl p-6 text-left transition-transform duration-500 hover:-translate-y-1"
            >
              <div
                className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-40 blur-2xl"
                style={{ background: s.primaryColor ?? "#4F46E5" }}
              />
              <div className="relative flex items-center gap-3">
                <span
                  className="grid size-12 place-items-center rounded-xl ring-1 ring-inset ring-white/10"
                  style={{ background: `${s.primaryColor ?? "#4F46E5"}22` }}
                >
                  {s.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.logoUrl} alt="" className="size-full rounded-xl object-contain" />
                  ) : (
                    <span className="font-display text-xl" style={{ color: s.primaryColor ?? "#4F46E5" }}>{s.name.charAt(0)}</span>
                  )}
                </span>
                <div>
                  <div className="font-display text-xl text-foreground">{s.name}</div>
                  <div className="text-xs text-muted-foreground">{s.subdomain}</div>
                </div>
              </div>
              <div className="relative mt-5 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><GraduationCap className="size-4" /> Enter as a student or staff</span>
                <ArrowRight className="size-4 text-muted-foreground transition-colors group-hover:text-foreground" />
              </div>
            </a>
          ))}
        </div>

        {schools.length === 0 && (
          <p className="mt-10 text-muted-foreground">No active schools yet. Provision one from the operator console.</p>
        )}

        <div className="mt-14 flex flex-col items-center gap-4">
          <div className="hairline w-40" />
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-4 text-gold" /> Isolated by Postgres RLS</span>
            <span className="inline-flex items-center gap-1.5"><Sparkles className="size-4 text-gold" /> Your gateway, no platform fee</span>
          </div>
          <Button asChild variant="outline" size="sm" className="mt-2">
            <Link href="/platform/login"><Building2 className="size-4" /> Open the operator console</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
