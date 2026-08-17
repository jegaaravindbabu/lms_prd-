"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Globe, Loader2, Check, Copy, Trash2, RefreshCw, CircleCheck, CircleAlert, CircleDashed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { setCustomDomain, verifyCustomDomain, removeCustomDomain } from "@/app/(dashboard)/admin/domain/actions";

type Status = "PENDING" | "VERIFYING" | "ACTIVE" | "ERROR";

const STATUS_META: Record<Status, { label: string; variant: "gold" | "muted" | "default"; icon: React.ElementType }> = {
  ACTIVE: { label: "Live", variant: "gold", icon: CircleCheck },
  PENDING: { label: "Awaiting DNS", variant: "muted", icon: CircleDashed },
  VERIFYING: { label: "Verifying", variant: "default", icon: CircleDashed },
  ERROR: { label: "Not found yet", variant: "muted", icon: CircleAlert },
};

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-white/8 bg-black/30 px-3 py-2 text-xs text-foreground">{value}</code>
        <button
          type="button"
          onClick={() => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 text-muted-foreground hover:text-foreground"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </button>
      </div>
    </div>
  );
}

export function DomainManager({
  customDomain,
  domainStatus,
  token,
  cnameTarget,
}: {
  customDomain: string | null;
  domainStatus: Status;
  token: string | null;
  cnameTarget: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  if (!customDomain) {
    return (
      <form
        action={(fd) =>
          start(async () => {
            setError(null);
            const res = await setCustomDomain(fd);
            if (res.ok) router.refresh();
            else setError(res.error ?? "Could not save.");
          })
        }
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="domain">Your domain</Label>
          <Input id="domain" name="domain" placeholder="learn.yourschool.com" autoComplete="off" required />
          <p className="text-xs text-muted-foreground">Use a subdomain you control, like <span className="text-foreground">learn.</span> or <span className="text-foreground">courses.</span></p>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <><Globe className="size-4" /> Connect domain</>}
        </Button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>
    );
  }

  const meta = STATUS_META[domainStatus];
  const StatusIcon = meta.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-lg bg-brand/12 ring-1 ring-inset ring-white/10"><Globe className="size-4 text-brand" /></span>
          <div>
            <div className="text-sm text-foreground">{customDomain}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground"><StatusIcon className="size-3.5" /> {meta.label}</div>
          </div>
        </div>
        <Badge variant={meta.variant}>{meta.label}</Badge>
      </div>

      {domainStatus !== "ACTIVE" && (
        <div className="space-y-4 rounded-2xl border border-white/8 bg-card/40 p-5">
          <p className="text-sm text-foreground">Add these two records at your DNS provider:</p>
          <div className="space-y-4">
            <div className="rounded-xl border border-white/8 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><Badge variant="muted">1 · Verify ownership</Badge> TXT record</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <CopyRow label="Name / Host" value={`_lms-verify.${customDomain}`} />
                <CopyRow label="Value" value={token ?? ""} />
              </div>
            </div>
            <div className="rounded-xl border border-white/8 p-3">
              <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><Badge variant="muted">2 · Route traffic</Badge> CNAME record</div>
              <div className="grid gap-3 sm:grid-cols-2">
                <CopyRow label="Name / Host" value={customDomain} />
                <CopyRow label="Target" value={cnameTarget} />
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">DNS changes can take a few minutes (sometimes longer). Once added, click Verify.</p>
        </div>
      )}

      {domainStatus === "ACTIVE" && (
        <div className="flex items-start gap-2 rounded-xl border border-gold/20 bg-gold/5 p-4 text-sm text-gold">
          <Check className="mt-0.5 size-4" /> Your school is live at <span className="font-medium">{customDomain}</span>. Students can reach it directly.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        {domainStatus !== "ACTIVE" && (
          <Button
            onClick={() =>
              start(async () => {
                setError(null); setNote(null);
                const res = await verifyCustomDomain();
                if (res.ok) { setNote("Verified! Your domain is live."); router.refresh(); }
                else setError(res.error ?? "Not verified yet.");
                router.refresh();
              })
            }
            disabled={pending}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : <><RefreshCw className="size-4" /> Verify</>}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-red-400"
          disabled={pending}
          onClick={() => start(async () => { await removeCustomDomain(); router.refresh(); })}
        >
          <Trash2 className="size-4" /> Remove
        </Button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {note && <p className="text-sm text-gold">{note}</p>}
    </div>
  );
}
