import Link from "next/link";
import {
  Building2, IndianRupee, RefreshCw, Users, ArrowRight, Sparkles, CircleDot,
} from "lucide-react";
import { requirePlatformAdmin } from "@/lib/platform";
import { prismaAdmin } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { PlatformTopbar } from "@/components/platform/topbar";
import { ProvisionSchool } from "@/components/platform/provision-school";
import type { TenantStatus } from "@prisma/client";

export const metadata = { title: "Platform Console" };

const STATUS_VARIANT: Record<TenantStatus, "gold" | "muted" | "default"> = {
  ACTIVE: "gold", PENDING: "default", SUSPENDED: "muted", CANCELLED: "muted",
};

export default async function PlatformOverview() {
  const admin = await requirePlatformAdmin();

  const [tenants, studentGroups] = await Promise.all([
    prismaAdmin.tenant.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        license: true,
        owner: { select: { name: true, phone: true } },
        _count: { select: { courses: true, enrollments: true } },
      },
    }),
    prismaAdmin.membership.groupBy({ by: ["tenantId"], where: { role: "STUDENT" }, _count: true }),
  ]);

  const studentByTenant = new Map(studentGroups.map((g) => [g.tenantId, g._count]));

  const activeCount = tenants.filter((t) => t.status === "ACTIVE").length;
  const oneTimeTotal = tenants.reduce((s, t) => s + Number(t.license?.oneTimeFee ?? 0), 0);
  const amcAnnual = tenants
    .filter((t) => t.license?.status === "ACTIVE")
    .reduce((s, t) => s + Number(t.license?.amcAmount ?? 0), 0);

  return (
    <div className="luxe-bg grain relative min-h-screen">
      <PlatformTopbar adminName={admin.name} />

      <main className="relative z-10 mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="animate-fade-up flex flex-wrap items-end justify-between gap-4">
          <div>
            <span className="eyebrow"><Sparkles className="size-3.5 text-gold" /> Operator</span>
            <h1 className="mt-3 font-display text-4xl tracking-tight text-luxe">Your schools</h1>
            <p className="mt-2 text-muted-foreground">License revenue and health across every tenant.</p>
          </div>
          <ProvisionSchool />
        </div>

        {/* KPIs */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi icon={Building2} label="Schools" value={String(tenants.length)} note={`${activeCount} active`} />
          <Kpi icon={IndianRupee} label="One-time license" value={formatMoney(oneTimeTotal)} note="collected" />
          <Kpi icon={RefreshCw} label="AMC run-rate" value={formatMoney(amcAnnual)} note="per year" />
          <Kpi icon={Users} label="Total students" value={String(Array.from(studentByTenant.values()).reduce((a, b) => a + b, 0))} />
        </div>

        {/* School list */}
        <div className="mt-10">
          <h2 className="mb-4 font-display text-xl text-luxe">All schools</h2>
          <div className="overflow-hidden rounded-2xl border border-white/8">
            {tenants.map((t, i) => (
              <Link
                key={t.id}
                href={`/platform/schools/${t.id}`}
                className={`flex flex-wrap items-center gap-4 bg-card/40 px-5 py-4 transition-colors hover:bg-white/[0.03] ${i > 0 ? "border-t border-white/6" : ""}`}
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand/25 to-gold/10">
                  {t.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.logoUrl} alt="" className="size-full rounded-xl object-cover" />
                  ) : (
                    <span className="font-display text-lg text-brand-gradient">{t.name.charAt(0)}</span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-display text-base text-foreground">{t.name}</h3>
                    <Badge variant={STATUS_VARIANT[t.status]}>{t.status}</Badge>
                    {t.license && <Badge variant="muted">{t.license.amcTier}</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {t.subdomain} · {t.owner?.name ?? t.owner?.phone ?? "no owner"}
                  </p>
                </div>
                <div className="hidden items-center gap-6 text-sm sm:flex">
                  <Stat label="students" value={String(studentByTenant.get(t.id) ?? 0)} />
                  <Stat label="courses" value={String(t._count.courses)} />
                  <Stat label="AMC/yr" value={t.license ? formatMoney(Number(t.license.amcAmount)) : "—"} />
                </div>
                <ArrowRight className="size-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, note }: { icon: React.ElementType; label: string; value: string; note?: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className="size-4 text-brand" />
      </div>
      <div className="mt-3 font-display text-2xl text-luxe">{value}</div>
      {note && <p className="mt-1 text-[0.7rem] text-muted-foreground">{note}</p>}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <div className="font-display text-foreground">{value}</div>
      <div className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
