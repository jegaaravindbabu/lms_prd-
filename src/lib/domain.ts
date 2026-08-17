// ============================================================================
//  Custom domain verification
// ----------------------------------------------------------------------------
//  A school proves it owns a custom domain by adding a DNS TXT record with a
//  token we generate. We verify by resolving that record server-side. Routing
//  to a custom domain is only enabled once DomainStatus = ACTIVE.
// ============================================================================

import crypto from "crypto";
import dns from "dns/promises";

/** The TXT record host a school must add: _lms-verify.<their-domain>. */
export const VERIFY_PREFIX = "_lms-verify";

export function generateDomainToken(): string {
  return `lms-verify-${crypto.randomBytes(16).toString("hex")}`;
}

/** Basic hostname sanity check (e.g. learn.physicswala.com). */
export function isValidDomain(domain: string): boolean {
  const d = domain.trim().toLowerCase();
  if (d.length < 4 || d.length > 253) return false;
  if (d.includes("/") || d.includes(" ") || d.startsWith("http")) return false;
  return /^(?=.{1,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(d);
}

export function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
}

/** Resolve the TXT record and check it contains the token. */
export async function verifyDomainToken(domain: string, token: string): Promise<boolean> {
  const host = `${VERIFY_PREFIX}.${domain}`;
  try {
    const records = await dns.resolveTxt(host);
    // records: string[][] — each record can be split into chunks.
    return records.some((chunks) => chunks.join("").trim() === token);
  } catch {
    return false;
  }
}
