// ============================================================================
//  Payment provider abstraction
// ----------------------------------------------------------------------------
//  Each tenant brings its own gateway keys. A provider adapter knows how to
//  create an order, verify a client-side checkout signature, and verify a
//  webhook signature. Money settles to the tenant's own account — the platform
//  never touches it.
// ============================================================================

import type { PaymentGateway } from "@prisma/client";

export type CreatedOrder = {
  orderId: string;
  amount: number; // in the smallest unit (paise for INR)
  currency: string;
};

export type CheckoutConfig = {
  provider: PaymentGateway;
  keyId: string; // publishable id, safe to send to the client
  orderId: string;
  amount: number; // smallest unit
  currency: string;
};

export interface GatewayAdapter {
  provider: PaymentGateway;
  keyId: string;

  /** Create an order on the gateway. amount is in the smallest unit (paise). */
  createOrder(input: {
    amount: number;
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<CreatedOrder>;

  /** Verify the signature returned by the client checkout widget. */
  verifyCheckoutSignature(input: {
    orderId: string;
    paymentId: string;
    signature: string;
  }): boolean;

  /** Verify a webhook payload signature (raw body + header signature). */
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
}
