"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Trash2, Tag, Power } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createCoupon, toggleCoupon, deleteCoupon } from "@/app/(dashboard)/admin/coupons/actions";

export type CouponRow = {
  id: string;
  code: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: string;
  courseTitle: string | null;
  maxRedemptions: number | null;
  timesRedeemed: number;
  active: boolean;
  validTill: string | null;
};

export function CouponManager({
  coupons,
  courses,
  currency,
}: {
  coupons: CouponRow[];
  courses: { id: string; title: string }[];
  currency: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<"PERCENT" | "FIXED">("PERCENT");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-luxe">Coupons</h2>
        {!open && <Button onClick={() => setOpen(true)}><Plus className="size-4" /> New coupon</Button>}
      </div>

      {open && (
        <form
          action={(fd) =>
            start(async () => {
              setError(null);
              const res = await createCoupon(fd);
              if (res.ok) { setOpen(false); router.refresh(); }
              else setError(res.error ?? "Could not create.");
            })
          }
          className="glass space-y-4 rounded-2xl p-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Code</Label>
              <Input name="code" placeholder="LAUNCH50" required className="tracking-wider" onChange={(e) => (e.target.value = e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-1.5">
              <Label>Applies to</Label>
              <select name="courseId" className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-foreground focus-visible:border-brand/60 focus-visible:outline-none">
                <option value="">All courses</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Discount type</Label>
              <select name="discountType" value={type} onChange={(e) => setType(e.target.value as "PERCENT" | "FIXED")} className="h-12 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-foreground focus-visible:border-brand/60 focus-visible:outline-none">
                <option value="PERCENT">Percent (%)</option>
                <option value="FIXED">Fixed ({currency})</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Value {type === "PERCENT" ? "(%)" : `(${currency})`}</Label>
              <Input name="discountValue" inputMode="decimal" placeholder={type === "PERCENT" ? "50" : "500"} required />
            </div>
            <div className="space-y-1.5">
              <Label>Max redemptions</Label>
              <Input name="maxRedemptions" inputMode="numeric" placeholder="Unlimited" />
            </div>
            <div className="space-y-1.5">
              <Label>Valid till</Label>
              <Input name="validTill" type="date" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : "Create coupon"}</Button>
            <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted-foreground hover:text-foreground">Cancel</button>
            {error && <span className="text-sm text-red-400">{error}</span>}
          </div>
        </form>
      )}

      {coupons.length === 0 ? (
        <div className="glass rounded-2xl p-10 text-center text-muted-foreground">No coupons yet.</div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/8">
          {coupons.map((c, i) => (
            <div key={c.id} className={`flex flex-wrap items-center gap-4 bg-card/40 px-5 py-4 ${i > 0 ? "border-t border-white/6" : ""}`}>
              <span className="grid size-9 place-items-center rounded-lg bg-brand/12 ring-1 ring-inset ring-white/10"><Tag className="size-4 text-brand" /></span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display text-base tracking-wide text-foreground">{c.code}</span>
                  {!c.active && <Badge variant="muted">Off</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">
                  {c.discountType === "PERCENT" ? `${Number(c.discountValue)}% off` : `${currency} ${Number(c.discountValue)} off`}
                  {c.courseTitle ? ` · ${c.courseTitle}` : " · all courses"}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-4">
                <span className="text-xs text-muted-foreground">
                  {c.timesRedeemed}{c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ""} used
                </span>
                <button title={c.active ? "Disable" : "Enable"} onClick={() => start(async () => { await toggleCoupon(c.id, !c.active); router.refresh(); })} className="text-muted-foreground hover:text-foreground"><Power className="size-4" /></button>
                <button title="Delete" onClick={() => start(async () => { await deleteCoupon(c.id); router.refresh(); })} className="text-muted-foreground hover:text-red-400"><Trash2 className="size-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
