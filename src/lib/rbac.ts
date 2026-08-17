// ============================================================================
//  RBAC — role checks layered on top of RLS
// ----------------------------------------------------------------------------
//  RLS guarantees you can only SEE your school's rows. These helpers decide
//  what a member may DO with them, based on their Membership.role.
// ============================================================================

import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { getCurrentUser, type CurrentUser } from "@/lib/auth";

export const STAFF_ROLES: Role[] = ["OWNER", "ADMIN", "INSTRUCTOR", "SUPPORT"];
export const CONTENT_ROLES: Role[] = ["OWNER", "ADMIN", "INSTRUCTOR"];
export const BILLING_ROLES: Role[] = ["OWNER"];

export function can(user: CurrentUser | null, roles: Role[]): boolean {
  return !!user && roles.includes(user.role);
}

/** Require an authenticated member; redirect to /login otherwise. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Require one of the given roles; redirect if unauthorized. */
export async function requireRole(roles: Role[]): Promise<CurrentUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}
