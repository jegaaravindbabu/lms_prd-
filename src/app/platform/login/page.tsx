import { redirect } from "next/navigation";
import { Building2, ShieldCheck } from "lucide-react";
import { getPlatformAdmin } from "@/lib/platform";
import { PlatformLoginForm } from "./platform-login-form";

export const metadata = { title: "Platform Console" };

export default async function PlatformLoginPage() {
  const admin = await getPlatformAdmin();
  if (admin) redirect("/platform");

  return (
    <div className="luxe-bg grain relative grid min-h-screen place-items-center px-6">
      <div className="relative z-10 w-full max-w-sm animate-fade-up">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-brand/15 ring-1 ring-inset ring-white/10">
            <Building2 className="size-5 text-brand" />
          </span>
          <div>
            <div className="font-display text-lg tracking-tight text-luxe">Platform Console</div>
            <div className="text-xs text-muted-foreground">Operator access</div>
          </div>
        </div>

        <div className="glass rounded-3xl p-7">
          <span className="eyebrow"><ShieldCheck className="size-3.5 text-gold" /> Restricted</span>
          <h1 className="mt-3 font-display text-3xl tracking-tight text-luxe">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage every school, license, and tier.</p>
          <div className="mt-7"><PlatformLoginForm /></div>
        </div>
      </div>
    </div>
  );
}
