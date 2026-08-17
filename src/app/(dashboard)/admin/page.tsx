import { Users, IndianRupee, HardDrive, TrendingUp, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { getTenant } from "@/lib/tenant";
import { withTenant } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";

export const metadata = { title: "Console" };

export default async function AdminPage() {
  const user = await requireRole(["OWNER", "ADMIN"]);
  const tenant = await getTenant();

  const data = await withTenant(user.tenantId, async (tx) => {
    const [students, courses, published, enrollments, license, latestMeter, revenueAgg] =
      await Promise.all([
        tx.membership.count({ where: { role: "STUDENT" } }),
        tx.course.count(),
        tx.course.count({ where: { status: "PUBLISHED" } }),
        tx.enrollment.count({ where: { status: "ACTIVE" } }),
        tx.clientLicense.findFirst(),
        tx.usageMeter.findFirst({ orderBy: { period: "desc" } }),
        tx.payment.aggregate({ _sum: { amount: true }, where: { status: "PAID" } }),
      ]);
    return { students, courses, published, enrollments, license, latestMeter, revenueAgg };
  });

  const revenue = Number(data.revenueAgg._sum.amount ?? 0);
  const capStudents = data.license?.capStudents ?? null;
  const studentPct = capStudents ? Math.min(100, Math.round((data.students / capStudents) * 100)) : null;

  return (
    <div className="space-y-10">
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow"><ShieldCheck className="size-3.5 text-gold" /> Owner console</span>
          <h1 className="mt-3 font-display text-4xl tracking-tight text-luxe">{tenant?.name} at a glance</h1>
        </div>
        {data.license && (
          <Badge variant="gold">
            {data.license.amcTier} tier · {data.license.status}
          </Badge>
        )}
      </div>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={Users} label="Students" value={String(data.students)} />
        <Kpi icon={TrendingUp} label="Active enrollments" value={String(data.enrollments)} />
        <Kpi icon={IndianRupee} label="Course revenue" value={formatMoney(revenue)} note="Settles to your gateway" />
        <Kpi icon={HardDrive} label="Storage used" value={`${data.latestMeter?.storageMb ?? 0} MB`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* License / capacity */}
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <h2 className="font-display text-xl text-luxe">License & capacity</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Your platform plan — one-time license plus annual maintenance.
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-3">
            <Field label="One-time fee" value={data.license ? formatMoney(Number(data.license.oneTimeFee), data.license.amcCurrency) : "—"} />
            <Field label="Annual (AMC)" value={data.license ? formatMoney(Number(data.license.amcAmount), data.license.amcCurrency) : "—"} />
            <Field label="Renews" value={data.license?.amcNextDueAt ? new Date(data.license.amcNextDueAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"} />
          </div>

          {studentPct !== null && (
            <div className="mt-8">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Student capacity</span>
                <span className="text-foreground">{data.students} / {capStudents}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand to-gold shadow-[0_0_12px_hsl(var(--brand))]"
                  style={{ width: `${studentPct}%` }}
                />
              </div>
              {studentPct >= 80 && (
                <p className="mt-2 text-xs text-gold">You&rsquo;re nearing your tier cap — consider upgrading.</p>
              )}
            </div>
          )}
        </div>

        {/* Content snapshot */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-display text-xl text-luxe">Content</h2>
          <dl className="mt-6 space-y-4">
            <Row label="Total courses" value={String(data.courses)} />
            <Row label="Published" value={String(data.published)} />
            <Row label="Drafts" value={String(data.courses - data.published)} />
          </dl>
          <div className="mt-6 rounded-xl border border-white/8 bg-white/[0.02] p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-gold" />
              No platform fee on course sales.
            </div>
          </div>
        </div>
      </div>
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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-lg text-foreground">{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="font-display text-foreground">{value}</dd>
    </div>
  );
}
