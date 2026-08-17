"use server";

import { getTenant } from "@/lib/tenant";
import { requestOtp, verifyOtp } from "@/lib/otp";
import { createSession, upsertUserByPhone, ensureMembership } from "@/lib/auth";

export type ActionState = { ok: boolean; error?: string; step?: "otp" };

function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+") && digits.length >= 11) return digits;
  if (digits.length === 10) return `+91${digits}`; // default India
  if (digits.length >= 11) return `+${digits.replace(/^\+/, "")}`;
  return null;
}

export async function requestOtpAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const tenant = await getTenant();
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  if (!phone) return { ok: false, error: "Enter a valid phone number." };

  await requestOtp(phone, "LOGIN", tenant?.id ?? null);
  return { ok: true, step: "otp" };
}

export async function verifyOtpAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const tenant = await getTenant();
  if (!tenant) return { ok: false, error: "No school context for this domain." };

  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const code = String(formData.get("code") ?? "").trim();
  if (!phone) return { ok: false, error: "Enter a valid phone number.", step: "otp" };

  const valid = await verifyOtp(phone, code);
  if (!valid) return { ok: false, error: "Incorrect or expired code.", step: "otp" };

  // Global identity; grant STUDENT access to this school if new here.
  const user = await upsertUserByPhone(phone);
  await ensureMembership(user.id, tenant.id);
  await createSession({ userId: user.id, tenantId: tenant.id, phone });

  return { ok: true };
}
