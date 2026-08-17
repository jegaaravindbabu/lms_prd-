"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { provisionSchool } from "@/app/platform/actions";

export function ProvisionSchool() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!open) return <Button onClick={() => setOpen(true)}><Plus className="size-4" /> New school</Button>;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="glass w-full max-w-lg rounded-3xl p-7">
        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-brand/15 ring-1 ring-inset ring-white/10"><Building2 className="size-5 text-brand" /></span>
          <h2 className="font-display text-xl text-luxe">Provision a school</h2>
        </div>
        <form
          action={(fd) =>
            start(async () => {
              setError(null);
              const res = await provisionSchool(fd);
              if (res.ok && res.id) { router.push(`/platform/schools/${res.id}`); }
              else setError(res.error ?? "Could not create.");
            })
          }
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>School name</Label>
              <Input name="name" placeholder="Physicswala" required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Subdomain</Label>
              <Input name="subdomain" placeholder="physicswala" />
            </div>
            <div className="space-y-1.5">
              <Label>Owner name</Label>
              <Input name="ownerName" placeholder="Dr. Alka Rao" />
            </div>
            <div className="space-y-1.5">
              <Label>Owner phone</Label>
              <Input name="ownerPhone" placeholder="9000000001" required />
            </div>
            <div className="space-y-1.5">
              <Label>AMC tier</Label>
              <select name="amcTier" defaultValue="STARTER" className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-foreground focus-visible:border-brand/60 focus-visible:outline-none">
                <option value="STARTER">Starter</option>
                <option value="GROWTH">Growth</option>
                <option value="INSTITUTE">Institute</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>One-time fee (INR)</Label>
              <Input name="oneTimeFee" inputMode="decimal" placeholder="150000" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Annual AMC (INR)</Label>
              <Input name="amcAmount" inputMode="decimal" placeholder="60000" />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Button type="submit" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : "Create school"}</Button>
            <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
            {error && <span className="text-sm text-red-400">{error}</span>}
          </div>
        </form>
      </div>
    </div>
  );
}
