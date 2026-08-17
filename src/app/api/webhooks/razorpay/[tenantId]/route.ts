// ============================================================================
//  Razorpay webhook  —  /api/webhooks/razorpay/[tenantId]
// ----------------------------------------------------------------------------
//  Per-tenant URL: each school configures this exact URL (with its tenantId)
//  in its own Razorpay dashboard. We verify the signature with THAT tenant's
//  webhook secret, then reconcile the payment idempotently — so a dropped
//  browser callback never loses an enrollment.
// ============================================================================

import { NextResponse } from "next/server";
import { getGatewayForProvider } from "@/lib/payments";
import { settlePayment } from "@/lib/payments/settle";

export async function POST(req: Request, { params }: { params: { tenantId: string } }) {
  const tenantId = params.tenantId;
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";

  const gateway = await getGatewayForProvider(tenantId, "RAZORPAY");
  if (!gateway) return NextResponse.json({ error: "no gateway" }, { status: 404 });

  if (!signature || !gateway.verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  try {
    if (event.event === "payment.captured" || event.event === "order.paid") {
      const entity = event.payload?.payment?.entity;
      const orderId = entity?.order_id ?? event.payload?.order?.entity?.id;
      const paymentId = entity?.id;
      if (orderId) await settlePayment(tenantId, orderId, paymentId);
    }
  } catch (e) {
    // Swallow to avoid webhook retries storms; the client confirm is a backstop.
    return NextResponse.json({ ok: true, note: "handled with error" });
  }

  return NextResponse.json({ ok: true });
}
