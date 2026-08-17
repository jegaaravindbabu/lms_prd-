import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { getTenant } from "@/lib/tenant";
import { getSession } from "@/lib/auth";
import { Logo } from "@/components/brand/logo";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default async function LoginPage() {
  const tenant = await getTenant();
  const session = await getSession();
  if (session) redirect("/dashboard");

  const name = tenant?.name ?? "Academy";

  return (
    <div className="luxe-bg grain relative flex min-h-screen">
      {/* Left brand panel */}
      <aside className="relative hidden w-[46%] flex-col justify-between overflow-hidden border-r border-white/8 p-12 lg:flex">
        <div
          className="absolute inset-0 opacity-90"
          style={
            tenant?.heroUrl
              ? { backgroundImage: `linear-gradient(180deg, hsl(240 24% 4% / 0.5), hsl(240 24% 4% / 0.9)), url(${tenant.heroUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        />
        <div className="relative z-10">
          <Logo name={name} logoUrl={tenant?.logoUrl} />
        </div>
        <div className="relative z-10 max-w-sm">
          <blockquote className="font-display text-3xl leading-snug text-luxe">
            &ldquo;The finest classroom I&rsquo;ve ever walked into — and it&rsquo;s in my pocket.&rdquo;
          </blockquote>
          <p className="mt-4 text-sm text-muted-foreground">A {name} learner</p>
        </div>
        <div className="relative z-10 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 text-gold" />
          Bank-grade isolation · Your data stays with {name}
        </div>
      </aside>

      {/* Right form panel */}
      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-fade-up">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground lg:hidden"
          >
            <ArrowLeft className="size-4" /> Back
          </Link>

          <div className="mb-8 lg:hidden">
            <Logo name={name} logoUrl={tenant?.logoUrl} />
          </div>

          <span className="eyebrow">Members only</span>
          <h1 className="mt-4 font-display text-4xl tracking-tight text-luxe">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to {name} with your phone number.
          </p>

          <div className="mt-8">
            <LoginForm />
          </div>

          <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground/80">
            By continuing you agree to {name}&rsquo;s Terms & Privacy Policy.
          </p>
        </div>
      </main>
    </div>
  );
}
