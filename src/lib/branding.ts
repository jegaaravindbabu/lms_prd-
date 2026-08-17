// ============================================================================
//  Branding — turn a tenant's colors into CSS custom properties
// ----------------------------------------------------------------------------
//  The whole UI reads semantic tokens (--brand, --primary, …) from CSS vars,
//  so applying a tenant's primaryColor recolors everything at render time —
//  no flash of platform branding.
// ============================================================================

import type { ResolvedTenant } from "@/lib/tenant";

/** Convert #RRGGBB to "H S% L%" (the format Tailwind's hsl(var(--x)) expects). */
export function hexToHslChannels(hex?: string | null): string | null {
  if (!hex) return null;
  const m = hex.replace("#", "");
  if (m.length !== 6) return null;
  const r = parseInt(m.slice(0, 2), 16) / 255;
  const g = parseInt(m.slice(2, 4), 16) / 255;
  const b = parseInt(m.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d) % 6; break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Build the inline style object of brand CSS variables for a tenant. */
export function brandVars(tenant?: Pick<ResolvedTenant, "primaryColor" | "secondaryColor"> | null) {
  const brand = hexToHslChannels(tenant?.primaryColor) ?? "243 75% 59%"; // indigo default
  const secondary = hexToHslChannels(tenant?.secondaryColor);
  const vars: Record<string, string> = {
    "--brand": brand,
    "--brand-foreground": "0 0% 100%",
    "--brand-soft": brand.replace(/(\d+)%\)?$/, (_m) => _m), // same hue, used with opacity
    "--primary": brand,
    "--ring": brand,
  };
  if (secondary) vars["--secondary"] = secondary;
  return vars as React.CSSProperties;
}
