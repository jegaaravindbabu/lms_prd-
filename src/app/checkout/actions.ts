"use server";

import { revalidatePath } from "next/cache";
import { withTenant } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getActiveGateway, getGatewayForProvider } from "@/lib/payments";
import { settlePayment } from "@/lib/payments/settle";
import { quoteCourse, COUPON_MESSAGE } from "@/lib/pricing";

export type CheckoutStart =
  | { ok: true; free: true; slug: string }
  | {
      ok: true;
      free: false;
      keyId: string;
      orderId: string;
      amount: number; // paise
      currency: string;
      paymentId: string;
      prefill: { name: string; contact: string };
      courseTitle: string;
    }
  | { ok: false; error: string };

/** Preview a coupon for a course (live discount in the UI). */
export async function previewCoupon(
  courseId: string,
  code: string
): Promise<{ ok: boolean; total?: number; discount?: number; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const course = await withTenant(user.tenantId, (tx) => tx.course.findUnique({ where: { id: courseId } }));
  if (!course) return { ok: false, error: "Course not found." };

  const { quote, error } = await quoteCourse(user.tenantId, course, code);
  if (error) return { ok: false, error: COUPON_MESSAGE[error] };
  return { ok: true, total: quote!.total, discount: quote!.discount };
}

/** Start checkout: create the gateway order + a CREATED Payment. */
export async function startCheckout(courseId: string, couponCode?: string | null): Promise<CheckoutStart> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in first." };

  const course = await withTenant(user.tenantId, (tx) => tx.course.findUnique({ where: { id: courseId } }));
  if (!course || course.status !== "PUBLISHED") return { ok: false, error: "Course not available." };

  const { quote, error } = await quoteCourse(user.tenantId, course, couponCode);
  if (error) return { ok: false, error: COUPON_MESSAGE[error] };

  // Free (or fully discounted) → enroll immediately, no gateway needed.
  if (quote!.total <= 0) {
    await grantEnrollment(user.tenantId, user.id, course.id, "free", quote!.couponId);
    revalidatePath(`/courses/${course.slug}`);
    return { ok: true, free: true, slug: course.slug };
  }

  const gateway = await getActiveGateway(user.tenantId);
  if (!gateway) {
    return { ok: false, error: "This school hasn't finished setting up payments yet. Please check back soon." };
  }

  const amountPaise = Math.round(quote!.total * 100);
  let order;
  try {
    order = await gateway.createOrder({
      amount: amountPaise,
      currency: quote!.currency,
      receipt: `c_${course.id.slice(0, 8)}_${user.id.slice(0, 8)}`,
      notes: { tenantId: user.tenantId, courseId: course.id, userId: user.id, couponId: quote!.couponId ?? "" },
    });
  } catch (e) {
    return { ok: false, error: "Could not start payment. Please try again." };
  }

  await withTenant(user.tenantId, (tx) =>
    tx.payment.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        courseId: course.id,
        amount: quote!.total,
        currency: quote!.currency,
        gateway: gateway.provider,
        gatewayOrderId: order.orderId,
        status: "CREATED",
        couponId: quote!.couponId ?? undefined,
      },
    })
  );

  return {
    ok: true,
    free: false,
    keyId: gateway.keyId,
    orderId: order.orderId,
    amount: order.amount,
    currency: order.currency,
    paymentId: order.orderId,
    prefill: { name: user.name ?? "", contact: user.phone },
    courseTitle: course.title,
  };
}

/** Verify the client checkout signature, mark paid, and enroll. Idempotent. */
export async function confirmPayment(input: {
  orderId: string;
  razorpayPaymentId: string;
  signature: string;
}): Promise<{ ok: boolean; slug?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please sign in." };

  const payment = await withTenant(user.tenantId, (tx) =>
    tx.payment.findUnique({ where: { tenantId_gatewayOrderId: { tenantId: user.tenantId, gatewayOrderId: input.orderId } } })
  );
  if (!payment || payment.userId !== user.id) return { ok: false, error: "Payment not found." };

  const course = await withTenant(user.tenantId, (tx) => tx.course.findUnique({ where: { id: payment.courseId } }));

  // Already reconciled (e.g. webhook beat us here) — succeed idempotently.
  if (payment.status === "PAID") return { ok: true, slug: course?.slug };

  const gateway = await getGatewayForProvider(user.tenantId, payment.gateway);
  if (!gateway) return { ok: false, error: "Gateway unavailable." };

  const valid = gateway.verifyCheckoutSignature({
    orderId: input.orderId,
    paymentId: input.razorpayPaymentId,
    signature: input.signature,
  });

  if (!valid) {
    await withTenant(user.tenantId, (tx) =>
      tx.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } })
    );
    return { ok: false, error: "Payment could not be verified." };
  }

  await settlePayment(user.tenantId, input.orderId, input.razorpayPaymentId);
  revalidatePath(`/courses/${course?.slug}`);
  revalidatePath("/dashboard");
  return { ok: true, slug: course?.slug };
}

async function grantEnrollment(
  tenantId: string,
  userId: string,
  courseId: string,
  source: string,
  couponId?: string | null
) {
  await withTenant(tenantId, async (tx) => {
    await tx.enrollment.upsert({
      where: { tenantId_userId_courseId: { tenantId, userId, courseId } },
      update: { status: "ACTIVE" },
      create: { tenantId, userId, courseId, status: "ACTIVE", source },
    });
    if (couponId) {
      await tx.coupon.update({ where: { id: couponId }, data: { timesRedeemed: { increment: 1 } } });
    }
  });
}
