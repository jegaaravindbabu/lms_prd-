// ============================================================================
//  Platform admin (you) — cross-tenant, independent of any Membership.
// ----------------------------------------------------------------------------
//  The platform console operates across ALL schools using the BYPASSRLS admin
//  client. Access is gated purely by User.isPlatformAdmin. A platform session
//  carries an empty tenantId (platform admins aren't scoped to one school).
// ============================================================================

import { redirect } from "next/navigation";
import { prismaAdmin } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { User } from "@prisma/client";

export async function getPlatformAdmin(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await prismaAdmin.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.isPlatformAdmin) return null;
  return user;
}

export async function requirePlatformAdmin(): Promise<User> {
  const admin = await getPlatformAdmin();
  if (!admin) redirect("/platform/login");
  return admin;
}
