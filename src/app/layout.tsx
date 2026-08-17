import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { getTenant } from "@/lib/tenant";
import { brandVars } from "@/lib/branding";

const sans = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
  axes: ["opsz", "SOFT", "WONK"],
});

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenant();
  const name = tenant?.name ?? "Academy";
  return {
    title: { default: name, template: `%s · ${name}` },
    description: `${name} — learn online.`,
    icons: tenant?.faviconUrl ? [{ url: tenant.faviconUrl }] : undefined,
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
      </body>
    </html>
  );
}
