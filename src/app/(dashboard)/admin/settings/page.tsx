import { CreditCard, Sparkles } from "lucide-react";
import { requireRole } from "@/lib/rbac";
import { getTenant } from "@/lib/tenant";
import { withTenant } from "@/lib/db";
import { GatewayForm } from "@/components/admin/gateway-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireRole(["OWNER"]);
  const tenant = await getTenant();

  const razorpay = await withTenant(user.tenantId, (tx) =>
    tx.gatewayCredential.findUnique({ where: { tenantId_provider: { tenantId: user.tenantId, provider: "RAZORPAY" } } })
  );

  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "lvh.me:3000";
  const scheme = root.includes("localhost") || root.includes("lvh.me") ? "http" : "https";
  const host = tenant?.subdomain ? `${tenant.subdomain}.${root}` : root;
  const webhookUrl = `${scheme}://${host}/api/webhooks/razorpay/${user.tenantId}`;

  return (
    <div className="space-y-8">
      <div className="animate-fade-up">
        <span className="eyebrow"><Sparkles className="size-3.5 text-gold" /> Settings</span>
        <h1 className="mt-3 font-display text-4xl tracking-tight text-luxe">Payments</h1>
        <p className="mt-2 text-muted-foreground">Connect your own gateway. Students pay you directly.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="glass rounded-2xl p-6">
          <div className="mb-5 flex items-center gap-2">
            <CreditCard className="size-5 text-brand" />
            <h2 className="font-display text-xl text-luxe">Razorpay</h2>
          </div>
          <GatewayForm configured={!!razorpay} isLive={!!razorpay?.isLive} webhookUrl={webhookUrl} />
        </div>

        <aside className="space-y-4">
          <div className="glass rounded-2xl p-5">
            <h3 className="font-display text-base text-foreground">How it works</h3>
            <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>1. Create a Razorpay account and grab your API keys.</li>
              <li>2. Paste the Key ID and Secret here — start in test mode.</li>
              <li>3. Add the webhook URL in Razorpay for reliable enrollment.</li>
              <li>4. Publish a paid course — students check out on your gateway.</li>
            </ol>
          </div>
          <div className="glass rounded-2xl p-5">
            <h3 className="font-display text-base text-foreground">Coming soon</h3>
            <p className="mt-2 text-sm text-muted-foreground">Cashfree and Stripe adapters plug into the same flow — the schema and checkout already support them.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
