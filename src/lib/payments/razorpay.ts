// ============================================================================
//  Razorpay adapter
// ----------------------------------------------------------------------------
//  Uses the REST API directly (no SDK dependency). Auth is HTTP Basic with the
//  tenant's own keyId:keySecret. Signature verification is HMAC-SHA256.
// ============================================================================

import crypto from "crypto";
import type { GatewayAdapter, CreatedOrder } from "./types";

export function razorpayAdapter(creds: {
  keyId: string;
  keySecret: string;
  webhookSecret?: string | null;
}): GatewayAdapter {
  return {
    provider: "RAZORPAY",
    keyId: creds.keyId,

    async createOrder(input): Promise<CreatedOrder> {
      const auth = Buffer.from(`${creds.keyId}:${creds.keySecret}`).toString("base64");
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
        body: JSON.stringify({
          amount: input.amount,
          currency: input.currency,
          receipt: input.receipt,
          notes: input.notes ?? {},
          payment_capture: 1,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Razorpay order failed (${res.status}): ${text.slice(0, 200)}`);
      }
      const data = (await res.json()) as { id: string; amount: number; currency: string };
      return { orderId: data.id, amount: data.amount, currency: data.currency };
    },

    verifyCheckoutSignature({ orderId, paymentId, signature }) {
      const expected = crypto
        .createHmac("sha256", creds.keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");
      return timingSafeEqualHex(expected, signature);
    },

    verifyWebhookSignature(rawBody, signature) {
      if (!creds.webhookSecret) return false;
      const expected = crypto
        .createHmac("sha256", creds.webhookSecret)
        .update(rawBody)
        .digest("hex");
      return timingSafeEqualHex(expected, signature);
    },
  };
}

function timingSafeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
