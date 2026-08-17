// ============================================================================
//  OTP — one-time password issuance & verification
// ----------------------------------------------------------------------------
//  Codes are stored HASHED in OtpChallenge (never plaintext). In dev
//  (OTP_MODE=console) the code is printed to the server log. Swap `deliver()`
//  for a real SMS provider (Twilio / MSG91 / etc.) in production.
//
//  OtpChallenge is intentionally OUTSIDE RLS (see rls.sql), so we query it via
//  the admin client and scope explicitly by phone.
// ============================================================================

import crypto from "crypto";
import { prismaAdmin } from "@/lib/db";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 5;

function hashCode(code: string, phone: string) {
  const secret = process.env.AUTH_SECRET ?? "dev-secret";
  return crypto.createHmac("sha256", secret).update(`${phone}:${code}`).digest("hex");
}

function generateCode(): string {
  // 6-digit numeric, cryptographically random.
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

async function deliver(phone: string, code: string) {
  const mode = process.env.OTP_MODE ?? "console";
  if (mode === "console" || mode === "demo") {
    console.log(`\n📲  OTP for ${phone}: ${code}  (valid 5 min)\n`);
    return;
  }
  // TODO: integrate a real SMS provider here.
  throw new Error(`OTP_MODE "${mode}" not implemented — add an SMS provider.`);
}

/**
 * Create + send an OTP challenge. Returns the code so callers can surface it
 * on-screen in demo mode (OTP_MODE=demo) — never do this with real SMS.
 */
export async function requestOtp(
  phone: string,
  purpose: "LOGIN" | "SIGNUP" = "LOGIN",
  tenantId?: string | null
): Promise<{ demoCode?: string }> {
  const code = generateCode();
  await prismaAdmin.otpChallenge.create({
    data: {
      phone,
      tenantId: tenantId ?? null,
      codeHash: hashCode(code, phone),
      purpose,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });
  await deliver(phone, code);
  return process.env.OTP_MODE === "demo" ? { demoCode: code } : {};
}

/** Verify the latest active OTP challenge for a phone. Returns true on success. */
export async function verifyOtp(phone: string, code: string): Promise<boolean> {
  const challenge = await prismaAdmin.otpChallenge.findFirst({
    where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!challenge) return false;

  if (challenge.attempts >= MAX_ATTEMPTS) return false;

  const ok = challenge.codeHash === hashCode(code, phone);

  await prismaAdmin.otpChallenge.update({
    where: { id: challenge.id },
    data: ok ? { consumedAt: new Date() } : { attempts: { increment: 1 } },
  });

  return ok;
}
