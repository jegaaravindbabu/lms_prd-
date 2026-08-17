import Link from "next/link";
import { ArrowRight, ShieldCheck, Palette, CreditCard, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Shown on the platform root domain (no tenant resolved) — this is YOUR
 * marketing page for selling the white-label LMS to schools.
 */
export function PlatformLanding() {
  return (
    <div className="luxe-bg grain relative min-h-screen overflow-hidden">
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-xl bg-brand/15 ring-1 ring-inset ring-white/10">
            <Building2 className="size-5 text-brand" />
          </span>
          <span className="font-display text-lg tracking-tight text-luxe">Platform</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/platform/login" className="text-sm text-muted-foreground transition-colors hover:text-foreground">Operator sign in</Link>
          <Button size="sm" variant="outline">Book a demo</Button>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-3xl px-6 py-24 text-center">
        <Badge variant="gold" className="mx-auto mb-6">White-label LMS</Badge>
        <h1 className="font-display text-5xl leading-[1.05] tracking-tight text-luxe sm:text-6xl">
          Launch your own <span className="text-brand-gradient">branded academy</span> — in a day.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          Your domain. Your branding. Your payment gateway. We provide the
          software; you keep your students and every rupee they pay.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Button size="lg">Start a school <ArrowRight className="size-4" /></Button>
          <Button size="lg" variant="outline">See pricing</Button>
        </div>

        <div className="mt-20 grid gap-6 text-left sm:grid-cols-3">
          <Mini icon={Palette} title="Truly white-label" body="Your logo, colors, and custom domain — no platform branding, ever." />
          <Mini icon={CreditCard} title="Your gateway" body="Razorpay, Cashfree, or Stripe. Money settles to you — zero platform fee." />
          <Mini icon={ShieldCheck} title="Isolated by RLS" body="Every school's data is sealed at the database with row-level security." />
        </div>
      </section>
    </div>
  );
}

function Mini({ icon: Icon, title, body }: { icon: React.ElementType; title: string; body: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <Icon className="size-5 text-brand" />
      <h3 className="mt-4 font-display text-base text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
