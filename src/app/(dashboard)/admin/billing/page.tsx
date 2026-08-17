import { IndianRupee, Receipt, TrendingUp, Sparkles, ShieldCheck } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { withTenant } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/utils";
import type { PaymentStatus } from "@prisma/client";

export const metadata = { title: "Billing" };

const STATUS_VARIANT: Record<PaymentStatus, "gold" | "muted" | "default"> = {
  PAID: "gold", REFUNDED: "muted", CREATED: "muted", PENDING: "default", FAILED: "muted",
};

export default async function BillingPage() {
  const user = await requireRole(["OWNER"]);

  const { payments, paidSum, paidCount } = await withTenant(user.tenantId, async (tx) => {
    const payments = await tx.payment.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        course: { select: { title: true } },
        user: { select: { name: true, phone: true } },
        coupon: { select: { code: true } },
      },
    });
    const agg = await tx.payment.aggregate({ _sum: { amount: true }, _count: true, where: { status: "PAID" } });
    return { payments, paidSum: Number(agg._sum.amount ?? 0), paidCount: agg._count };
  });

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <span className="eyebrow"><Sparkles className="size-3.5 text-gold" /> Revenue</span>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-luxe">Billing</h1>
        <p className="mt-2 text-muted-foreground">Payments settle directly to your gateway — no platform fee.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi icon={IndianRupee} label="Total revenue" value={formatMoney(paidSum)} />
        <Kpi icon={TrendingUp} label="Successful payments" value={String(paidCount)} />
        <Kpi icon={Receipt} label="All records" value={String(payments.length)} />
      </div>

      <div>
        <h2 className="mb-4 font-display text-xl text-luxe">Recent payments</h2>
        {payments.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center text-muted-foreground">No payments yet.</div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-white/8">
            <div className="hidden bg-white/[0.03] px-5 py-2.5 text-[0.7rem] uppercase tracking-wider text-muted-foreground sm:grid sm:grid-cols-[1fr_1fr_auto_auto_auto] sm:gap-4">
              <span>Course</span><span>Student</span><span>Coupon</span><span className="text-right">Amount</span><span className="text-right">Status</span>
            </div>
            {payments.map((p, i) => (
              <div key={p.id} className={`grid grid-cols-2 gap-2 bg-card/40 px-5 py-3 text-sm sm:grid-cols-[1fr_1fr_auto_auto_auto] sm:items-center sm:gap-4 ${i > 0 ? "border-t border-white/6" : ""}`}>
                <span className="truncate text-foreground">{p.course?.title ?? "—"}</span>
                <span className="truncate text-muted-foreground">{p.user?.name ?? p.user?.phone ?? "—"}</span>
                <span className="text-muted-foreground">{p.coupon?.code ? <Badge variant="muted">{p.coupon.code}</Badge> : "—"}</span>
                <span className="text-right font-display text-foreground">{formatMoney(Number(p.amount), p.currency)}</span>
                <span className="text-right"><Badge variant={STATUS_VARIANT[p.status]}>{p.status}</Badge></span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-gold" />
        These are your records. Funds are captured by your own Razorpay account; the platform never holds or deducts from them.
      </p>
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
