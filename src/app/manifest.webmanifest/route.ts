// ============================================================================
//  Dynamic Web App Manifest  →  /manifest.webmanifest
// ----------------------------------------------------------------------------
//  Branded per school so that when a student "installs" the app it carries the
//  institute's own name and icon. Icons point at the dynamic /api/icon route
//  (tenant baked in via ?t=) so each install is fully white-labelled.
// ============================================================================

import { getTenant } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// App chrome is uniformly dark; matching the OS status bar / splash to it looks
// more polished than a bright bar. Brand colour still drives the icon.
const DARK = "#0b0b12";

export async function GET() {
  const tenant = await getTenant();
  const name = tenant?.name ?? "Academy";
  const shortName = name.length > 12 ? name.split(/\s+/)[0].slice(0, 12) : name;
  const t = tenant?.subdomain ? `&t=${encodeURIComponent(tenant.subdomain)}` : "";

  const icon = (sizePx: number, purpose: "any" | "maskable") => ({
    src: `/api/icon?size=${sizePx}${purpose === "maskable" ? "&maskable=1" : ""}${t}`,
    sizes: `${sizePx}x${sizePx}`,
    type: "image/png",
    purpose,
  });

  const manifest = {
    id: "/",
    name,
    short_name: shortName,
    description: `${name} — learn online. Courses, tests and notes.`,
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    theme_color: DARK,
    background_color: DARK,
    icons: [
      icon(192, "any"),
      icon(512, "any"),
      icon(192, "maskable"),
      icon(512, "maskable"),
    ],
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
