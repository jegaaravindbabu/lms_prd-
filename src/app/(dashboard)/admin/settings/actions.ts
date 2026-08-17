"use server";

import { revalidatePath } from "next/cache";
import { withTenant } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import type { PaymentGateway } from "@prisma/client";

async function ownerUser() {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") return null;
  return user;
}

/** Save (create/replace) the tenant's gateway credentials, encrypted at rest. */
export async function saveGatewayCredential(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await ownerUser();
  if (!user) return { ok: false, error: "Only the owner can manage payment settings." };

  const provider = String(formData.get("provider") ?? "RAZORPAY") as PaymentGateway;
  const keyId = String(formData.get("keyId") ?? "").trim();
  const keySecret = String(formData.get("keySecret") ?? "").trim();
  const webhookSecret = String(formData.get("webhookSecret") ?? "").trim();
  const isLive = formData.get("isLive") === "on";

  if (!keyId || !keySecret) return { ok: false, error: "Key ID and Key Secret are required." };

  try {
    await withTenant(user.tenantId, (tx) =>
      tx.gatewayCredential.upsert({
        where: { tenantId_provider: { tenantId: user.tenantId, provider } },
        update: {
          keyId: encryptSecret(keyId),
          keySecretEnc: encryptSecret(keySecret),
          webhookSecretEnc: webhookSecret ? encryptSecret(webhookSecret) : null,
          isLive,
          active: true,
        },
        create: {
          tenantId: user.tenantId,
          provider,
          keyId: encryptSecret(keyId),
          keySecretEnc: encryptSecret(keySecret),
          webhookSecretEnc: webhookSecret ? encryptSecret(webhookSecret) : null,
          isLive,
          active: true,
        },
      })
    );
  } catch (e) {
    return { ok: false, error: "Could not save. Is CREDENTIAL_ENC_KEY set in the environment?" };
  }

  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function setGatewayActive(provider: PaymentGateway, active: boolean): Promise<{ ok: boolean }> {
  const user = await ownerUser();
  if (!user) return { ok: false };
  await withTenant(user.tenantId, (tx) =>
    tx.gatewayCredential.update({ where: { tenantId_provider: { tenantId: user.tenantId, provider } }, data: { active } })
  );
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function deleteGatewayCredential(provider: PaymentGateway): Promise<{ ok: boolean }> {
  const user = await ownerUser();
  if (!user) return { ok: false };
  await withTenant(user.tenantId, (tx) =>
    tx.gatewayCredential.delete({ where: { tenantId_provider: { tenantId: user.tenantId, provider } } })
  );
  revalidatePath("/admin/settings");
  return { ok: true };
}
