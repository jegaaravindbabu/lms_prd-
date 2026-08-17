// ============================================================================
//  Demo school switcher  —  /api/demo/switch?t=<subdomain>  |  ?clear=1
// ----------------------------------------------------------------------------
//  Sets (or clears) the `demo_tenant` cookie so a single deployment can show
//  every school from one URL. Only meaningful in demo deployments; harmless
//  otherwise (real subdomains/custom domains take precedence).
// ============================================================================

import { NextResponse, type NextRequest } from "next/server";

export function GET(req: NextRequest) {
  const url = new URL(req.url);
  const t = url.searchParams.get("t");
  const clear = url.searchParams.get("clear");

  const res = NextResponse.redirect(new URL("/", req.url));
  if (clear) {
    res.cookies.delete("demo_tenant");
  } else if (t) {
    res.cookies.set("demo_tenant", t.toLowerCase(), {
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return res;
}
