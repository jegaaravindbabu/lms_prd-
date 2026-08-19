// ============================================================================
//  Dynamic per-tenant app icon  →  /api/icon?size=192&t=<subdomain>[&maskable=1]
// ----------------------------------------------------------------------------
//  Renders a real, exact-size PNG for a school so the installed PWA (home-screen
//  icon, launcher, splash) is branded: the tenant's logo on its brand colour,
//  or the school's initials if there's no logo. Uses Next's built-in image
//  renderer (next/og) — no native dependencies, so it builds cleanly on Vercel.
// ============================================================================

import { ImageResponse } from "next/og";
import React from "react";
import { prismaAdmin } from "@/lib/db";
import { getTenant } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const h = React.createElement;

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : lo));
}

/** Normalise to a #RRGGBB string; default indigo. */
function hexColor(hex?: string | null): string {
  const fallback = "#4F46E5";
  if (!hex) return fallback;
  const m = hex.replace("#", "").trim();
  return /^[0-9a-fA-F]{6}$/.test(m) ? `#${m}` : fallback;
}

/** Relative luminance (0–1) from a #RRGGBB string. */
function luminance(hex: string) {
  const m = hex.replace("#", "");
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
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

export async function GET(req: Request) {
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

  const bg = hexColor(tenant?.primaryColor);
  const fg = luminance(bg) < 0.55 ? "#ffffff" : "#141520";
  const name = tenant?.name || "Academy";
  const radius = maskable ? 0 : Math.round(size * 0.22);
  const inner = Math.round(size * (maskable ? 0.6 : 0.72));

  // Only embed the logo if we can actually reach it — otherwise fall back to
  // initials so the endpoint never fails.
  let logo: string | null = null;
  if (tenant?.logoUrl) {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 3500);
      const res = await fetch(tenant.logoUrl, { signal: ctrl.signal });
      clearTimeout(to);
      if (res.ok) logo = tenant.logoUrl;
    } catch {
      logo = null;
    }
  }

  const child = logo
    ? h("img", { src: logo, width: inner, height: inner, style: { objectFit: "contain" } })
    : h(
        "div",
        {
          style: {
            display: "flex",
            fontSize: Math.round(size * (initials(name).length > 1 ? 0.4 : 0.5)),
            fontWeight: 700,
            color: fg,
          },
        },
        initials(name),
      );

  const el = h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: bg,
        borderRadius: radius,
      },
    },
    child,
  );

  return new ImageResponse(el, {
    width: size,
    height: size,
    headers: { "Cache-Control": "public, max-age=86400, s-maxage=86400" },
  });
}
