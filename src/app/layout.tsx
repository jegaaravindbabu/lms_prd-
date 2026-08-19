import type { Metadata, Viewport } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { getTenant } from "@/lib/tenant";
import { brandVars } from "@/lib/branding";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { InstallPrompt } from "@/components/pwa/install-prompt";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

export async function generateViewport(): Promise<Viewport> {
  return {
    // App chrome is uniformly dark; match the standalone status bar to it.
    themeColor: "#0b0b12",
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant();
  const name = tenant?.name ?? "Academy";
  const t = tenant?.subdomain ? `&t=${encodeURIComponent(tenant.subdomain)}` : "";
  return {
    applicationName: name,
    title: { default: name, template: `%s · ${name}` },
    description: `${name} — learn online.`,
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: name },
    icons: {
      icon: tenant?.faviconUrl ? [{ url: tenant.faviconUrl }] : [{ url: `/api/icon?size=192${t}` }],
      apple: [{ url: `/api/icon?size=180${t}`, sizes: "180x180" }],
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenant();

  return (
    <html lang="en" className="dark">
      <body
        className={`${sans.variable} ${display.variable}`}
        style={brandVars(tenant)}
      >
        {children}
        <ServiceWorkerRegister />
        <InstallPrompt appName={tenant?.name ?? "the app"} />
        {process.env.NEXT_PUBLIC_DEMO === "1" && tenant && (
          <a
            href="/api/demo/switch?clear=1"
            className="fixed bottom-4 left-4 z-50 inline-flex items-center gap-2 rounded-full border border-white/12 bg-black/60 px-4 py-2 text-xs text-white/80 shadow-luxe backdrop-blur-md transition-colors hover:text-white"
          >
            ⇄ Switch school
          </a>
        )}
      </body>
    </html>
  );
}
