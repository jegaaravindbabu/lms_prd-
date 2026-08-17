"use server";

import { requestOtp, verifyOtp } from "@/lib/otp";
import { prismaAdmin } from "@/lib/db";
import { createSession } from "@/lib/auth";

export type PlatformActionState = { ok: boolean; error?: string; step?: "otp"; demoCode?: string };

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+") && digits.length >= 11) return digits;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length >= 11) return `+${digits.replace(/^\+/, "")}`;
  return null;
}

export async function requestPlatformOtp(_prev: PlatformActionState, formData: FormData): Promise<PlatformActionState> {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!phone) return { ok: false, error: "Enter a valid phone number." };

  // Only issue a code to a real platform admin (don't reveal which is which).
  const user = await prismaAdmin.user.findUnique({ where: { phone } });
  if (!user || !user.isPlatformAdmin) {
    return { ok: false, error: "This number isn't a platform administrator." };
  }

  const { demoCode } = await requestOtp(phone, "LOGIN", null);
  return { ok: true, step: "otp", demoCode };
}

export async function verifyPlatformOtp(_prev: PlatformActionState, formData: FormData): Promise<PlatformActionState> {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const code = String(formData.get("code") ?? "").trim();
  if (!phone) return { ok: false, error: "Enter a valid phone number.", step: "otp" };

  const valid = await verifyOtp(phone, code);
  if (!valid) return { ok: false, error: "Incorrect or expired code.", step: "otp" };

  const user = await prismaAdmin.user.findUnique({ where: { phone } });
  if (!user || !user.isPlatformAdmin) return { ok: false, error: "Not a platform administrator." };

  // Platform session: empty tenantId (not scoped to a school).
  await createSession({ userId: user.id, tenantId: "", phone });
  return { ok: true };
}
