// ============================================================================
//  Auth — session (JWT cookie) + identity helpers
// ----------------------------------------------------------------------------
//  Identity is GLOBAL (one phone = one User). A session carries the userId and
//  the tenant the user is currently acting in; the effective Role is read from
//  the Membership row for (userId, tenantId).
//
//  User / RefreshToken / Device sit OUTSIDE RLS, so we look them up by exact
//  key via the admin client. Membership IS under RLS and is read via withTenant.
// ============================================================================

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { prismaAdmin, withTenant } from "@/lib/db";
import type { Role } from "@prisma/client";

const COOKIE = "lms_session";
const alg = "HS256";

function key() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export type Session = {
  userId: string;
  tenantId: string;
  phone: string;
};

/** Issue a signed session cookie for a user acting inside a tenant. */
export async function createSession(session: Session) {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(key());

  cookies().set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  cookies().delete(COOKIE);
}

/** Read + verify the current session cookie. Null if absent/invalid. */
export async function getSession(): Promise<Session | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return { userId: payload.userId as string, tenantId: payload.tenantId as string, phone: payload.phone as string };
  } catch {
    return null;
  }
}

export type CurrentUser = {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  avatarUrl: string | null;
  tenantId: string;
  role: Role;
  isPlatformAdmin: boolean;
};

/**
 * Resolve the full current user for the active tenant, including their Role
 * from Membership. Returns null if not authenticated or not a member of the
 * tenant they are trying to act in.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session) return null;

  // User lives outside RLS -> admin client, exact-key lookup.
  const user = await prismaAdmin.user.findUnique({ where: { id: session.userId } });
  if (!user) return null;

  // Membership IS under RLS -> read within the tenant context.
  const membership = await withTenant(session.tenantId, (tx) =>
    tx.membership.findUnique({
      where: { userId_tenantId: { userId: session.userId, tenantId: session.tenantId } },
    })
  );
  if (!membership) return null;

  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    email: user.email,
    avatarUrl: user.avatarUrl,
    tenantId: session.tenantId,
    role: membership.role,
    isPlatformAdmin: user.isPlatformAdmin,
  };
}

/** Find-or-create a global User by phone (used after OTP verification). */
export async function upsertUserByPhone(phone: string) {
  return prismaAdmin.user.upsert({
    where: { phone },
    update: { phoneVerified: true },
    create: { phone, phoneVerified: true },
  });
}

/** Ensure the user has (at least) STUDENT access to a tenant. */
export async function ensureMembership(userId: string, tenantId: string) {
  await withTenant(tenantId, (tx) =>
    tx.membership.upsert({
      where: { userId_tenantId: { userId, tenantId } },
      update: {},
      create: { userId, tenantId, role: "STUDENT" },
    })
  );
}
