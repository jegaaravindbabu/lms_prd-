"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateLicense } from "@/app/platform/actions";

export type LicenseData = {
  amcTier: "STARTER" | "GROWTH" | "INSTITUTE";
  status: "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELLED";
  oneTimeFee: string;
  amcAmount: string;
  capStudents: number | null;
  capStorageMb: number | null;
  amcNextDueAt: string | null; // yyyy-mm-dd
};

export function LicenseForm({ tenantId, license }: { tenantId: string; license: LicenseData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);

  return (
    <form
      action={(fd) =>
        start(async () => {
          setSaved(false);
          const res = await updateLicense(tenantId, fd);
          if (res.ok) { setSaved(true); router.refresh(); setTimeout(() => setSaved(false), 2500); }
        })
      }
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>AMC tier</Label>
          <select name="amcTier" defaultValue={license.amcTier} className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-foreground focus-visible:border-brand/60 focus-visible:outline-none">
            <option value="STARTER">Starter</option>
            <option value="GROWTH">Growth</option>
            <option value="INSTITUTE">Institute</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>License status</Label>
          <select name="licenseStatus" defaultValue={license.status} className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-foreground focus-visible:border-brand/60 focus-visible:outline-none">
            <option value="ACTIVE">Active</option>
            <option value="PAST_DUE">Past due</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label>One-time fee (INR)</Label>
          <Input name="oneTimeFee" inputMode="decimal" defaultValue={String(Number(license.oneTimeFee))} />
        </div>
        <div className="space-y-1.5">
          <Label>Annual AMC (INR)</Label>
          <Input name="amcAmount" inputMode="decimal" defaultValue={String(Number(license.amcAmount))} />
        </div>
        <div className="space-y-1.5">
          <Label>Cap: students</Label>
          <Input name="capStudents" inputMode="numeric" defaultValue={license.capStudents ?? ""} />
        </div>
        <div className="space-y-1.5">
          <Label>Cap: storage (MB)</Label>
          <Input name="capStorageMb" inputMode="numeric" defaultValue={license.capStorageMb ?? ""} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>AMC next due</Label>
          <Input name="amcNextDueAt" type="date" defaultValue={license.amcNextDueAt ?? ""} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : "Save license"}</Button>
        {saved && <span className="inline-flex items-center gap-1.5 text-sm text-gold"><Check className="size-4" /> Saved</span>}
      </div>
    </form>
  );
}
