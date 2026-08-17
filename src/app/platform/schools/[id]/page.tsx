import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users, HardDrive, BookOpen, IndianRupee, User as UserIcon } from "lucide-react";
import { requirePlatformAdmin } from "@/lib/platform";
import { prismaAdmin } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import { PlatformTopbar } from "@/components/platform/topbar";
import { TenantStatusControls } from "@/components/platform/tenant-status";
import { LicenseForm, type LicenseData } from "@/components/platform/license-form";
import type { TenantStatus } from "@prisma/client";

export const metadata = { title: "School" };

const STATUS_VARIANT: Record<TenantStatus, "gold" | "muted" | "default"> = {
  ACTIVE: "gold", PENDING: "default", SUSPENDED: "muted", CANCELLED: "muted",
};

function toDateInput(d: Date | null): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

export default async function SchoolDetail({ params }: { params: { id: string } }) {
  const admin = await requirePlatformAdmin();

  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: params.id },
    include: {
      license: true,
      owner: { select: { name: true, phone: true, email: true } },
      usageMeters: { orderBy: { period: "desc" }, take: 6 },
      _count: { select: { courses: true, enrollments: true } },
    },
  });
  if (!tenant) notFound();

  const students = await prismaAdmin.membership.count({ where: { tenantId: tenant.id, role: "STUDENT" } });
  const latestMeter = tenant.usageMeters[0];
  const capStudents = tenant.license?.capStudents ?? null;
  const capStorage = tenant.license?.capStorageMb ?? null;
  const studentPct = capStudents ? Math.min(100, Math.round((students / capStudents) * 100)) : null;
  const storagePct = capStorage && latestMeter ? Math.min(100, Math.round((latestMeter.storageMb / capStorage) * 100)) : null;

  const licenseData: LicenseData = {
    amcTier: tenant.license?.amcTier ?? "STARTER",
    status: tenant.license?.status ?? "ACTIVE",
    oneTimeFee: String(tenant.license?.oneTimeFee ?? 0),
    amcAmount: String(tenant.license?.amcAmount ?? 0),
    capStudents: tenant.license?.capStudents ?? null,
    capStorageMb: tenant.license?.capStorageMb ?? null,
    amcNextDueAt: toDateInput(tenant.license?.amcNextDueAt ?? null),
  };

  return (
    <div className="luxe-bg grain relative min-h-screen">
      <PlatformTopbar adminName={admin.name} />

      <main className="relative z-10 mx-auto max-w-5xl px-5 py-10 sm:px-8">
        <Link href="/platform" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" /> All schools
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-3xl tracking-tight text-luxe">{tenant.name}</h1>
              <Badge variant={STATUS_VARIANT[tenant.status]}>{tenant.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{tenant.subdomain} · created {tenant.createdAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
          <TenantStatusControls tenantId={tenant.id} status={tenant.status} />
        </div>

        {/* KPIs */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi icon={Users} label="Students" value={String(students)} />
          <Kpi icon={BookOpen} label="Courses" value={String(tenant._count.courses)} />
          <Kpi icon={IndianRupee} label="AMC / year" value={tenant.license ? formatMoney(Number(tenant.license.amcAmount)) : "—"} />
          <Kpi icon={HardDrive} label="Storage" value={`${latestMeter?.storageMb ?? 0} MB`} />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* License editor */}
          <div className="glass rounded-2xl p-6">
            <h2 className="mb-5 font-display text-xl text-luxe">License & AMC</h2>
            <LicenseForm tenantId={tenant.id} license={licenseData} />
          </div>

          {/* Right rail */}
          <aside className="space-y-6">
            <div className="glass rounded-2xl p-5">
              <h3 className="font-display text-base text-foreground">Capacity</h3>
              {studentPct !== null ? (
                <Meter label="Students" used={students} cap={capStudents!} pct={studentPct} />
              ) : <p className="mt-3 text-sm text-muted-foreground">No student cap set.</p>}
              {storagePct !== null && <Meter label="Storage (MB)" used={latestMeter?.storageMb ?? 0} cap={capStorage!} pct={storagePct} className="mt-5" />}
              {(studentPct ?? 0) >= 80 && <p className="mt-3 text-xs text-gold">Near the student cap — consider a tier upgrade.</p>}
            </div>

            <div className="glass rounded-2xl p-5">
              <h3 className="flex items-center gap-2 font-display text-base text-foreground"><UserIcon className="size-4 text-brand" /> Owner</h3>
              <dl className="mt-3 space-y-1.5 text-sm">
                <Row label="Name" value={tenant.owner?.name ?? "—"} />
                <Row label="Phone" value={tenant.owner?.phone ?? "—"} />
                <Row label="Email" value={tenant.owner?.email ?? "—"} />
              </dl>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">{label}</span>
        <Icon className="size-4 text-brand" />
      </div>
      <div className="mt-3 font-display text-2xl text-luxe">{value}</div>
    </div>
  );
}

function Meter({ label, used, cap, pct, className = "" }: { label: string; used: number; cap: number; pct: number; className?: string }) {
  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground">{used} / {cap}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <div className="h-full rounded-full bg-gradient-to-r from-brand to-gold shadow-[0_0_12px_hsl(var(--brand))]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
