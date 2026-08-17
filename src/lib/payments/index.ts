// ============================================================================
//  Gateway loader — turn a tenant's stored credentials into an adapter
// ============================================================================

import { withTenant } from "@/lib/db";
import { decryptSecret } from "@/lib/crypto";
import { razorpayAdapter } from "./razorpay";
import type { GatewayAdapter } from "./types";
import type { PaymentGateway } from "@prisma/client";

function buildAdapter(cred: {
  provider: PaymentGateway;
  keyId: string;
  keySecretEnc: string;
  webhookSecretEnc: string | null;
}): GatewayAdapter {
  const keyId = decryptSecret(cred.keyId);
  const keySecret = decryptSecret(cred.keySecretEnc);
  const webhookSecret = cred.webhookSecretEnc ? decryptSecret(cred.webhookSecretEnc) : null;

  switch (cred.provider) {
    case "RAZORPAY":
      return razorpayAdapter({ keyId, keySecret, webhookSecret });
    case "CASHFREE":
    case "STRIPE":
      throw new Error(`${cred.provider} is not implemented yet — use Razorpay.`);
    default:
      throw new Error(`Unknown gateway ${cred.provider}`);
  }
}

/** The tenant's active gateway adapter, or null if none is configured. */
export async function getActiveGateway(tenantId: string): Promise<GatewayAdapter | null> {
  const cred = await withTenant(tenantId, (tx) =>
    tx.gatewayCredential.findFirst({ where: { active: true }, orderBy: { updatedAt: "desc" } })
  );
  if (!cred) return null;
  return buildAdapter(cred);
}

/** Adapter for a specific provider (used by that provider's webhook route). */
export async function getGatewayForProvider(
  tenantId: string,
  provider: PaymentGateway
): Promise<GatewayAdapter | null> {
  const cred = await withTenant(tenantId, (tx) =>
    tx.gatewayCredential.findUnique({ where: { tenantId_provider: { tenantId, provider } } })
  );
  if (!cred) return null;
  return buildAdapter(cred);
}
