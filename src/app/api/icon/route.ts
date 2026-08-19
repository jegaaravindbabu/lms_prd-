// ============================================================================
//  Dynamic per-tenant app icon  →  /api/icon?size=192&t=<subdomain>[&maskable=1]
// ----------------------------------------------------------------------------
//  Renders a real, exact-size PNG for a school so the installed PWA (home-screen
//  icon, Android/iOS launcher, splash) is genuinely branded:
//    • if the tenant has a logo, it's placed on the tenant's brand colour;
//    • otherwise the school's initials are drawn on the brand colour.
//  Always returns a valid PNG (falls back gracefully) so installability never
//  breaks. `t` is baked into the URL by the manifest/layout so CDN caching is
//  per-tenant and correct.
// ============================================================================

import type { NextRequest } from "next/server";
import sharp from "sharp";
import { prismaAdmin } from "@/lib/db";
import { getTenant } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));
}

function hexToRgb(hex?: string | null): { r: number; g: number; b: number } {
  const fallback = { r: 79, g: 70, b: 229 }; // indigo #4F46E5
  if (!hex) return fallback;
  const m = hex.replace("#", "").trim();
  if (m.length !== 6) return fallback;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  if ([r, g, b].some((v) => Number.isNaN(v))) return fallback;
  return { r, g, b };
}

/** Relative luminance (0–1) to decide black vs white foreground. */
function luminance({ r, g, b }: { r: number; g: number; b: number }) {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "A";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c] as string),
  );
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const size = clamp(parseInt(url.searchParams.get("size") || "512", 10), 32, 1024);
  const maskable = url.searchParams.get("maskable") === "1";
  const t = url.searchParams.get("t");

  let tenant: { name: string; logoUrl: string | null; primaryColor: string | null } | null = null;
  try {
    tenant = t
      ? await prismaAdmin.tenant.findFirst({
          where: { subdomain: t },
          select: { name: true, logoUrl: true, primaryColor: true },
        })
      : await getTenant();
  } catch {
    tenant = null;
  }

  const bg = hexToRgb(tenant?.primaryColor);
  const fgWhite = luminance(bg) < 0.55;
  const fg = fgWhite ? "#ffffff" : "#141520";
  const name = tenant?.name || "Academy";
  const radius = maskable ? 0 : Math.round(size * 0.22);

  try {
    const composites: sharp.OverlayOptions[] = [];

    // Prefer the tenant's own logo; fall back to drawn initials.
    let placedLogo = false;
    if (tenant?.logoUrl) {
      try {
        const controller = new AbortController();
        const to = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(tenant.logoUrl, { signal: controller.signal });
        clearTimeout(to);
        if (res.ok) {
          const buf = Buffer.from(await res.arrayBuffer());
          const inner = Math.round(size * (maskable ? 0.6 : 0.72));
          const logoPng = await sharp(buf)
            .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .png()
            .toBuffer();
          composites.push({ input: logoPng, gravity: "centre" });
          placedLogo = true;
        }
      } catch {
        placedLogo = false;
      }
    }

    if (!placedLogo) {
      const letters = escapeXml(initials(name));
      const fontSize = Math.round(size * (letters.length > 1 ? 0.4 : 0.5));
      const textSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
        <text x="50%" y="50%" dy="0.02em" dominant-baseline="central" text-anchor="middle"
          font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="${fontSize}"
          fill="${fg}">${letters}</text></svg>`;
      composites.push({ input: Buffer.from(textSvg), top: 0, left: 0 });
    }

    let out = await sharp({
      create: { width: size, height: size, channels: 4, background: { ...bg, alpha: 1 } },
    })
      .composite(composites)
      .png()
      .toBuffer();

    // Rounded corners for the legacy "any" purpose (maskable stays full-bleed).
    if (!maskable && radius > 0) {
      const mask = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" ry="${radius}"/></svg>`,
      );
      out = await sharp(out).composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
    }

    return new Response(new Uint8Array(out), {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch {
    // Absolute fallback: a plain brand-colour square, still a valid PNG.
    const out = await sharp({
      create: { width: size, height: size, channels: 4, background: { ...bg, alpha: 1 } },
    })
      .png()
      .toBuffer();
    return new Response(new Uint8Array(out), {
      headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=3600" },
    });
  }
}
