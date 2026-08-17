"use server";

import { revalidatePath } from "next/cache";
import { prismaAdmin } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generateDomainToken, isValidDomain, normalizeDomain, verifyDomainToken } from "@/lib/domain";

async function ownerUser() {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") return null;
  return user;
}

// Tenant is the platform anchor table (not RLS-scoped), so domain writes use
// the admin client with an explicit id filter for the owner's own tenant.
export async function setCustomDomain(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await ownerUser();
  if (!user) return { ok: false, error: "Only the owner can manage the domain." };

  const domain = normalizeDomain(String(formData.get("domain") ?? ""));
  if (!isValidDomain(domain)) return { ok: false, error: "Enter a valid domain, e.g. learn.yourschool.com" };

  // Reject if another tenant already owns this domain.
  const taken = await prismaAdmin.tenant.findFirst({
    where: { customDomain: domain, NOT: { id: user.tenantId } },
    select: { id: true },
  });
  if (taken) return { ok: false, error: "That domain is already connected to another school." };

  await prismaAdmin.tenant.update({
    where: { id: user.tenantId },
    data: { customDomain: domain, customDomainToken: generateDomainToken(), domainStatus: "PENDING" },
  });

  revalidatePath("/admin/domain");
  return { ok: true };
}

export async function verifyCustomDomain(): Promise<{ ok: boolean; status?: string; error?: string }> {
  const user = await ownerUser();
  if (!user) return { ok: false, error: "Not authorized." };

  const tenant = await prismaAdmin.tenant.findUnique({
    where: { id: user.tenantId },
    select: { customDomain: true, customDomainToken: true },
  });
  if (!tenant?.customDomain || !tenant.customDomainToken) {
    return { ok: false, error: "Add a domain first." };
  }

  await prismaAdmin.tenant.update({ where: { id: user.tenantId }, data: { domainStatus: "VERIFYING" } });

  const verified = await verifyDomainToken(tenant.customDomain, tenant.customDomainToken);
  const status = verified ? "ACTIVE" : "ERROR";
  await prismaAdmin.tenant.update({ where: { id: user.tenantId }, data: { domainStatus: status } });

  revalidatePath("/admin/domain");
  return verified
    ? { ok: true, status }
    : { ok: false, status, error: "We couldn't find the TXT record yet. DNS can take a few minutes — try again shortly." };
}

export async function removeCustomDomain(): Promise<{ ok: boolean }> {
  const user = await ownerUser();
  if (!user) return { ok: false };
  await prismaAdmin.tenant.update({
    where: { id: user.tenantId },
    data: { customDomain: null, customDomainToken: null, domainStatus: "PENDING" },
  });
  revalidatePath("/admin/domain");
  return { ok: true };
}
