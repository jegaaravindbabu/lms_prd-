import { Sparkles } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { getTenant } from "@/lib/tenant";
import { withTenant } from "@/lib/db";
import { CouponManager, type CouponRow } from "@/components/admin/coupon-manager";

export const metadata = { title: "Coupons" };

export default async function CouponsPage() {
  const user = await requireRole(["OWNER", "ADMIN"]);
  const tenant = await getTenant();

  const { coupons, courses } = await withTenant(user.tenantId, async (tx) => {
    const coupons = await tx.coupon.findMany({
      orderBy: { createdAt: "desc" },
      include: { course: { select: { title: true } } },
    });
    const courses = await tx.course.findMany({ select: { id: true, title: true }, orderBy: { title: "asc" } });
    return { coupons, courses };
  });

  const rows: CouponRow[] = coupons.map((c) => ({
    id: c.id,
    code: c.code,
    discountType: c.discountType,
    discountValue: String(c.discountValue),
    courseTitle: c.course?.title ?? null,
    maxRedemptions: c.maxRedemptions,
    timesRedeemed: c.timesRedeemed,
    active: c.active,
    validTill: c.validTill ? c.validTill.toISOString() : null,
  }));

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <span className="eyebrow"><Sparkles className="size-3.5 text-gold" /> Promotions</span>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-luxe">Coupons</h1>
        <p className="mt-2 text-muted-foreground">Create discount codes students can apply at checkout.</p>
      </div>

      <CouponManager coupons={rows} courses={courses} currency={tenant ? "INR" : "INR"} />
    </div>
  );
}
