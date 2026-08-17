// ============================================================================
//  Payment settlement (shared by the client confirm action AND the webhook)
// ----------------------------------------------------------------------------
//  NOT a server action — a plain server-side helper, so it is never exposed as
//  a callable endpoint. Idempotent: safe to run twice for the same order.
// ============================================================================

import { withTenant } from "@/lib/db";

export async function settlePayment(
  tenantId: string,
  gatewayOrderId: string,
  gatewayPaymentId?: string
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { tenantId_gatewayOrderId: { tenantId, gatewayOrderId } },
    });
    if (!payment || payment.status === "PAID") return; // idempotent

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        gatewayPaymentId: gatewayPaymentId ?? payment.gatewayPaymentId,
      },
    });

    await tx.enrollment.upsert({
      where: { tenantId_userId_courseId: { tenantId, userId: payment.userId, courseId: payment.courseId } },
      update: { status: "ACTIVE" },
      create: { tenantId, userId: payment.userId, courseId: payment.courseId, status: "ACTIVE", source: "purchase" },
    });

    if (payment.couponId) {
      await tx.coupon.update({ where: { id: payment.couponId }, data: { timesRedeemed: { increment: 1 } } });
    }
  });
}
