// ============================================================================
//  Pricing & coupons
// ----------------------------------------------------------------------------
//  Validates a coupon against a course and computes the final amount. All reads
//  run inside withTenant so RLS keeps coupons scoped to the school.
// ============================================================================

import { withTenant } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export type PriceQuote = {
  base: number;          // course price (rupees)
  discount: number;      // discount amount (rupees)
  total: number;         // amount to charge (rupees)
  couponId: string | null;
  couponCode: string | null;
  currency: string;
};

export type CouponError =
  | "not_found" | "inactive" | "expired" | "not_started"
  | "exhausted" | "wrong_course";

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Compute a quote for a course, optionally applying a coupon code. */
export async function quoteCourse(
  tenantId: string,
  course: { id: string; price: Prisma.Decimal | number | string; currency: string; isFree: boolean },
  couponCode?: string | null
): Promise<{ quote?: PriceQuote; error?: CouponError }> {
  const base = course.isFree ? 0 : Number(course.price);
  const currency = course.currency;

  if (!couponCode || course.isFree) {
    return { quote: { base, discount: 0, total: base, couponId: null, couponCode: null, currency } };
  }

  const code = couponCode.trim().toUpperCase();
  const coupon = await withTenant(tenantId, (tx) =>
    tx.coupon.findUnique({ where: { tenantId_code: { tenantId, code } } })
  );

  if (!coupon) return { error: "not_found" };
  if (!coupon.active) return { error: "inactive" };
  const now = new Date();
  if (coupon.validFrom && coupon.validFrom > now) return { error: "not_started" };
  if (coupon.validTill && coupon.validTill < now) return { error: "expired" };
  if (coupon.maxRedemptions != null && coupon.timesRedeemed >= coupon.maxRedemptions) return { error: "exhausted" };
  if (coupon.courseId && coupon.courseId !== course.id) return { error: "wrong_course" };

  let discount = 0;
  if (coupon.discountType === "PERCENT") {
    discount = round2((base * Number(coupon.discountValue)) / 100);
  } else {
    discount = Number(coupon.discountValue);
  }
  discount = Math.min(discount, base);
  const total = round2(base - discount);

  return {
    quote: { base, discount, total, couponId: coupon.id, couponCode: code, currency },
  };
}

export const COUPON_MESSAGE: Record<CouponError, string> = {
  not_found: "That code isn't valid.",
  inactive: "That coupon is no longer active.",
  expired: "That coupon has expired.",
  not_started: "That coupon isn't active yet.",
  exhausted: "That coupon has been fully redeemed.",
  wrong_course: "That coupon doesn't apply to this course.",
};
