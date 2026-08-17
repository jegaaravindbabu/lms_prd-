// ============================================================================
//  Tenant resolution
// ----------------------------------------------------------------------------
//  Resolve the current school (Tenant) from the request hostname:
//    subdomain "physicswala.yourplatform.com" -> Tenant.subdomain
//    custom    "learn.physicswala.com"         -> Tenant.customDomain
//
//  This is a GLOBAL, cross-tenant lookup, so it uses the BYPASSRLS admin
//  client. Results are cached per-request via React cache().
// ============================================================================

import { cache } from "react";
import { headers, cookies } from "next/headers";
import { prismaAdmin } from "@/lib/db";

const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "lvh.me:3000")
  .replace(/^https?:\/\//, "")
  .toLowerCase();

export type ResolvedTenant = {
  id: string;
  name: string;
  subdomain: string;
  status: "PENDING" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
  logoUrl: string | null;
  faviconUrl: string | null;
  heroUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
};

/** Strip port, extract the subdomain label relative to the platform root. */
export function subdomainFromHost(host: string): string | null {
  const clean = host.split(":")[0].toLowerCase();
  const root = ROOT_DOMAIN.split(":")[0].toLowerCase();

  if (clean === root || clean === `www.${root}`) return null;
  if (clean.endsWith(`.${root}`)) {
    const label = clean.slice(0, -1 * (root.length + 1));
    return label || null;
  }
  return null; // not a subdomain of the root -> treat as a custom domain
}

async function lookup(host: string): Promise<ResolvedTenant | null> {
  const sub = subdomainFromHost(host);

  // Demo mode: on a bare host (no subdomain), a `demo_tenant` cookie picks the
  // school, so the whole platform is demoable from one URL with a switcher.
  const demoCookie = !sub ? cookies().get("demo_tenant")?.value : undefined;

  const where = sub
    ? { subdomain: sub }
    : demoCookie
      ? { subdomain: demoCookie }
      // A custom domain only routes once its ownership is verified (ACTIVE).
      : { customDomain: host.split(":")[0].toLowerCase(), domainStatus: "ACTIVE" as const };

  const tenant = await prismaAdmin.tenant.findFirst({
    where,
    select: {
      id: true,
      name: true,
      subdomain: true,
      status: true,
      logoUrl: true,
      faviconUrl: true,
      heroUrl: true,
      primaryColor: true,
      secondaryColor: true,
    },
  });
  return tenant as ResolvedTenant | null;
}

/** Resolve the tenant for the current request (cached). Null if none matches. */
export const getTenant = cache(async (): Promise<ResolvedTenant | null> => {
  const host = headers().get("x-tenant-host") ?? headers().get("host") ?? "";
  if (!host) return null;
  return lookup(host);
});

/** Like getTenant but throws if no ACTIVE tenant is resolved. */
export async function requireTenant(): Promise<ResolvedTenant> {
  const tenant = await getTenant();
  if (!tenant) throw new Error("No tenant resolved for this host.");
  return tenant;
}
