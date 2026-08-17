import { Globe, Sparkles, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { prismaAdmin } from "@/lib/db";
import { DomainManager } from "@/components/admin/domain-manager";

export const metadata = { title: "Domain" };

export default async function DomainPage() {
  const user = await requireRole(["OWNER"]);

  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: user.tenantId },
    select: { subdomain: true, customDomain: true, customDomainToken: true, domainStatus: true },
  });

  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "lvh.me:3000").split(":")[0];
  const cnameTarget = `${tenant?.subdomain ?? "school"}.${root}`;

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <span className="eyebrow"><Sparkles className="size-3.5 text-gold" /> White-label</span>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-luxe">Custom domain</h1>
        <p className="mt-2 text-muted-foreground">Run your school on your own domain — no platform branding.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="glass rounded-2xl p-6">
          <div className="mb-5 flex items-center gap-2">
            <Globe className="size-5 text-brand" />
            <h2 className="font-display text-xl text-luxe">Your domain</h2>
          </div>
          <DomainManager
            customDomain={tenant?.customDomain ?? null}
            domainStatus={(tenant?.domainStatus ?? "PENDING") as "PENDING" | "VERIFYING" | "ACTIVE" | "ERROR"}
            token={tenant?.customDomainToken ?? null}
            cnameTarget={cnameTarget}
          />
        </div>

        <aside className="space-y-4">
          <div className="glass rounded-2xl p-5">
            <h3 className="font-display text-base text-foreground">Your free address</h3>
            <p className="mt-2 text-sm text-muted-foreground">Even without a custom domain, your school is always live at:</p>
            <code className="mt-3 block truncate rounded-lg border border-white/8 bg-black/30 px-3 py-2 text-xs text-foreground">{cnameTarget}</code>
          </div>
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center gap-2 text-sm text-foreground"><ShieldCheck className="size-4 text-gold" /> How verification works</div>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              You add a TXT record with a secret token so only you can claim the domain, plus a CNAME so traffic reaches your school. We check the TXT record before going live.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
