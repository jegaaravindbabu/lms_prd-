"use server";

import { revalidatePath } from "next/cache";
import { withTenant } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { DiscountType } from "@prisma/client";

async function adminUser() {
  const user = await getCurrentUser();
  if (!user || !["OWNER", "ADMIN"].includes(user.role)) return null;
  return user;
}

export async function createCoupon(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await adminUser();
  if (!user) return { ok: false, error: "Not authorized." };

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const discountType = String(formData.get("discountType") ?? "PERCENT") as DiscountType;
  const discountValue = Number(String(formData.get("discountValue") ?? "0").replace(/[^0-9.]/g, ""));
  const courseId = String(formData.get("courseId") ?? "").trim() || null;
  const maxRedemptionsRaw = String(formData.get("maxRedemptions") ?? "").trim();
  const validTillRaw = String(formData.get("validTill") ?? "").trim();

  if (!code) return { ok: false, error: "Enter a coupon code." };
  if (!discountValue || discountValue <= 0) return { ok: false, error: "Enter a discount value." };
  if (discountType === "PERCENT" && discountValue > 100) return { ok: false, error: "Percent can't exceed 100." };

  try {
    await withTenant(user.tenantId, async (tx) => {
      const exists = await tx.coupon.findUnique({ where: { tenantId_code: { tenantId: user.tenantId, code } } });
      if (exists) throw new Error("duplicate");
      await tx.coupon.create({
        data: {
          tenantId: user.tenantId,
          code,
          discountType,
          discountValue,
          courseId,
          maxRedemptions: maxRedemptionsRaw ? Number(maxRedemptionsRaw) : null,
          validTill: validTillRaw ? new Date(validTillRaw) : null,
          active: true,
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "duplicate") return { ok: false, error: "That code already exists." };
    return { ok: false, error: "Could not create coupon." };
  }

  revalidatePath("/admin/coupons");
  return { ok: true };
}

export async function toggleCoupon(id: string, active: boolean): Promise<{ ok: boolean }> {
  const user = await adminUser();
  if (!user) return { ok: false };
  await withTenant(user.tenantId, (tx) => tx.coupon.update({ where: { id }, data: { active } }));
  revalidatePath("/admin/coupons");
  return { ok: true };
}

export async function deleteCoupon(id: string): Promise<{ ok: boolean }> {
  const user = await adminUser();
  if (!user) return { ok: false };
  await withTenant(user.tenantId, (tx) => tx.coupon.delete({ where: { id } }));
  revalidatePath("/admin/coupons");
  return { ok: true };
}
