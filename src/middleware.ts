// ============================================================================
//  Middleware — tenant host normalization
// ----------------------------------------------------------------------------
//  Runs on every request. It does NOT hit the database (edge runtime); it just
//  forwards the resolved host as `x-tenant-host` so server components can look
//  up the Tenant via the admin client (see lib/tenant.ts). Keeping the DB
//  lookup out of the edge keeps this fast and cacheable.
// ============================================================================

import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") ?? "";
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-tenant-host", host);

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  // Skip static assets and API-internal Next paths.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
