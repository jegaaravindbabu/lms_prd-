"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, ShieldCheck, Copy, Trash2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { saveGatewayCredential, deleteGatewayCredential } from "@/app/(dashboard)/admin/settings/actions";

export function GatewayForm({
  configured,
  isLive,
  webhookUrl,
}: {
  configured: boolean;
  isLive: boolean;
  webhookUrl: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-brand/12 ring-1 ring-inset ring-white/10">
            <CreditCard className="size-4 text-brand" />
          </span>
          <div>
            <div className="flex items-center gap-2 text-sm text-foreground">Razorpay</div>
            <div className="text-xs text-muted-foreground">
              {configured ? "Connected" : "Not connected yet"}
            </div>
          </div>
        </div>
        {configured && <Badge variant={isLive ? "gold" : "muted"}>{isLive ? "Live" : "Test mode"}</Badge>}
      </div>

      {/* Webhook URL */}
      <div className="space-y-2">
        <Label>Your webhook URL</Label>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg border border-white/8 bg-black/30 px-3 py-2 text-xs text-muted-foreground">{webhookUrl}</code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { navigator.clipboard.writeText(webhookUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Add this in Razorpay → Settings → Webhooks, subscribe to <span className="text-foreground">payment.captured</span>, and use the same secret below.</p>
      </div>

      {/* Form */}
      <form
        action={(fd) =>
          start(async () => {
            setError(null); setSaved(false);
            const res = await saveGatewayCredential(fd);
            if (res.ok) { setSaved(true); router.refresh(); setTimeout(() => setSaved(false), 2500); }
            else setError(res.error ?? "Could not save.");
          })
        }
        className="space-y-4"
      >
        <input type="hidden" name="provider" value="RAZORPAY" />
        <div className="space-y-2">
          <Label htmlFor="keyId">Key ID</Label>
          <Input id="keyId" name="keyId" placeholder="rzp_test_XXXXXXXX" required autoComplete="off" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="keySecret">Key Secret</Label>
          <Input id="keySecret" name="keySecret" type="password" placeholder="••••••••••••" required autoComplete="off" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="webhookSecret">Webhook Secret</Label>
          <Input id="webhookSecret" name="webhookSecret" type="password" placeholder="Optional but recommended" autoComplete="off" />
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="isLive" className="size-4 accent-[hsl(var(--brand))]" />
          These are live keys (leave off for test mode)
        </label>

        <div className="flex items-center gap-3 pt-1">
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <><ShieldCheck className="size-4" /> Save & encrypt</>}
          </Button>
          {saved && <span className="inline-flex items-center gap-1.5 text-sm text-gold"><Check className="size-4" /> Saved</span>}
          {error && <span className="text-sm text-red-400">{error}</span>}
        </div>
      </form>

      {configured && (
        <div className="border-t border-white/8 pt-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-red-400"
            disabled={pending}
            onClick={() => start(async () => { await deleteGatewayCredential("RAZORPAY"); router.refresh(); })}
          >
            <Trash2 className="size-4" /> Disconnect Razorpay
          </Button>
        </div>
      )}

      <p className="flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.02] p-3 text-xs text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-gold" />
        Keys are encrypted (AES-256-GCM) before they touch the database and are never shown again. Money from course sales settles directly to your Razorpay account — the platform takes no cut.
      </p>
    </div>
  );
}
