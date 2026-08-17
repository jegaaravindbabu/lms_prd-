"use server";

import { revalidatePath } from "next/cache";
import { prismaAdmin } from "@/lib/db";
import { getPlatformAdmin } from "@/lib/platform";
import type { AmcTier, LicenseStatus, TenantStatus } from "@prisma/client";

const YEAR_MS = 365 * 864e5;

const TIER_CAPS: Record<AmcTier, { capStudents: number; capStorageMb: number }> = {
  STARTER: { capStudents: 1000, capStorageMb: 5120 },
  GROWTH: { capStudents: 5000, capStorageMb: 20480 },
  INSTITUTE: { capStudents: 20000, capStorageMb: 102400 },
};

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").slice(0, 40);
}
function normalizePhone(raw: string): string | null {
  const d = raw.replace(/[^\d+]/g, "");
  if (d.startsWith("+") && d.length >= 11) return d;
  if (d.length === 10) return `+91${d}`;
  if (d.length >= 11) return `+${d.replace(/^\+/, "")}`;
  return null;
}
function money(v: FormDataEntryValue | null) {
  return Number(String(v ?? "0").replace(/[^0-9.]/g, "")) || 0;
}

export async function provisionSchool(formData: FormData): Promise<{ ok: boolean; error?: string; id?: string }> {
  const admin = await getPlatformAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const name = String(formData.get("name") ?? "").trim();
  const subInput = String(formData.get("subdomain") ?? "").trim();
  const ownerPhone = normalizePhone(String(formData.get("ownerPhone") ?? ""));
  const ownerName = String(formData.get("ownerName") ?? "").trim() || null;
  const tier = (String(formData.get("amcTier") ?? "STARTER") as AmcTier);
  const oneTimeFee = money(formData.get("oneTimeFee"));
  const amcAmount = money(formData.get("amcAmount"));

  if (!name) return { ok: false, error: "School name is required." };
  if (!ownerPhone) return { ok: false, error: "A valid owner phone is required." };

  const subdomain = slugify(subInput || name);
  if (!subdomain) return { ok: false, error: "Could not derive a subdomain." };

  const clash = await prismaAdmin.tenant.findUnique({ where: { subdomain } });
  if (clash) return { ok: false, error: `Subdomain "${subdomain}" is taken.` };

  const owner = await prismaAdmin.user.upsert({
    where: { phone: ownerPhone },
    update: ownerName ? { name: ownerName } : {},
    create: { phone: ownerPhone, name: ownerName, phoneVerified: true },
  });

  const caps = TIER_CAPS[tier];
  const tenant = await prismaAdmin.tenant.create({
    data: {
      name,
      subdomain,
      status: "ACTIVE",
      ownerId: owner.id,
      memberships: { create: { userId: owner.id, role: "OWNER" } },
      license: {
        create: {
          oneTimeFee,
          amcTier: tier,
          amcAmount,
          amcStartedAt: new Date(),
          amcNextDueAt: new Date(Date.now() + YEAR_MS),
          capStudents: caps.capStudents,
          capStorageMb: caps.capStorageMb,
          status: "ACTIVE",
        },
      },
    },
  });

  revalidatePath("/platform");
  return { ok: true, id: tenant.id };
}

export async function updateLicense(tenantId: string, formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const admin = await getPlatformAdmin();
  if (!admin) return { ok: false, error: "Not authorized." };

  const tier = String(formData.get("amcTier") ?? "STARTER") as AmcTier;
  const status = String(formData.get("licenseStatus") ?? "ACTIVE") as LicenseStatus;
  const oneTimeFee = money(formData.get("oneTimeFee"));
  const amcAmount = money(formData.get("amcAmount"));
  const capStudents = Number(String(formData.get("capStudents") ?? "").replace(/[^0-9]/g, "")) || null;
  const capStorageMb = Number(String(formData.get("capStorageMb") ?? "").replace(/[^0-9]/g, "")) || null;
  const nextDue = String(formData.get("amcNextDueAt") ?? "").trim();

  await prismaAdmin.clientLicense.upsert({
    where: { tenantId },
    update: {
      amcTier: tier, status, oneTimeFee, amcAmount, capStudents, capStorageMb,
      amcNextDueAt: nextDue ? new Date(nextDue) : undefined,
    },
    create: {
      tenantId, amcTier: tier, status, oneTimeFee, amcAmount, capStudents, capStorageMb,
      amcStartedAt: new Date(),
      amcNextDueAt: nextDue ? new Date(nextDue) : new Date(Date.now() + YEAR_MS),
    },
  });

  revalidatePath(`/platform/schools/${tenantId}`);
  revalidatePath("/platform");
  return { ok: true };
}

export async function setTenantStatus(tenantId: string, status: TenantStatus): Promise<{ ok: boolean }> {
  const admin = await getPlatformAdmin();
  if (!admin) return { ok: false };
  await prismaAdmin.tenant.update({ where: { id: tenantId }, data: { status } });
  revalidatePath(`/platform/schools/${tenantId}`);
  revalidatePath("/platform");
  return { ok: true };
}
