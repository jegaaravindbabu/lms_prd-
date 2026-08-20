// ============================================================================
//  Prisma client + tenant context  (adapted from db-tenant-context.ts)
// ----------------------------------------------------------------------------
//  This is what makes RLS actually fire on every query.
//
//  Pattern: run each tenant operation inside a transaction that first sets
//  `app.current_tenant_id` LOCALLY (transaction-scoped). Safe with connection
//  pooling because set_config(..., true) only lives for the transaction on
//  that one connection — it never leaks to the next request.
// ============================================================================

import { Prisma, PrismaClient } from "@prisma/client";

// Avoid instantiating many clients during dev hot-reload.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaAdmin?: PrismaClient;
};

// Force a sensible `connection_limit` onto a pooled URL, overriding whatever is
// set in the environment. The app client runs interactive transactions, so it
// needs a few connections (on the transaction pooler this is safe); the admin
// client only does simple lookups on the session pooler, so it stays at 1 to
// avoid exhausting the small session-mode client limit.
function withConnLimit(url: string | undefined, limit: number): string | undefined {
  if (!url) return url;
  if (/[?&]connection_limit=\d+/.test(url)) {
    return url.replace(/connection_limit=\d+/, `connection_limit=${limit}`);
  }
  return url + (url.includes("?") ? "&" : "?") + `connection_limit=${limit}`;
}

// App-facing client — connects as the RLS-subject role (DATABASE_URL -> app_user).
// Every tenant query MUST go through `withTenant`.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ datasourceUrl: withConnLimit(process.env.DATABASE_URL, 5) });

// Platform/admin + migrations — connects as the BYPASSRLS role.
// NEVER expose this to tenant-facing request handlers.
export const prismaAdmin =
  globalForPrisma.prismaAdmin ??
  new PrismaClient({ datasourceUrl: withConnLimit(process.env.DATABASE_ADMIN_URL, 1) });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaAdmin = prismaAdmin;
}

/**
 * Run queries scoped to a single tenant. Postgres RLS filters every row to
 * `tenantId = :tenantId`.
 *
 *   const courses = await withTenant(tenantId, (tx) =>
 *     tx.course.findMany({ where: { status: "PUBLISHED" } })
 *   );
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  if (!tenantId) throw new Error("withTenant: tenantId is required");

  return prisma.$transaction(async (tx) => {
    // Downgrade to the RLS-subject role for this transaction only. The app logs
    // in as a privileged/pooler-friendly role (e.g. Supabase `postgres`, which
    // has BYPASSRLS); SET LOCAL ROLE app_user makes Row-Level Security apply.
    // `app_user` is a hardcoded constant — never interpolate user input here.
    await tx.$executeRawUnsafe("SET LOCAL ROLE app_user");
    // Parameterized + transaction-local. Do NOT interpolate tenantId into SQL.
    await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`;
    return fn(tx);
  }, {
    // Give transactions room to acquire a pooled connection and to run over the
    // transaction pooler's added latency, instead of failing fast (P2028).
    maxWait: 10000,
    timeout: 20000,
  });
}
